import mongoose from 'mongoose';

const medicationSchema = new mongoose.Schema({
  name:      { type: String },
  dosage:    { type: String },
  frequency: { type: String },
});

const onsitePrescriptionSchema = new mongoose.Schema({
  doctor:          { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  onsitePatientId: { type: mongoose.Schema.Types.ObjectId, ref: 'NonUser', required: true },

  // Snapshot of patient info at time of prescription (in case record is deleted later)
  patientName:   { type: String, required: true },
  patientAge:    { type: Number },
  patientGender: { type: String },
  patientEmail:  { type: String },

  // Prescription details
  condition:     { type: String, required: true },
  diagnosisDate: { type: Date, default: Date.now },
  treatment:     { type: String },
  medications:   { type: [medicationSchema], default: [] },
  notes:         { type: String },
}, { timestamps: true });

export default mongoose.model('OnsitePrescription', onsitePrescriptionSchema);
