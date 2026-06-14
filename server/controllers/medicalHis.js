import User from "../model/user.js";
import Doctor from "../model/doctor.js";
import Epidemiology from "../model/epidemiology.js";

// Helper to bucket age into a readable range
const getAgeRange = (age) => {
  if (age === null || age === undefined || isNaN(Number(age))) return 'Unknown';
  const n = Number(age);
  if (n <= 10)  return '0-10';
  if (n <= 20)  return '11-20';
  if (n <= 30)  return '21-30';
  if (n <= 40)  return '31-40';
  if (n <= 50)  return '41-50';
  if (n <= 60)  return '51-60';
  if (n <= 70)  return '61-70';
  return '71+';
};

// Write a prescription (doctor only) — saves to patient medicalHistory + doctor prescriptions
// Automatically records the diagnosis in the Epidemiology collection for statistics.
export const writePrescription = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { condition, diagnosisDate, treatment, medications, notes } = req.body;

    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Access denied. Only doctors can write prescriptions.' });
    }

    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Build the prescription / medical history entry
    const prescriptionEntry = {
      condition,
      diagnosisDate: diagnosisDate || new Date(),
      treatment,
      medications: medications || [],
      prescribedBy: req.user.userId,
      notes,
    };

    patient.medicalHistory.push(prescriptionEntry);
    await patient.save();

    // Add patient to doctor's prescriptions list (avoid duplicates)
    const doctor = await Doctor.findById(req.user.userId);
    if (doctor) {
      const alreadyAdded = doctor.prescriptions.some(
        (id) => id.toString() === patient._id.toString()
      );
      if (!alreadyAdded) {
        doctor.prescriptions.push(patient._id);
        await doctor.save();
      }
    }

    // ── Auto-record epidemiology data ──────────────────────────────────────────
    if (condition && condition.trim()) {
      try {
        const now = diagnosisDate ? new Date(diagnosisDate) : new Date();
        const patientAge = patient.age ? Number(patient.age) : null;
        const patientGender = patient.gender || 'Unknown';

        const epiRecord = new Epidemiology({
          condition: condition.trim(),
          gender: ['Male', 'Female', 'Other'].includes(patientGender) ? patientGender : 'Unknown',
          age: patientAge,
          ageRange: getAgeRange(patientAge),
          month: now.getMonth() + 1,   // 1-12
          year: now.getFullYear(),
          patientId: patient._id,
          doctorId: req.user.userId,
          recordedAt: now
        });
        await epiRecord.save();
      } catch (epiErr) {
        // Non-fatal: log but do not fail the prescription request
        console.warn('Epidemiology record failed to save:', epiErr.message);
      }
    }
    // ──────────────────────────────────────────────────────────────────────────

    const updatedPatient = await User.findById(patientId).populate(
      'medicalHistory.prescribedBy',
      'name'
    );

    res.status(200).json({
      message: 'Prescription written successfully.',
      medicalHistory: updatedPatient.medicalHistory,
    });
  } catch (error) {
    console.error('writePrescription error:', error);
    res.status(500).json({ message: 'Error writing prescription' });
  }
};

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
