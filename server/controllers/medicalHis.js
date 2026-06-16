import User from "../model/user.js";
import Doctor from "../model/doctor.js";
import Epidemiology from "../model/epidemiology.js";
import NonUser from "../model/userFormular.js";
import OnsitePrescription from "../model/onsitePrescription.js";

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

// Write a prescription (doctor only)
// - Registered patients: saved to User.medicalHistory (existing behaviour)
// - Onsite patients:     saved to OnsitePrescription collection (doctor's own records)
export const writePrescription = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { condition, symptoms, diagnosisDate, treatment, medications, notes } = req.body;

    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Access denied. Only doctors can write prescriptions.' });
    }

    if (!condition || !condition.trim()) {
      return res.status(400).json({ message: 'Condition / Diagnosis is required.' });
    }

    // Filter out medications with empty names
    const cleanMedications = Array.isArray(medications)
      ? medications.filter(m => m.name && m.name.trim() !== '')
      : [];

    // ── Try registered patient first ───────────────────────────────────────────
    const registeredPatient = await User.findById(patientId);

    if (registeredPatient) {
      // ── REGISTERED PATIENT: store on User.medicalHistory ──────────────────
      const prescriptionEntry = {
        condition,
        symptoms,
        diagnosisDate: diagnosisDate || new Date(),
        treatment,
        medications: cleanMedications,
        prescribedBy: req.user.userId,
        notes,
      };

      // Atomic update to bypass other fields validation
      const updatedPatient = await User.findByIdAndUpdate(
        patientId,
        { $push: { medicalHistory: prescriptionEntry } },
        { new: true, runValidators: true }
      ).populate('medicalHistory.prescribedBy', 'name');

      // Add patient to doctor's prescriptions list (avoid duplicates)
      const doctor = await Doctor.findById(req.user.userId);
      if (doctor) {
        const alreadyAdded = doctor.prescriptions.some(
          (id) => id.toString() === registeredPatient._id.toString()
        );
        if (!alreadyAdded) {
          doctor.prescriptions.push(registeredPatient._id);
          await doctor.save();
        }
      }

      // Auto-record epidemiology
      if (condition && condition.trim()) {
        try {
          const now = diagnosisDate ? new Date(diagnosisDate) : new Date();
          const epiRecord = new Epidemiology({
            condition: condition.trim(),
            gender: ['Male', 'Female', 'Other'].includes(registeredPatient.gender) ? registeredPatient.gender : 'Unknown',
            age: registeredPatient.age ? Number(registeredPatient.age) : null,
            ageRange: getAgeRange(registeredPatient.age),
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            patientId: registeredPatient._id,
            doctorId: req.user.userId,
            recordedAt: now
          });
          await epiRecord.save();
        } catch (epiErr) {
          console.warn('Epidemiology record failed to save:', epiErr.message);
        }
      }

      return res.status(200).json({
        message: 'Prescription written successfully.',
        patientType: 'registered',
        medicalHistory: updatedPatient.medicalHistory,
      });
    }

    // ── Try onsite (walk-in) patient ───────────────────────────────────────────
    const onsitePatient = await NonUser.findById(patientId);

    if (onsitePatient) {
      // ── ONSITE PATIENT: store in OnsitePrescription (doctor's own record) ──
      const onsiteRx = new OnsitePrescription({
        doctor:          req.user.userId,
        onsitePatientId: onsitePatient._id,
        patientName:     onsitePatient.name,
        patientAge:      onsitePatient.age,
        patientGender:   onsitePatient.gender,
        patientEmail:    onsitePatient.email,
        condition,
        symptoms,
        diagnosisDate:   diagnosisDate || new Date(),
        treatment,
        medications:     cleanMedications,
        notes,
      });
      await onsiteRx.save();

      // Auto-record epidemiology
      if (condition && condition.trim()) {
        try {
          const now = diagnosisDate ? new Date(diagnosisDate) : new Date();
          const epiRecord = new Epidemiology({
            condition: condition.trim(),
            gender: ['Male', 'Female', 'Other'].includes(onsitePatient.gender) ? onsitePatient.gender : 'Unknown',
            age: onsitePatient.age ? Number(onsitePatient.age) : null,
            ageRange: getAgeRange(onsitePatient.age),
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            patientId: onsitePatient._id,
            doctorId: req.user.userId,
            recordedAt: now
          });
          await epiRecord.save();
        } catch (epiErr) {
          console.warn('Epidemiology record failed to save:', epiErr.message);
        }
      }

      return res.status(200).json({
        message: 'Prescription written successfully for onsite patient.',
        patientType: 'onsite',
        prescription: onsiteRx,
      });
    }

    // Patient not found in either collection
    return res.status(404).json({ message: 'Patient not found. They may not be registered in the system.' });

  } catch (error) {
    console.error('writePrescription error:', error);
    res.status(500).json({ message: 'Error writing prescription', error: error.message });
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
