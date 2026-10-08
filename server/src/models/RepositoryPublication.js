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
  citation: { type: String },
  viewsCount: { type: Number, default: 0 },
  downloadsCount: { type: Number, default: 0 },
  publishedAt: { type: Date, default: Date.now }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export const RepositoryPublication = mongoose.model('RepositoryPublication', RepositoryPublicationSchema);
