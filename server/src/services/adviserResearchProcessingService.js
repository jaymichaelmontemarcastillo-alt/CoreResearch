import { getStorageProvider } from './storage/storageManager.js';
import { AdviserResearchDocument } from '../models/AdviserResearchDocument.js';
import mongoose from 'mongoose';
import { GoogleGenAI } from '@google/genai';
import { PDFParse } from 'pdf-parse';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';

class AdviserResearchProcessingService {
  constructor() {
    this._ai = null; // Lazy — initialized on first use

    // Trigger stale document recovery asynchronously on boot
    this.recoverStaleDocuments().catch(err => {
      console.warn('[AdviserResearchProcessingService] Failed to recover stale documents:', err.message);
    });
  }

  async recoverStaleDocuments() {
    // wait a few seconds so mongoose has time to connect
    await new Promise(resolve => setTimeout(resolve, 5000));
    if (mongoose.connection.readyState !== 1) return;

    try {
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
      const staleDocs = await AdviserResearchDocument.find({
        processingStatus: 'PROCESSING',
        updated_at: { $lt: tenMinsAgo }
      });

      for (const doc of staleDocs) {
        if ((doc.processingAttempts || 0) < 3) {
          console.log(`[AdviserResearchProcessingService] Auto-recovering stale document: ${doc.id}`);
          // Set it temporarily back to FAILED so reprocessDocument accepts it, or just call reprocessDocument and modify reprocessDocument to accept PROCESSING
          // Let's modify the doc to FAILED so reprocessDocument works smoothly
          await AdviserResearchDocument.updateOne({ id: doc.id }, { processingStatus: 'FAILED', processingError: null });
          this.reprocessDocument(doc.id, doc.adviserId).catch(err => {
             console.error(`[AdviserResearchProcessingService] Auto-recover failed for ${doc.id}:`, err);
          });
        } else {
          console.log(`[AdviserResearchProcessingService] Marking stale document as FAILED: ${doc.id}`);
          await AdviserResearchDocument.updateOne(
            { id: doc.id },
            { 
              processingStatus: 'FAILED', 
              processingStage: 'FAILED', 
              processingError: 'Processing interrupted. Maximum retry attempts reached.' 
            }
          );
        }
      }
    } catch(err) {
      console.warn('[AdviserResearchProcessingService] Stale recovery check failed:', err.message);
    }
  }

  /** Lazy-init Gemini client so env vars are guaranteed to be loaded */
  get ai() {
    if (!this._ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('[AdviserResearchProcessingService] GEMINI_API_KEY is not set.');
        return null;
      }
      this._ai = new GoogleGenAI({ apiKey });
    }
    return this._ai;
  }

  async importResearchDocument({ fileBuffer, fileName, mimeType, fileSize, adviserId }) {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('No file data received.');
    }

    if (fileSize > 10 * 1024 * 1024) {
      throw new Error('File size exceeds the 10MB limit.');
    }

    if (mimeType !== 'application/pdf' && !mimeType.includes('wordprocessingml') && !mimeType.includes('docx')) {
      throw new Error('Unsupported file format. Only PDF and DOCX are allowed.');
    }

    const documentId = `advres-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageProvider = getStorageProvider();

    // 1. Upload original file
    const storageKey = `adviser_research/${adviserId}/${documentId}/${cleanFileName}`;
    const uploadResult = await storageProvider.upload(
      storageKey,
      fileBuffer,
      mimeType,
      { documentId, uploadedBy: adviserId }
    );

    // 2. Create DB Record
    const doc = await AdviserResearchDocument.create({
      id: documentId,
      adviserId,
      title: fileName.replace(/\.[^/.]+$/, ''),
      originalFilename: cleanFileName,
      storageKey,
      fileUrl: uploadResult.url,
      mimeType,
      size: fileSize || fileBuffer.length,
      processingStatus: 'UPLOADED',
      processingStage: 'UPLOADED',
    });

    // 3. Kick off async processing (fire and forget)
    this.processDocumentTask(documentId, fileBuffer, mimeType).catch(err => {
      console.error(`[AdviserResearchProcessingService] Async processing failed for ${documentId}:`, err);
    });

    return doc;
  }

  /**
   * Main background task for text extraction and NLP analysis
   */
  async processDocumentTask(documentId, fileBuffer, mimeType) {
    try {
      await AdviserResearchDocument.findOneAndUpdate(
        { id: documentId }, 
        { 
          processingStatus: 'PROCESSING', 
          processingStage: 'EXTRACTING_TEXT',
          $inc: { processingAttempts: 1 },
          processingError: null 
        }
      );

      // 1. Extract text
      let extractedText = '';

      if (mimeType === 'application/pdf') {
        const parser = new PDFParse({ data: fileBuffer });
        const data = await parser.getText();
        extractedText = data.text;
      } else if (mimeType.includes('wordprocessingml') || mimeType.includes('docx')) {
        extractedText = this.extractTextFromDocx(fileBuffer);
      } else {
        throw new Error('Unsupported document format for text extraction. Only PDF and DOCX are supported.');
      }

      // Clean the text
      extractedText = extractedText.replace(/\s+/g, ' ').trim();
      
      if (!extractedText || extractedText.length < 100) {
        throw new Error('Unable to extract readable text from the document. The file may be image-only, scanned, or corrupted.');
      }

      // 1a. Reference Detection & Removal
      // We look for standard reference headings to strip out the references section
      const refRegex = /\\b(?:References|Bibliography|Works Cited|REFERENCES|BIBLIOGRAPHY)\\b/g;
      let match;
      let lastRefIndex = -1;
      while ((match = refRegex.exec(extractedText)) !== null) {
          lastRefIndex = match.index;
      }
      
      let cleanText = extractedText;
      // Heuristic: If we found a reference marker in the last 40% of the document, truncate it
      if (lastRefIndex > extractedText.length * 0.6) {
          cleanText = extractedText.substring(0, lastRefIndex);
      }

      // 1b. Lightweight Section Detection
      const headings = ['Abstract', 'Introduction', 'Related Literature', 'Review of Related Literature', 'Methodology', 'Materials and Methods', 'Results', 'Discussion', 'Conclusion', 'Recommendations'];
      for (const heading of headings) {
          const regex = new RegExp(`(?<!\\w)(${heading})(?!\\w)`, 'gi');
          cleanText = cleanText.replace(regex, `\\n\\n[SECTION: $1]\\n\\n`);
      }

      // We only need the first ~30k characters to identify the main topic/methodology
      // (saves tokens and avoids noise from massive reference lists)
      const textToProcess = cleanText.substring(0, 30000);

      await AdviserResearchDocument.findOneAndUpdate({ id: documentId }, { 
        processingStage: 'ANALYZING_RESEARCH',
        extractedText: textToProcess 
      });

      // 2. Extract NLP concepts via Gemini
      if (!this.ai) {
        throw new Error('Gemini API key missing, cannot process NLP.');
      }

      const prompt = `
