import Nurse from "../model/nurse.js";
import User from "../model/user.js";
import NonUser from "../model/userFormular.js";
import Billing from "../model/billing.js";
import bcrypt from "bcryptjs";
 export const updateNurseProfile = async (req, res) => {
  try {
    const { nurseId } = req.params;
    const { address, telephone, gender, profilepicture,ward } = req.body;

    const nurse = await Nurse.findById(nurseId);
    if (!nurse) {
      return res.status(404).json({ message: 'Nurse profile not found' });
    }
    if(req.user.role === 'nurse' && nurse._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied. Nurses can only update their own profile.' });
    }

    // Update nurse profile fields
    nurse.address = address || nurse.address;
    nurse.telephone = telephone || nurse.telephone;
    nurse.gender = gender || nurse.gender;
    nurse.profilepicture = profilepicture || nurse.profilepicture;
    nurse.ward = ward || nurse.ward;

    await nurse.save();
    res.status(200).json({ message: 'Nurse profile updated successfully', nurse });
  } catch (error) {
    res.status(500).json({ message: 'Error updating nurse profile' });
  }
};


export const getNurseProfile = async (req, res) => {
  try {
    const { nurseId } = req.params;

    const nurse = await Nurse.findById(nurseId);

    if (!nurse) {
      return res.status(404).json({ message: 'Nurse profile not found' });
    }

    res.status(200).json({ nurse });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching nurse profile' });
  }
};

      // Nurse registers a new onsite patient
export const registerOnsitePatient = async (req, res) => {
  try {
    const { name, age, gender, address, telephone, bloodType, allergies, email, emergencyContact } = req.body;

    if (req.user.role !== 'nurse') {
      return res.status(403).json({ message: 'Access denied. Only nurses can register onsite patients.' });
    }

    if (!name || !age || !gender || !address || !telephone || !bloodType || !email || !emergencyContact) {
      return res.status(400).json({ message: 'Missing required patient information' });
    }

    const patient = new NonUser({
      name,
      age,
      gender,
      address,
      telephone,
      bloodType,
      allergies,
      email,
      emergencyContact,
      registeredOn: Date.now(), // auto timestamp
      registeredBy: req.user._id
    });

    await patient.save();

    const populatedPatient = await NonUser.findById(patient._id).populate('registeredBy', 'name role');

    res.status(201).json({ message: 'Onsite patient registered successfully', patient: populatedPatient });
  } catch (error) {
    res.status(500).json({ message: 'Error registering onsite patient', error: error.message });
  }
};

// Nurse admits patient
export const admitPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (req.user.role !== 'nurse') {
      return res.status(403).json({ message: 'Access denied. Only nurses can admit patients.' });
    }

    const patient = await NonUser.findById(patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    patient.admittedAt = new Date();
    patient.admittedBy = req.user._id; // logged in nurse ID
    patient.dischargedAt = null;
    patient.dischargedBy = null;
    await patient.save();
    const populatedPatient = await NonUser.findById(patient._id).populate('admittedBy', 'name role');

    res.status(200).json({ message: 'Patient admitted successfully', patient: populatedPatient });
  } catch (error) {
    res.status(500).json({ message: 'Error admitting patient' });
  }
};
// Nurse discharges patient
export const dischargePatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (req.user.role !== 'nurse') {
      return res.status(403).json({ message: 'Access denied. Only nurses can discharge patients.' });
    }

    const patient = await NonUser.findById(patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    patient.dischargedAt = new Date();
    patient.dischargedBy = req.user._id; // logged in nurse ID
    await patient.save();
    const populatedPatient = await NonUser.findById(patient._id).populate('dischargedBy', 'name role');

    res.status(200).json({ message: 'Patient discharged successfully', patient: populatedPatient });
  } catch (error) {
    res.status(500).json({ message: 'Error discharging patient' });
  }
};
//get all patients (onsite and registered)
export const getAllPatients = async (req, res) => {
  try {
    if (req.user.role !== 'nurse' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only nurses and admins can view all patients.' });
    }

    const onsitePatients = await NonUser.find().populate('registeredBy', 'name role');
    const registeredPatients = await User.find({ role: 'client' });
    
    // Combine both lists
    const allPatients = [
      ...onsitePatients.map(p => ({ ...p._doc, patientType: 'Onsite' })),
      ...registeredPatients.map(p => ({ ...p._doc, patientType: 'Registered' }))
    ];

    res.status(200).json({ patients: allPatients });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching patients', error: error.message });
  }
};

