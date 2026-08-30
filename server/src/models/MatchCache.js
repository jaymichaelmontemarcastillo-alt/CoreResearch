import mongoose from 'mongoose';

const MatchCacheSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  studentId: { type: String, required: true, index: true },
  studentName: { type: String },
  title: { type: String, required: true },
  description: { type: String },
  results: [{
    adviserId: String,
    adviserName: String,
    department: String,
    score: Number,
    compatibilityScore: Number,
    matchedInterests: [String],
    matchedKeywords: [String],
    explanation: String,
  }],
  provider: { type: String },
  algorithmVersion: { type: String },
  executionTimeMs: { type: Number },
  generatedAt: { type: Date, required: true },
}, {
  timestamps: false,
});

export const MatchCache = mongoose.model('MatchCache', MatchCacheSchema);
