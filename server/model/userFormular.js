import mongoose from "mongoose";
const nonUsersSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  bloodType: { type: String, required: true },
  telephone: { type: String, required: true },
  allergies: { type: [String], default: [] },
  address: { type: String, required: true },
  emergencyContact: { type: Number, required: true },
  email: { type: String, required: true, unique: true },
  admittedAt: { type: Date, default: Date.now },
  dischargedAt: { type: Date },
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Nurse' }, // who registered the patient
  registeredOn: { type: Date, default: Date.now },
  admittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Nurse' }, // who admitted the patient
  dischargedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Nurse' }, // who discharged the patient
  bed: { type: String, default: null },
  assignedDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
  assignedNurse:  { type: mongoose.Schema.Types.ObjectId, ref: 'Nurse',  default: null },
}, { timestamps: true });

export default mongoose.model('NonUser', nonUsersSchema);
