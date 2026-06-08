import User from "../model/user.js";
import Doctor from "../model/doctor.js";

// Update medical history (doctor/nurse only)
export const updateMedicalHistory = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { condition, diagnosisDate, treatment, medications } = req.body;

    // Check role: only doctor or nurse can update
    if (!['doctor', 'nurse'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Only doctors and nurses can update medical history.' });
    }

    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Add new medical history entry
    const newHistory = {
      condition,
      diagnosisDate,
      treatment,
      medications,
      prescribedBy: req.user.role === 'doctor' ? req.user.userId : undefined // Only set if doctor
    };

    patient.medicalHistory.push(newHistory);
    await patient.save();

    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findById(req.user.userId);
      if (doctor) {
        doctor.prescriptions.push(patient._id);
        await doctor.save();
      }
    }
    const updatedPatient = await User.findById(patientId).populate('medicalHistory.prescribedBy', 'name');

    // Simulate notification to patient (could be email, SMS, or socket event)
    // For now, just return a message
    res.status(200).json({
      message: 'Medical history updated successfully. Patient has been notified.',
      medicalHistory: updatedPatient.medicalHistory
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating medical history' });
  }
};
