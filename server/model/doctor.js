import mongoose from "mongoose";
const doctorSchema = new mongoose.Schema({
  account:{ type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  name: { type: String, required: true },
  email: { type: String, unique: true },
  password: { type: String }, // initially empty
  role: { type: String, enum: ['admin','doctor','nurse','client'], default: 'doctor' },
  active: { type: Boolean, default: true },
  department: { type: String },
  mustSetPassword: { type: Boolean, default: false }, // flag for first-time setup
  address: { type: String },
  profilepicture: { type: String },
  telephone: { type: String },
  gender: { type: String },
  specialisation: { type: String },
  prescriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});
export default mongoose.model('Doctor', doctorSchema);