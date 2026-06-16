import mongoose from 'mongoose';
import appointment from './appointment.js';
import doctor from './doctor.js';
import billing from './billing.js';

const userProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  profileImage: { type: String, required: true },
});

const medicationSchema = new mongoose.Schema({
  name: { type: String },
  dosage: { type: String },
  frequency: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
});

const medicalHistorySchema = new mongoose.Schema({
  condition: { type: String },
  symptoms: { type: String },
  diagnosisDate: { type: Date },
  treatment: { type: String },
  medications: [medicationSchema],
  notes: { type: String },
  prescribedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  bloodType: { type: String, required: true },
  telephone: { type: String, required: true },
  allergies: { type: [String], default: [] },
  address: { type: String, required: true },
  emergencyContact: { type: Number, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['admin', 'client', 'doctor', 'nurse'], default: 'client' },
  userProfile: userProfileSchema, // or [userProfileSchema] if multiple
  profilepicture: { type: String },
  medicalHistory: { type: [medicalHistorySchema], default: [] },
  appointments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }],
  billing: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Billing' }],
  assignedDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
  assignedNurse:  { type: mongoose.Schema.Types.ObjectId, ref: 'Nurse',  default: null },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
