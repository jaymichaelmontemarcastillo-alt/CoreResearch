import { getStorageProvider } from './storage/storageManager.js';
import { AdviserResearchDocument } from '../models/AdviserResearchDocument.js';
import { GoogleGenAI } from '@google/genai';
import { PDFParse } from 'pdf-parse';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';

class AdviserResearchProcessingService {
  constructor() {
    this._ai = null; // Lazy — initialized on first use
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
      await AdviserResearchDocument.findOneAndUpdate({ id: documentId }, { processingStatus: 'EXTRACTING' });

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
      
      // We only need the first ~30k characters to identify the main topic/methodology
      // (saves tokens and avoids noise from massive reference lists)
      const textToProcess = extractedText.substring(0, 30000);

      await AdviserResearchDocument.findOneAndUpdate({ id: documentId }, { 
        processingStatus: 'PROCESSING',
        extractedText: textToProcess 
      });

      // 2. Extract NLP concepts via Gemini
      if (!this.ai) {
        throw new Error('Gemini API key missing, cannot process NLP.');
      }

      const prompt = `
Analyze the following academic research document text and extract structured metadata.
Focus on identifying the actual research concepts, methodologies, and specific domain keywords.
Do NOT extract generic academic terms like "system", "study", "research", "process", "data", "users".

Output valid JSON strictly in this exact format, with no markdown formatting:
{
  "abstract": "A 2-3 sentence summary of the research topic and problem.",
  "keywords": ["specific keyword 1", "specific keyword 2"],
  "keyPhrases": ["multi word phrase 1", "multi word phrase 2"],
  "researchConcepts": ["Concept 1", "Concept 2"],
  "methodologyTerms": ["Methodology 1", "Methodology 2"]
}

DOCUMENT TEXT:
---
${textToProcess.substring(0, 15000)}
---
`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      let jsonText = response.text;
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
      
      let nlpData;
      try {
        nlpData = JSON.parse(jsonText);
      } catch (e) {
        console.error('Failed to parse Gemini JSON:', jsonText);
        throw new Error('Failed to parse NLP response from Gemini');
      }

      // 3. Generate Semantic Embedding
      await AdviserResearchDocument.findOneAndUpdate({ id: documentId }, { processingStatus: 'INDEXING' });
      
      // Combine key concepts to form a dense semantic representation for embedding
      const combinedRepresentation = [
        nlpData.abstract || '',
        ...(nlpData.keyPhrases || []),
        ...(nlpData.researchConcepts || []),
        ...(nlpData.methodologyTerms || [])
      ].join(' ');

      const embeddingResponse = await this.ai.models.embedContent({
        model: 'text-embedding-004',
        contents: combinedRepresentation,
      });

      const embedding = embeddingResponse.embeddings[0].values;

      // 4. Save final representation
      await AdviserResearchDocument.findOneAndUpdate({ id: documentId }, {
        abstract: nlpData.abstract || '',
        keywords: nlpData.keywords || [],
        keyPhrases: nlpData.keyPhrases || [],
        researchConcepts: nlpData.researchConcepts || [],
        methodologyTerms: nlpData.methodologyTerms || [],
        embedding: embedding,
        processingStatus: 'READY'
      });

      console.log(`[AdviserResearchProcessingService] Successfully processed document ${documentId}`);

    } catch (error) {
      console.error(`[AdviserResearchProcessingService] Error processing document ${documentId}:`, error);
      await AdviserResearchDocument.findOneAndUpdate(
        { id: documentId }, 
        { processingStatus: 'FAILED', processingError: error.message }
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
