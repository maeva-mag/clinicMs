import mongoose from 'mongoose';

const epidemiologySchema = new mongoose.Schema({
  condition: {
    type: String,
    required: true,
    trim: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Unknown'],
    default: 'Unknown'
  },
  age: {
    type: Number,
    default: null
  },
  ageRange: {
    type: String,
    // e.g. '0-10', '11-20', '21-30', '31-40', '41-50', '51-60', '61-70', '71+'
    default: 'Unknown'
  },
  month: {
    type: Number, // 1-12
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  recordedAt: {
    type: Date,
    default: Date.now
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    default: null
  }
});

// Helper: convert age to age range bucket
epidemiologySchema.statics.getAgeRange = function (age) {
  if (age === null || age === undefined || isNaN(age)) return 'Unknown';
  if (age <= 10)  return '0-10';
  if (age <= 20)  return '11-20';
  if (age <= 30)  return '21-30';
  if (age <= 40)  return '31-40';
  if (age <= 50)  return '41-50';
  if (age <= 60)  return '51-60';
  if (age <= 70)  return '61-70';
  return '71+';
};

export default mongoose.model('Epidemiology', epidemiologySchema);
