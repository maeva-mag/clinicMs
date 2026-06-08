import User from "../model/user.js";
import Appointment from "../model/appointment.js";
import Payment from "../model/payment.js";
import Billing from "../model/billing.js";
// Create or update profile
export const createProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { profileImage } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { userProfile: { userId, profileImage } },
      { new: true } // return updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Error creating profile' });
  }
};

// Get profile
export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select(
      'name userProfile email age gender bloodType telephone allergies address emergencyContact medicalHistory'
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user profile' });
  }
};
export const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    // Only allow updating certain fields
    const { name, age, gender, bloodType, address, telephone, allergies, email } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, age, gender, bloodType, address, telephone, allergies, email },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile' });
  }
};
 // get medical history
export const getMedicalHistory = async (req, res) => {
    try{
        const { userId } = req.params;
        const user = await User.findById(userId).select('medicalHistory');
        res.status(200).json({ medicalHistory: user.medicalHistory });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching medical history' });

    }
};
// make an appointment
export const makeAppointment = async (req, res) => {
  try {
    const { userId } = req.params;
    const { doctorId, date, time } = req.body;

    const newAppointment = new Appointment({
      doctor: doctorId,
      patient: userId,
      date,
      time,
      status: 'pending'
    });

    await newAppointment.save();

    res.status(201).json({ message: 'Appointment created, awaiting payment', appointment: newAppointment });
  } catch (error) {
    res.status(500).json({ message: 'Error creating appointment' });
  }
};

export const makePayment = async (req, res) => {
  try {
    const { userId, appointmentId } = req.params;
    const { amount, method } = req.body;

    const appointment = await Appointment.findById(appointmentId).populate('patient', 'name email');
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    if (appointment.patient._id.toString() !== userId) {
      return res.status(403).json({ message: 'You can only pay for your own appointment' });
    }

    const payment = new Payment({
      appointment: appointmentId,
      patient: userId,
      amount,
      method,
      status: 'completed'
    });

    await payment.save();

    // Link payment to appointment and confirm it
    appointment.payment = payment._id;
    appointment.status = 'confirmed';
    await appointment.save();

    res.status(200).json({ message: 'Payment successful, appointment confirmed', appointment });
  } catch (error) {
    res.status(500).json({ message: 'Error processing payment' });
  }
};



// get all appointments 
export const getAppointments=async(req,res)=>{
    try{
        const {userId} = req.params;
        const appointments = await Appointment.find({ patient: userId });
        res.status(200).json({ appointments });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching appointments' });

    }
};

// Cancel appointment

export const cancelAppointment = async (req, res) => {
  try {
    const { userId, appointmentId } = req.params;

    // Find the appointment
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Ensure the appointment belongs to this client (unless admin role)
    if (appointment.patient.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only cancel your own appointments' });
    }

    // Update appointment status to cancelled
    appointment.status = 'cancelled';
    await appointment.save();

    // Remove appointment reference from user's appointments array
    await User.findByIdAndUpdate(
      userId,
      { $pull: { appointments: appointmentId } },
      { new: true }
    );

    res.status(200).json({ message: 'Appointment cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error cancelling appointment' });
  }
};

// Patient views their own bills
export const getPatientBills = async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Access denied. Only patients can view their bills.' });
    }

    const bills = await Billing.find({ patient: userId })
      .populate('patient', 'name email')
      .populate('createdBy', 'name role');

    res.status(200).json({
      message: 'Bills retrieved successfully',
      count: bills.length,
      bills
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bills', error });
  }
};

