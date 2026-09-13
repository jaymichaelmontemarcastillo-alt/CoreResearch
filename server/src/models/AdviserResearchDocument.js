import mongoose from 'mongoose';

const AdviserResearchDocumentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  adviserId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  originalFilename: { type: String },
  storageKey: { type: String, required: true },
  fileUrl: { type: String },
  mimeType: { type: String },
  size: { type: Number },
  
  // Extracted Data
  extractedText: { type: String }, // Raw text used for reprocessing if needed
  abstract: { type: String },
  
  // NLP Data (Structured)
  keywords: [{ type: String }],
  keyPhrases: [{ type: String }],
  researchTopics: [{ type: String }],
  researchConcepts: [{ type: String }],
  methodologies: [{ type: String }],
  researchDomain: { type: String },
  researchProblem: { type: String },
  
  // Semantic Vector
  embedding: { type: [Number] },
  embeddingModel: { type: String, default: 'gemini-embedding-2' },
  embeddingDimensions: { type: Number },
  
  // Status & Tracking
  processingStatus: { 
    type: String, 
    enum: ['UPLOADED', 'PROCESSING', 'READY', 'FAILED'], 
    default: 'UPLOADED' 
  },
  processingStage: {
    type: String,
    enum: ['UPLOADED', 'EXTRACTING_TEXT', 'ANALYZING_RESEARCH', 'GENERATING_EMBEDDING', 'SAVING_RESULTS', 'READY', 'FAILED'],
    default: 'UPLOADED'
  },
  processingError: { type: String },
  processingAttempts: { type: Number, default: 0 },
  processingVersion: { type: String, default: 'v2' },
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  strict: false 
});

export const AdviserResearchDocument = mongoose.model('AdviserResearchDocument', AdviserResearchDocumentSchema);
