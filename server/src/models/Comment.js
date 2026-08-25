import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  documentId: { type: String, required: true, index: true }, // Maps to Project ID
  authorUid: { type: String, required: true },
  authorName: { type: String },
  authorRole: { type: String },
  content: { type: String, required: true },
  resolved: { type: Boolean, default: false },
  
  // Anchoring Strategy
  yjsRelativePosition: { type: Object }, // Primary: CRDT tracking point
  anchorNodeId: { type: String },        // Fallback: Tiptap Block ID
  selectedText: { type: String },        // Legacy frontend reference
  section: { type: String },
  page: { type: Number },
  
  // Thread Support
  replies: [{
    id: String,
    authorUid: String,
    authorName: String,
    authorRole: String,
    content: String,
    createdAt: Date
  }],
}, { timestamps: true });

export const Comment = mongoose.model('Comment', CommentSchema);
