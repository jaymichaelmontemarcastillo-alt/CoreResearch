import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true },
  first_name: { type: String },
  last_name: { type: String },
  fullName: { type: String },
  role: { type: String, enum: ['student', 'adviser', 'panelist', 'admin'], default: 'student' },
  role_id: { type: String },
  department: { type: String, default: 'Computer Studies' },
  department_id: { type: String },
  studentIdOrEmployeeId: { type: String },
  status: { type: String, default: 'active' },
  is_approved: { type: Boolean, default: true },
  profile_image: { type: String },
  
  // Adviser-specific fields
  isAvailable: { type: Boolean, default: true },
  maxCapacity: { type: Number, default: 5 },
  activeGroupsCount: { type: Number, default: 0 },
  
  // Academic / NLP Matching fields
  college: { type: String },
  specialization: [{ type: String }],
  expertise: [{ type: String }],
  researchInterests: [{ type: String }],
  keywords: [{ type: String }],
  selectedExpertise: [{ type: String }],
  
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  strict: false // Allow dynamic fields to be saved if any were missed
});

export const User = mongoose.model('User', UserSchema);
