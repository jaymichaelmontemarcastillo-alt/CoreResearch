import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  
  // Manuscript Metadata (Phase 4)
  title: { type: String, default: '' },
  abstract: { type: String, default: '' },
  status: { type: String, default: 'draft' },
  authors: [{ type: String }], // Array of User UIDs
  adviser: { type: String, default: '' }, // User UID
  panelists: [{ type: String }], // Array of User UIDs

  // Content (Phase 3)
  yjsBinaryState: { type: Buffer },
  plainText: { type: String, default: '' },
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  strict: false // Allow dynamic fields if we merge metadata here later
});

export const Document = mongoose.model('Document', DocumentSchema);
