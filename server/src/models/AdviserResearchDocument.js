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
  
  // NLP Data
  keywords: [{ type: String }],
  keyPhrases: [{ type: String }],
  researchConcepts: [{ type: String }],
  methodologyTerms: [{ type: String }],
  
  // Semantic Vector
  embedding: { type: [Number] },
  
  // Status
  processingStatus: { 
    type: String, 
    enum: ['UPLOADED', 'EXTRACTING', 'PROCESSING', 'INDEXING', 'READY', 'FAILED'], 
    default: 'UPLOADED' 
  },
  processingError: { type: String },
  processingVersion: { type: String, default: 'v1' },
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  strict: false 
});

export const AdviserResearchDocument = mongoose.model('AdviserResearchDocument', AdviserResearchDocumentSchema);
