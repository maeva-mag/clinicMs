import mongoose from "mongoose";

const shiftSchema = new mongoose.Schema({
  staffType: { type: String, enum: ['doctor', 'nurse'], required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  nurse: { type: mongoose.Schema.Types.ObjectId, ref: 'Nurse' },
  day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], required: true },
  shiftType: { type: String, enum: ['Morning', 'Afternoon', 'Night'], required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  notes: { type: String, default: "" }
}, { timestamps: true });

export default mongoose.model('Shift', shiftSchema);
