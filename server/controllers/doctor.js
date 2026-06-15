import User from '../model/user.js';
import Doctor from '../model/doctor.js';
import Appointment from '../model/appointment.js';
import NonUser from '../model/userFormular.js';


export const getDoctorPrescriptions = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await Doctor.findById(doctorId).populate({
      path: 'prescriptions',
      select: 'name age gender medicalHistory',
      populate: { path: 'medicalHistory.prescribedBy', select: 'name role' }
    });

    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    res.status(200).json({ prescriptions: doctor.prescriptions });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching doctor prescriptions' });
  }
};
// export const CreateDoctorProfile = async (req, res) => {
//   try {
//     const {  department, address, profilepicture, telephone, gender, specialisation } = req.body;
//     const {accountId} = req.params;

//     // Check if account exists
//     const account = await User.findById(accountId);
//     if (!account) {
//       return res.status(404).json({ message: 'Account not found' });
//     }
//     const doctorProfile = new Doctor({
//       account: account._id,
//       department,
//       address,
//       profilepicture,
//       telephone,
//       gender,
//       specialisation
//     });
//     await doctorProfile.save();
//     res.status(201).json({ message: 'Doctor profile created successfully', doctorProfile });

//     // Check if doctor profile already exists for the given account
//  } catch (error) {
//     res.status(500).json({ message: 'Error creating doctor profile' });
//   }
// };


export const updateDoctorProfile = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { department, address, telephone, gender, specialisation, profilepicture } = req.body;

    // Verify doctor profile exists
    const doctor = await Doctor.findById(doctorId).populate('account', 'name email role');
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    // Ensure only the doctor themselves or an admin can update
    const loggedUserId = req.user.userId;
    const accountId = doctor.account ? doctor.account._id.toString() : null;
    const doctorIdStr = doctor._id.toString();

    if (req.user.role !== 'admin' && loggedUserId !== accountId && loggedUserId !== doctorIdStr) {
      return res.status(403).json({ message: 'Access denied. Only the doctor or an admin can update this profile.' });
    }

    // ✅ Update only extended profile fields
    doctor.department = department ?? doctor.department;
    doctor.address = address ?? doctor.address;
    doctor.telephone = telephone ?? doctor.telephone;
    doctor.gender = gender ?? doctor.gender;
    doctor.specialisation = specialisation ?? doctor.specialisation;
    doctor.profilepicture = profilepicture ?? doctor.profilepicture;

    await doctor.save();

    res.status(200).json({ message: 'Doctor profile updated successfully', doctor });
  } catch (error) {
    res.status(500).json({ message: 'Error updating doctor profile' });
  }
};



export const getDoctorProfile = async (req, res) => {
  try {
    const { doctorId } = req.params;

    // Find doctor profile and populate linked User account
    const doctor = await Doctor.findById(doctorId)
      .populate('account', 'name email role'); // bring in name, email, role from User

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    res.status(200).json({ doctor });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching doctor profile' });
  }
};

export const getDoctorAppointments = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const appointments = await Appointment.find({ doctor: doctorId }).populate('patient', 'name email');
    res.status(200).json({ appointments });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching doctor appointments' });
  }
};

export const getMyDoctorPatients = async (req, res) => {
  try {
    const doctorId = req.user.userId;

    const [registered, onsite] = await Promise.all([
      User.find({ assignedDoctor: doctorId, role: 'client' })
        .select('name email age gender bloodType telephone assignedNurse assignedDoctor createdAt')
        .populate('assignedNurse', 'name ward'),
      NonUser.find({ assignedDoctor: doctorId })
        .select('name email age gender bloodType telephone assignedNurse assignedDoctor admittedAt bed')
        .populate('assignedNurse', 'name ward'),
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
