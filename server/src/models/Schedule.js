import mongoose from 'mongoose';

const ScheduleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  projectId: { type: String, required: true, index: true },
  projectTitle: { type: String },
  date: { type: String },
  time: { type: String },
  location: { type: String },
  type: { type: String, enum: ['proposal', 'final_defense'] },
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  panelists: [{
    id: String,
    name: String,
    email: String,
    role: String
  }],
}, { timestamps: true });

export const Schedule = mongoose.model('Schedule', ScheduleSchema);
