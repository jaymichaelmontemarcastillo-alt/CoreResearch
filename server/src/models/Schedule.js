import mongoose from 'mongoose';

const ScheduleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  projectId: { type: String, required: true, index: true },
  projectTitle: { type: String },
  studentName: { type: String, default: 'Student Researcher' },
  memberIds: [{ type: String }],
  date: { type: String },
  time: { type: String },
  endTime: { type: String },
  location: { type: String },
  type: { type: String, enum: ['proposal', 'final_defense', 'proposal_defense'], default: 'proposal' },
  status: {
    type: String,
    enum: ['scheduled', 'rescheduled', 'completed', 'cancelled', 'failed', 'for_redefense', 'archived'],
    default: 'scheduled'
  },
  adviserId: { type: String },
  adviserName: { type: String },
  attempt: { type: Number },
  defenseStage: { type: String },
  notes: { type: String },
  resultStatus: {
    type: String,
    enum: ['passed', 're_defense', 'failed', 'pending', 'scheduled', 'completed', 'approved'],
    default: 'pending'
  },
  panelists: [{
    id: String,
    name: String,
    email: String,
    role: String
  }],
}, { timestamps: true });

ScheduleSchema.index({ status: 1 });
ScheduleSchema.index({ date: 1 });
ScheduleSchema.index({ memberIds: 1 });
ScheduleSchema.index({ 'panelists.id': 1 });
ScheduleSchema.index({ 'panelists.email': 1 });

export const Schedule = mongoose.model('Schedule', ScheduleSchema);

