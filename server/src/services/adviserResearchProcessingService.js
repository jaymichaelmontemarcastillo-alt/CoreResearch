import { getStorageProvider } from './storage/storageManager.js';
import { AdviserResearchDocument } from '../models/AdviserResearchDocument.js';
import mongoose from 'mongoose';
import { documentAnalysisService } from './DocumentAnalysisService.js';

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

      // 1. Extract text using DocumentAnalysisService
      const extractedText = await documentAnalysisService.extractText(fileBuffer, mimeType);

      // We only need the first ~30k characters to identify the main topic/methodology
      const textToProcess = extractedText.substring(0, 30000);

      await AdviserResearchDocument.findOneAndUpdate({ id: documentId }, { 
        processingStage: 'ANALYZING_RESEARCH',
        extractedText: textToProcess 
      });

      // 2. Extract NLP concepts via DocumentAnalysisService
      const nlpData = await documentAnalysisService.analyzeDocument(textToProcess);

      // 3. Generate Semantic Embedding
      await AdviserResearchDocument.findOneAndUpdate({ id: documentId }, { processingStage: 'GENERATING_EMBEDDING' });
      
      const { embedding, embeddingDimensions } = await documentAnalysisService.generateEmbedding(nlpData);

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
        embeddingDimensions: embeddingDimensions,
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
