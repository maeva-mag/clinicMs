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
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // reference to the patient
    charges: [hospitaChargesSchema], // array of hospital charges
    totalcharges: { type: Number, required: true },
    totalpayment: { type: Number, required: true },
    balance: { type: Number, required: true },
    paymentsandadjustments: [paymentandadjustmentSchema], // array of payments and adjustments
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Billing', billingSchema);