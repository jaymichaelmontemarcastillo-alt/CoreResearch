import mongoose from 'mongoose';

const PageSettingsSchema = new mongoose.Schema({
  size: { type: String, default: 'a4' }, // 'letter', 'a4', 'legal'
  orientation: { type: String, default: 'portrait' }, // 'portrait', 'landscape'
  marginTop: { type: String, default: '1in' },
  marginBottom: { type: String, default: '1in' },
  marginLeft: { type: String, default: '1in' },
  marginRight: { type: String, default: '1in' },
  widthMm: { type: Number, default: null },   // Exact page width in mm from DOCX
  heightMm: { type: Number, default: null },  // Exact page height in mm from DOCX
}, { _id: false });

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
  
  // Phase 4E - True Document Page Engine
  pageSettings: { type: PageSettingsSchema, default: () => ({}) },
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  strict: false // Allow dynamic fields if we merge metadata here later
});

export const Document = mongoose.model('Document', DocumentSchema);
