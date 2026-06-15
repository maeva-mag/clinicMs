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
    if (req.user.role !== 'nurse' && req.user.role !== 'admin' && req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Access denied. Only nurses, doctors, and admins can view all patients.' });
    }

    const onsitePatients = await NonUser.find()
      .populate('registeredBy', 'name role')
      .populate('assignedDoctor', 'name department')
      .populate('assignedNurse', 'name ward');

    const registeredPatients = await User.find({ role: 'client' })
      .populate('assignedDoctor', 'name department')
      .populate('assignedNurse', 'name ward');

    // Combine both lists and ensure registeredOn is defined for all
    const allPatients = [
      ...onsitePatients.map(p => ({
        ...p._doc,
        patientType: 'Onsite',
        registeredOn: p.registeredOn || p._id.getTimestamp()
      })),
      ...registeredPatients.map(p => ({
        ...p._doc,
        patientType: 'Registered',
        registeredOn: p._id.getTimestamp()
      }))
    ];

    res.status(200).json({ patients: allPatients });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching patients', error: error.message });
  }
};

export const getMyNursePatients = async (req, res) => {
  try {
    const nurseId = req.user.userId;

    const [registered, onsite] = await Promise.all([
      User.find({ assignedNurse: nurseId, role: 'client' })
        .select('name email age gender bloodType telephone assignedDoctor assignedNurse createdAt')
        .populate('assignedDoctor', 'name department'),
      NonUser.find({ assignedNurse: nurseId })
        .select('name email age gender bloodType telephone assignedDoctor assignedNurse admittedAt bed dischargedAt')
        .populate('assignedDoctor', 'name department'),
    ]);

    const patients = [
      ...registered.map(p => ({ ...p._doc, patientType: 'Registered' })),
      ...onsite.map(p => ({ ...p._doc, patientType: 'Onsite' })),
    ];

    res.status(200).json({ patients });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assigned patients', error: error.message });
  }
};


// Create a new billing record for a patient
export const createBilling = async (req, res) => {
  try {
    if (req.user.role !== 'nurse' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only nurses can create billing records.' });
    }

    const { patientName, charges, paymentsandadjustments } = req.body;

    if (!patientName || patientName.trim() === '') {
      return res.status(400).json({ message: 'Patient name is required.' });
    }

    // Try to find a matching patient in User (registered client) by name (case-insensitive)
    let patient = await User.findOne({ name: { $regex: new RegExp(`^${patientName.trim()}$`, 'i') }, role: 'client' });
    let patientModel = 'User';
    let patientId = null;

    if (!patient) {
      // Try to find in NonUser (onsite patient)
      patient = await NonUser.findOne({ name: { $regex: new RegExp(`^${patientName.trim()}$`, 'i') } });
      patientModel = 'NonUser';
    }

    if (patient) {
      patientId = patient._id;
    } else {
      patientModel = undefined; // Do not save dynamic ref if patient is not in db
    }

    // Calculate totals
    const totalCharges = (charges || []).reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const totalPayments = (paymentsandadjustments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const balance = totalCharges - totalPayments;

    const billing = new Billing({
      patientName: patientName.trim(),
      patient: patientId,
      patientModel,
      charges: charges || [],
      totalcharges: totalCharges,
      totalpayment: totalPayments,
      balance,
      paymentsandadjustments: paymentsandadjustments || [],
      createdBy: req.user.userId || req.user._id
    });

    await billing.save();

    res.status(201).json({ message: 'Billing record created successfully', billing });
  } catch (error) {
    console.error('Error in createBilling:', error);
    res.status(500).json({ message: 'Error creating billing record', error: error.message });
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

