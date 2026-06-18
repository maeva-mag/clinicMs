import User from "../model/user.js";
import Appointment from "../model/appointment.js";
import Payment from "../model/payment.js";
import Billing from "../model/billing.js";
import NonUser from "../model/userFormular.js";
import OnsitePrescription from "../model/onsitePrescription.js";
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
    let user = await User.findById(userId).select(
      'name userProfile email age gender bloodType telephone allergies address emergencyContact medicalHistory'
    );

    if (!user) {
      const nonUser = await NonUser.findById(userId)
        .populate('assignedDoctor', 'name')
        .populate('assignedNurse', 'name');
      if (!nonUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      user = {
        _id: nonUser._id,
        name: nonUser.name,
        email: nonUser.email,
        age: nonUser.age,
        gender: nonUser.gender,
        bloodType: nonUser.bloodType,
        telephone: nonUser.telephone,
        allergies: nonUser.allergies,
        address: nonUser.address,
        emergencyContact: nonUser.emergencyContact,
        bed: nonUser.bed,
        admittedAt: nonUser.admittedAt,
        assignedDoctor: nonUser.assignedDoctor,
        assignedNurse: nonUser.assignedNurse,
        patientType: 'Onsite'
      };
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('getUserProfile error:', error);
    res.status(500).json({ message: 'Error fetching user profile' });
  }
};
export const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    // Only allow updating certain fields
    const { name, age, gender, bloodType, address, telephone, allergies, email, profilepicture } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, age, gender, bloodType, address, telephone, allergies, email, profilepicture },
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
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('medicalHistory');
    
    if (!user) {
      const nonUser = await NonUser.findById(userId);
      if (!nonUser) {
        return res.status(404).json({ message: 'Patient not found' });
      }
      const prescriptions = await OnsitePrescription.find({ onsitePatientId: userId })
        .populate('doctor', 'name');
      
      const medicalHistory = prescriptions.map(rx => ({
        condition: rx.condition,
        symptoms: rx.symptoms,
        diagnosisDate: rx.diagnosisDate,
        treatment: rx.treatment,
        notes: rx.notes,
        medications: rx.medications,
        prescribedBy: rx.doctor,
      }));
      return res.status(200).json({ medicalHistory });
    }
    
    res.status(200).json({ medicalHistory: user.medicalHistory });
  } catch (error) {
    console.error('getMedicalHistory error:', error);
    res.status(500).json({ message: 'Error fetching medical history' });
  }
};
// make an appointment
export const makeAppointment = async (req, res) => {
  try {
    const { userId } = req.params;
    const { doctorId, date, time, reason, paymentMethod } = req.body;

    if (!doctorId || !date || !time) {
      return res.status(400).json({ message: 'Doctor ID, date, and time are required' });
    }

    // Fetch the patient user to get their name for billing records
    const patientUser = await User.findById(userId);
    if (!patientUser) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const newAppointment = new Appointment({
      doctor: doctorId,
      patient: userId,
      appointmentDate: new Date(date),
      time,
      reason: reason || 'Consultation',
      status: reason === 'Follow-up' ? 'confirmed' : 'pending'
    });

    if (reason === 'Follow-up') {
      newAppointment.status = 'confirmed';
      await newAppointment.save();

      // Push appointment reference to patient User
      await User.findByIdAndUpdate(userId, {
        $push: { appointments: newAppointment._id }
      });

      return res.status(201).json({ message: 'Appointment created successfully', appointment: newAppointment });
    }

    // For Consultation, process payment and confirm appointment
    const payment = new Payment({
      appointment: newAppointment._id,
      patient: userId,
      amount: 1000,
      method: 'mobile money',
      status: 'completed'
    });
    await payment.save();

    const billing = new Billing({
      patientName: patientUser.name,
      patient: userId,
      patientModel: 'User',
      charges: [{
        description: "Consultation Fee",
        amount: 1000,
        unit: "FCFA"
      }],
      totalcharges: 1000,
      totalpayment: 1000,
      balance: 0,
      paymentsandadjustments: [{
        description: `Payment via ${paymentMethod || 'MTN Mobile Money'}`,
        amount: 1000
      }]
    });
    await billing.save();

    newAppointment.payment = payment._id;
    newAppointment.status = 'confirmed';
    await newAppointment.save();

    // Push appointment and billing references to patient User
    await User.findByIdAndUpdate(userId, {
      $push: { appointments: newAppointment._id, billing: billing._id }
    });

    res.status(201).json({ message: 'Appointment created and payment recorded', appointment: newAppointment, billing });
  } catch (error) {
    console.error('makeAppointment error:', error);
    res.status(500).json({ message: 'Error creating appointment', error: error.message });
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
export const getAppointments = async (req, res) => {
  try {
    const { userId } = req.params;
    const appointments = await Appointment.find({ patient: userId });

    // Enrich each appointment with doctor name (doctor field is a string ID)
    const Doctor = (await import('../model/doctor.js')).default;
    const enriched = await Promise.all(appointments.map(async (apt) => {
      const aptObj = apt.toObject();
      if (apt.doctor) {
        try {
          const doc = await Doctor.findById(apt.doctor).select('name department');
          if (doc) {
            aptObj.doctor = { _id: doc._id, name: doc.name, department: doc.department };
          }
        } catch (_) { /* keep as string if lookup fails */ }
      }
      return aptObj;
    }));

    res.status(200).json({ appointments: enriched });
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

// Patient views their own bills (also viewable by admin, doctor, nurse)
export const getPatientBills = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!['client', 'admin', 'doctor', 'nurse'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
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

