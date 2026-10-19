import mongoose from 'mongoose';

const RepositoryPublicationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  projectId: { type: String, index: true },
  title: { type: String, required: true },
  authors: [{ type: String }],
  adviserName: { type: String },
  department: { type: String },
  publicationYear: { type: Number },
  abstract: { type: String, required: true },
  keywords: [{ type: String }],
  pdfUrl: { type: String },
  manuscriptId: { type: String, index: true },
  citation: { type: String },
  publicationStatus: {
    type: String,
    enum: ['pending_publication', 'approved', 'rejected'],
    default: 'approved',
    index: true
  },
  rejectionReason: { type: String, default: '' },
  reviewedBy: { type: String },
  reviewedByName: { type: String },
  reviewedAt: { type: Date },
  viewsCount: { type: Number, default: 0 },
  downloadsCount: { type: Number, default: 0 },
  publishedAt: { type: Date, default: Date.now },
  
  // Student Publication Acceptance Audit Fields
  acceptedTerms: { type: Boolean, default: false },
  acceptedBy: { type: String },
  acceptedByName: { type: String },
  acceptedAt: { type: Date },
  termsVersion: { type: String }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

RepositoryPublicationSchema.index({ publishedAt: -1 });
RepositoryPublicationSchema.index({ department: 1, publicationYear: 1 });

export const RepositoryPublication = mongoose.model('RepositoryPublication', RepositoryPublicationSchema);

