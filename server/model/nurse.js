import mongoose from "mongoose";
const nurseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true },
  password: { type: String }, // initially empty
  role: { type: String, enum: ['admin','doctor','nurse','client'], required: true },
  active: { type: Boolean, default: true },
  mustSetPassword: { type: Boolean, default: true }, // flag for first-time setup
  profilepicture: { type: String },
  address: { type: String },
  telephone: { type: String },
  gender: { type: String },
  ward: { type: String, default: 'General' },
  createdAt: { type: Date, default: Date.now }
});
export default mongoose.model('Nurse', nurseSchema);