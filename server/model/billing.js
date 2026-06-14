import mongoose from "mongoose";
const hospitaChargesSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    unit: { type: String, required: true }
});
const paymentandadjustmentSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    description: { type: String, required: true },
    amount: { type: Number, required: true }
});

const billingSchema = new mongoose.Schema({
  patientName: { type: String, required: true }, // patient name typed by the nurse
  patient: { type: mongoose.Schema.Types.ObjectId, refPath: 'patientModel', required: false }, // optional dynamic reference
  patientModel: { type: String, required: false, enum: ['User', 'NonUser'], default: 'User' }, // User or NonUser
  charges: [hospitaChargesSchema], // array of hospital charges
  totalcharges: { type: Number, required: true },
  totalpayment: { type: Number, required: true },
  balance: { type: Number, required: true },
  paymentsandadjustments: [paymentandadjustmentSchema], // array of payments and adjustments
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Nurse' }, // reference to the creator
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Billing', billingSchema);