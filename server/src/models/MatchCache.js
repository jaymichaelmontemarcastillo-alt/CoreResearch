import mongoose from "mongoose";

const MatchCacheSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    studentId: { type: String, required: true, index: true },
    studentName: { type: String },
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "completed",
      index: true,
    },
    statusMessage: { type: String },
    title: { type: String, required: true },
    description: { type: String },
    // Preserve the complete recommendation payload for session restoration.
    results: [{ type: mongoose.Schema.Types.Mixed }],
    availableAlternatives: [{ type: mongoose.Schema.Types.Mixed }],
    provider: { type: String },
    algorithmVersion: { type: String },
    executionTimeMs: { type: Number },
    generatedAt: { type: Date, required: true },
    updatedAt: { type: Date },
  },
  {
    timestamps: false,
    strict: false,
  },
);

export const MatchCache = mongoose.model("MatchCache", MatchCacheSchema);