Analyze the following academic research document text and extract structured metadata.
Focus heavily on high-importance sections such as the Title, Abstract, Keywords, Methodology, and Conclusion.
Ignore references, author bios, formatting artifacts, and page headers/footers.
Identify the actual research concepts, methodologies, and specific domain keywords.
Do NOT extract generic academic terms like "system", "study", "research", "process", "data", "users".

DOCUMENT TEXT:
---
${textToProcess.substring(0, 15000)}
---
`;

      const responseSchema = {
        type: "OBJECT",
        properties: {
          abstract: { type: "STRING", description: "A 2-3 sentence summary of the research topic and problem." },
          keywords: { type: "ARRAY", items: { type: "STRING" }, description: "Specific keywords" },
          keyPhrases: { type: "ARRAY", items: { type: "STRING" }, description: "Multi-word phrases" },
          researchTopics: { type: "ARRAY", items: { type: "STRING" }, description: "Main research topics" },
          researchConcepts: { type: "ARRAY", items: { type: "STRING" }, description: "Important concepts" },
          methodologies: { type: "ARRAY", items: { type: "STRING" }, description: "Methodologies used" },
          researchDomain: { type: "STRING", description: "Broad research domain" },
          researchProblem: { type: "STRING", description: "The core problem addressed" }
        },
        required: ["abstract", "keywords", "researchTopics", "researchConcepts", "methodologies", "researchDomain", "researchProblem"]
      };

      let nlpData = null;
      let retries = 3;
      let lastError = null;

      for (let i = 0; i < retries; i++) {
        try {
          const response = await this.ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: responseSchema
            }
          });
          
          nlpData = JSON.parse(response.text);
          break; // Success
        } catch (err) {
          lastError = err;
          console.warn(`[AdviserResearchProcessingService] Gemini extraction failed (attempt ${i+1}):`, err.message);
          if (err.message.includes('API key')) throw err; // Don't retry missing key
          await new Promise(res => setTimeout(res, 1000 * Math.pow(2, i))); // Exponential backoff
        }
      }

      if (!nlpData) {
        throw new Error(`Failed to extract NLP data after ${retries} attempts: ${lastError?.message}`);
      }

      // 3. Generate Semantic Embedding
      await AdviserResearchDocument.findOneAndUpdate({ id: documentId }, { processingStage: 'GENERATING_EMBEDDING' });
      
      // Combine key concepts to form a dense semantic representation for embedding
      const combinedRepresentation = [
        nlpData.abstract || '',
        ...(nlpData.researchTopics || []),
        ...(nlpData.keywords || []),
        ...(nlpData.keyPhrases || []),
        ...(nlpData.researchConcepts || []),
        ...(nlpData.methodologies || []),
        nlpData.researchDomain || '',
        nlpData.researchProblem || ''
      ].join(' ');

      let embedding = null;
      for (let i = 0; i < retries; i++) {
        try {
          const embeddingResponse = await this.ai.models.embedContent({
            model: 'gemini-embedding-2',
            contents: combinedRepresentation,
          });
          embedding = embeddingResponse.embeddings[0].values;
          break;
        } catch (err) {
          lastError = err;
          console.warn(`[AdviserResearchProcessingService] Gemini embedding failed (attempt ${i+1}):`, err.message);
          await new Promise(res => setTimeout(res, 1000 * Math.pow(2, i)));
        }
      }

      if (!embedding) {
        throw new Error(`Failed to generate embedding after ${retries} attempts: ${lastError?.message}`);
      }

      // 4. Save final representation
      await AdviserResearchDocument.findOneAndUpdate({ id: documentId }, { processingStage: 'SAVING_RESULTS' });

      await AdviserResearchDocument.findOneAndUpdate({ id: documentId }, {
        abstract: nlpData.abstract || '',
        keywords: nlpData.keywords || [],
        keyPhrases: nlpData.keyPhrases || [],
        researchTopics: nlpData.researchTopics || [],
        researchConcepts: nlpData.researchConcepts || [],
        methodologies: nlpData.methodologies || [],
        researchDomain: nlpData.researchDomain || '',
        researchProblem: nlpData.researchProblem || '',
        embedding: embedding,
        embeddingModel: 'gemini-embedding-2',
        embeddingDimensions: embedding ? embedding.length : 0,
        processingStatus: 'READY',
        processingStage: 'READY'
      });

      console.log(`[AdviserResearchProcessingService] Successfully processed document ${documentId}`);

    } catch (error) {
      console.error(`[AdviserResearchProcessingService] Error processing document ${documentId}:`, error);
      await AdviserResearchDocument.findOneAndUpdate(
        { id: documentId }, 
        { 
          processingStatus: 'FAILED', 
          processingStage: 'FAILED',
          processingError: error.message 
        }
      );
    }
  }

  /**
   * Helper: basic DOCX text extraction
   */
  extractTextFromDocx(buffer) {
    try {
      const zip = new AdmZip(buffer);
      const contentXml = zip.readAsText('word/document.xml');
      const parser = new XMLParser({
        ignoreAttributes: true,
        textNodeName: '_text',
      });
      const jsonObj = parser.parse(contentXml);
      
      let text = '';
      const extractStr = (obj) => {
        if (typeof obj === 'string') text += obj + ' ';
        else if (Array.isArray(obj)) obj.forEach(extractStr);
        else if (typeof obj === 'object' && obj !== null) {
          Object.values(obj).forEach(extractStr);
        }
      };
      
      if (jsonObj && jsonObj['w:document']) {
        extractStr(jsonObj['w:document']);
      }
      return text;
    } catch (e) {
      console.error('Failed to parse DOCX:', e);
      throw new Error('Invalid or corrupted DOCX file.');
    }
  }

  async deleteDocument(documentId, adviserId) {
    const doc = await AdviserResearchDocument.findOne({ id: documentId, adviserId });
    if (!doc) {
      throw new Error('Document not found or unauthorized');
    }
    
    // Delete from storage
    const storageProvider = getStorageProvider();
    if (doc.storageKey) {
      try {
        await storageProvider.delete(doc.storageKey);
      } catch (e) {
        console.warn(`[AdviserResearchProcessingService] Failed to delete file ${doc.storageKey} from storage:`, e);
      }
    }

    await AdviserResearchDocument.deleteOne({ id: documentId });
    return true;
  }

  /**
   * Reprocess a FAILED document by re-downloading from storage and re-running NLP.
   */
  async reprocessDocument(documentId, adviserId) {
    const doc = await AdviserResearchDocument.findOne({ id: documentId, adviserId });
    if (!doc) {
      throw new Error('Document not found or unauthorized');
    }
    if (doc.processingStatus !== 'FAILED') {
      throw new Error(`Document is not in FAILED state (current: ${doc.processingStatus})`);
    }

    // Re-download file from GridFS storage
    const storageProvider = getStorageProvider();
    const stream = await storageProvider.downloadStream(doc.storageKey);
    if (!stream) {
      throw new Error('Original file not found in storage. Please delete and re-upload.');
    }

    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);

    // Reset status and re-run
    await AdviserResearchDocument.findOneAndUpdate({ id: documentId }, {
      processingStatus: 'UPLOADED',
      processingError: null
    });

    // Fire and forget
    this.processDocumentTask(documentId, fileBuffer, doc.mimeType).catch(err => {
      console.error(`[AdviserResearchProcessingService] Reprocess failed for ${documentId}:`, err);
    });

    return { message: 'Reprocessing started.' };
  }
}

export const adviserResearchProcessingService = new AdviserResearchProcessingService();
export default adviserResearchProcessingService;