// Create a new billing record for a patient
export const createBilling = async (req, res) => {
  try {
    if (req.user.role !== 'nurse') {
      return res.status(403).json({ message: 'Access denied. Only nurses can create billing records.' });
    }

    const { patientId, charges, paymentsandadjustments } = req.body;

    // Verify patient exists
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'client') {
      return res.status(400).json({ message: 'Invalid patient ID. Must be a registered patient.' });
    }

    // Calculate totals
    const totalCharges = charges.reduce((sum, c) => sum + c.amount, 0);
    const totalPayments = paymentsandadjustments.reduce((sum, p) => sum + p.amount, 0);
    const balance = totalCharges - totalPayments;

    const billing = new Billing({
      patient: patientId,
      charges,
      totalcharges: totalCharges,
      totalpayment: totalPayments,
      balance,
      paymentsandadjustments
    });

    await billing.save();

    res.status(201).json({ message: 'Billing record created successfully', billing });
  } catch (error) {
    res.status(500).json({ message: 'Error creating billing record', error });
  }
};

// Add a new charge to an existing billing record
export const addCharge = async (req, res) => {
  try {
    if (req.user.role !== 'nurse') {
      return res.status(403).json({ message: 'Access denied. Only nurses can add charges.' });
    }

    const { billingId } = req.params;
    const { description, amount, unit } = req.body;

    const billing = await Billing.findById(billingId);
    if (!billing) return res.status(404).json({ message: 'Billing record not found' });

    billing.charges.push({ description, amount, unit });
    billing.totalcharges += amount;
    billing.balance = billing.totalcharges - billing.totalpayment;

    await billing.save();
    await User.findByIdAndUpdate(billing.patient, { $push: { billing: billing._id } });

    res.status(200).json({ message: 'Charge added successfully', billing });
  } catch (error) {
    res.status(500).json({ message: 'Error adding charge', error });
  }
};

// Add a payment/adjustment
export const addPayment = async (req, res) => {
  try {
    if (req.user.role !== 'nurse') {
      return res.status(403).json({ message: 'Access denied. Only nurses can add payments.' });
    }

    const { billingId } = req.params;
    const { description, amount } = req.body;

    const billing = await Billing.findById(billingId);
    if (!billing) return res.status(404).json({ message: 'Billing record not found' });

    billing.paymentsandadjustments.push({ description, amount });
    billing.totalpayment += amount;
    billing.balance = billing.totalcharges - billing.totalpayment;

    await billing.save();

    res.status(200).json({ message: 'Payment added successfully', billing });
  } catch (error) {
    res.status(500).json({ message: 'Error adding payment', error });
  }
};

// Allocate bed to patient
export const allocateBed = async (req, res) => {
  try {
    if (req.user.role !== 'nurse') {
      return res.status(403).json({ message: 'Access denied. Only nurses can allocate beds.' });
    }

    const { patientId } = req.params;
    const { bed } = req.body;

    const patient = await NonUser.findById(patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    // Assign bed
    patient.bed = bed;
    await patient.save();

    res.status(200).json({
      message: `Bed ${bed} allocated successfully`,
      patient
    });
  } catch (error) {
    res.status(500).json({ message: 'Error allocating bed', error });
  }
};

// Release bed
export const releaseBed = async (req, res) => {
  try {
    if (req.user.role !== 'nurse') {
      return res.status(403).json({ message: 'Access denied. Only nurses can release beds.' });
    }

    const { patientId } = req.params;

    const patient = await NonUser.findById(patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    patient.bed = null;
    await patient.save();

    res.status(200).json({
      message: 'Bed released successfully',
      patient
    });
  } catch (error) {
    res.status(500).json({ message: 'Error releasing bed', error });
  }
};

