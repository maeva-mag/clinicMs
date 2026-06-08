import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // adminNo:{ type: String, required: true, unique: true},
  role: { type: String, enum: ['admin','doctor','nurse','client'], required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  active: { type: Boolean, default: true },
  profilepicture: { type: String },
  mustSetPassword:{type: Boolean, default: false},
  address: { type: String },
  telephone: { type: String },
  gender: { type: String }
  
});

export default mongoose.model('Admin', adminSchema);