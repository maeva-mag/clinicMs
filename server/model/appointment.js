import mongoose from 'mongoose';
import payment from './payment.js';



const appointmentSchema = new mongoose.Schema({
  doctor: {
    type:String,
    required: true,
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  appointmentDate: {
    type: Date,
    required: true,
  },
  time:{
    type: String,
    required: true,
  },
  reason: {
    type: String,
    enum: ["Follow-up", "Consultation"],
    required: true,
    default: "Consultation"
  },
  status: {
    type: String,
    enum: ["pending", "confirmed",  "cancelled"],
    default: "pending",
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
  }
 
//   notes: {
//     type: String,
//   },

//   email:{
//     type: String,
//     required: true,
//   }
});

export default mongoose.model('Appointment', appointmentSchema);