import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  manuscriptId: { type: String, required: true, index: true }, // Refers to a specific version (ms-v1.0)
  reviewerId: { type: String, required: true },
  reviewerName: { type: String },
  reviewerRole: { type: String },
  chapter: { type: String },
  comment: { type: String, required: true },
  status: { type: String, enum: ['pending', 'addressed'], default: 'pending' },
  studentResponse: { type: String, default: '' },
}, { timestamps: true });

export const Review = mongoose.model('Review', ReviewSchema);
