import Admin from "../model/admin.js";
import Doctor from "../model/doctor.js";
import Nurse from "../model/nurse.js";
import User from "../model/user.js";
import NonUser from "../model/userFormular.js";
import Billing from "../model/billing.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { login } from "./authentication.js";

export const createAdminAccount = async (req, res) => {
  try{
    const { name, email, password} = req.body;
    
    // Validate fields FIRST before database query
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      mustSetPassword: false
    });
    await newAdmin.save();
    res.status(201).json({ message: 'Admin account created successfully', user: newAdmin });

  }catch(error){
    console.error('Admin registration error:', error);
    res.status(500).json({ message: 'Error creating admin account', error: error.message });
  }
};

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }
    const token = jwt.sign({ userId: admin._id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ message: 'Login successful', token, userId: admin._id, role: admin.role });
  } catch (error) {
    res.status(500).json({ message: 'Error during login' });
  }
};
// export const createAdminAccount = async (req, res) => {
//   try {
//     const { name, email } = req.body;

//     // Only allow admin role creation
//     const role = 'admin';

//     const existingAdmin = await Admin.findOne({ email });
    

//     if ( existingAdmin) {
//       return res.status(409).json({ message: 'User with this email already exists' });
//     }

//     // Admin accounts are created without password initially
//     const newAdmin = new Admin({
//       name,
//       email,
//       role,
//       mustSetPassword: true // admin must set password on first login
//     });

//     await newAdmin.save();

//     res.status(201).json({ message: ' Account created successfully. Staff must set password on first login.', user: newAdmin });
//   } catch (error) {
//     res.status(500).json({ message: 'Error creating admin account' });
//   }
// };
// // admin login

// export const setAdminPassword = async (req, res) => {
//   try {
//     // const { adminId } = req.params;
//     const { password, adminNo } = req.body;

//     const admin = await Admin.findOne(adminNo);
//     if (!admin) return res.status(404).json({ message: 'Admin not found' });

//     if (!admin.mustSetPassword) {
//       return res.status(400).json({ message: 'Password already set. Use normal login.' });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);
//     admin.password = hashedPassword;
//     admin.mustSetPassword = false;
//     await admin.save();

//     res.status(200).json({ message: 'Password set successfully. You can now log in.', user: admin });
//   } catch (error) {
//     res.status(500).json({ message: 'Error setting password' });
//   }
// };

// create staff account (doctor or nurse)

export const createStaffAccount = async (req, res) => {
  try {
    const { name, email, role } = req.body;

    if (!['doctor', 'nurse'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Only doctor or nurse accounts can be created.' });
    }

    const existingDoctor = await Doctor.findOne({ email });
    const existingNurse = await Nurse.findOne({ email });
    

    if (existingDoctor || existingNurse ) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    let newUser;
    if (role === 'doctor') {
      newUser = new Doctor({
        name,
        email,
        role,
        mustSetPassword: true
      });
      await newUser.save();
      newUser.account = newUser._id;
      await newUser.save();
    } else {
      newUser = new Nurse({
        name,
        email,
        role,
        mustSetPassword: true
      });
      await newUser.save();
    }

    res.status(201).json({ message: `${role} account created successfully. Staff must set password on first login.`, user: newUser });
  } catch (error) {
    res.status(500).json({ message: 'Error creating staff account' });
  }
};



// admin stats

export const getAdminStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admin can view stats.' });
    }

    const dateParam = req.query.date;
    const monthParam = req.query.month;
    let selectedDate = dateParam ? new Date(dateParam) : new Date();
    if (dateParam && isNaN(selectedDate.getTime())) {
      selectedDate = new Date();
    }
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Month range
    let selectedMonthStart;
    let selectedNextMonthStart;
    if (monthParam) {
      const parsed = new Date(`${monthParam}-01`);
      if (!isNaN(parsed.getTime())) {
        selectedMonthStart = new Date(parsed);
      } else {
        selectedMonthStart = new Date();
      }
    } else {
      selectedMonthStart = new Date();
    }
    selectedMonthStart.setDate(1);
    selectedMonthStart.setHours(0, 0, 0, 0);
    selectedNextMonthStart = new Date(selectedMonthStart);
    selectedNextMonthStart.setMonth(selectedNextMonthStart.getMonth() + 1);

    // Totals
    const totalDoctors = await Doctor.countDocuments();
    const totalNurses = await Nurse.countDocuments();
    const totalPatients = await User.countDocuments({ role: 'client' });
    const totalOnsitePatients = await NonUser.countDocuments();

    // Beds
    const occupiedBeds = await NonUser.countDocuments({ dischargedAt: null });
    const totalBeds = 50; // Assuming 50 beds in the hospital
    const unoccupiedBeds = totalBeds - occupiedBeds;

    // Onsite patients admitted/discharged per day
    const admittedPerDay = await NonUser.aggregate([
      { $match: { admittedAt: { $ne: null } } },
      { $group: { _id: { day: { $dayOfMonth: "$admittedAt" }, month: { $month: "$admittedAt" }, year: { $year: "$admittedAt" } }, patients: { $push: "$$ROOT" }, count: { $sum: 1 } } },
      { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } }
    ]);

    const dischargedPerDay = await NonUser.aggregate([
      { $match: { dischargedAt: { $ne: null } } },
      { $group: { _id: { day: { $dayOfMonth: "$dischargedAt" }, month: { $month: "$dischargedAt" }, year: { $year: "$dischargedAt" } }, patients: { $push: "$$ROOT" }, count: { $sum: 1 } } },
      { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } }
    ]);

    // Counts for the selected day
    const registeredToday = await User.countDocuments({
      role: 'client',
      createdAt: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });

    const admittedToday = await NonUser.countDocuments({
      admittedAt: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });

    const dischargedToday = await NonUser.countDocuments({
      dischargedAt: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });

    // Registered patients per day/month (needed below for "registeredToday")
    const registeredPerDay = await User.aggregate([
      { $match: { role: 'client' } },
      { $group: { _id: { day: { $dayOfMonth: "$createdAt" }, month: { $month: "$createdAt" }, year: { $year: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } }
    ]);

    const registeredPerMonth = await User.aggregate([
      { $match: { role: 'client' } },
      { $group: { _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { "_id.year": -1, "_id.month": -1 } }
    ]);

    // Today's date
    const today = new Date();
    const todayKey = {
      day: today.getDate(),
      month: today.getMonth() + 1,
      year: today.getFullYear()
    };

    // Total bills and month totals for the selected month filter
    const totalBillsThisMonth = await Billing.countDocuments({
      createdAt: {
        $gte: selectedMonthStart,
        $lt: selectedNextMonthStart
      }
    });

    const registeredThisMonth = await User.countDocuments({
      role: 'client',
      createdAt: {
        $gte: selectedMonthStart,
        $lt: selectedNextMonthStart
      }
    });

    const onsiteThisMonth = await NonUser.countDocuments({
      admittedAt: {
        $gte: selectedMonthStart,
        $lt: selectedNextMonthStart
      }
    });

    const totalPatientsThisMonth = registeredThisMonth + onsiteThisMonth;

    // Onsite patients admitted/discharged per month
    const admittedPerMonth = await NonUser.aggregate([
      { $match: { admittedAt: { $ne: null } } },
      { $group: { _id: { month: { $month: "$admittedAt" }, year: { $year: "$admittedAt" } }, patients: { $push: "$$ROOT" }, count: { $sum: 1 } } },
      { $sort: { "_id.year": -1, "_id.month": -1 } }
    ]);

    const dischargedPerMonth = await NonUser.aggregate([
      { $match: { dischargedAt: { $ne: null } } },
      { $group: { _id: { month: { $month: "$dischargedAt" }, year: { $year: "$dischargedAt" } }, patients: { $push: "$$ROOT" }, count: { $sum: 1 } } },
      { $sort: { "_id.year": -1, "_id.month": -1 } }
    ]);

    res.status(200).json({
      totals: {
        doctors: totalDoctors,
        nurses: totalNurses,
        registeredPatients: totalPatients,
        onsitePatients: totalOnsitePatients,
        registeredThisMonth,
        onsiteThisMonth,
        totalPatientsThisMonth,
        occupiedBeds,
        unoccupiedBeds,
        admittedToday,
        dischargedToday,
        registeredToday,
        totalBillsThisMonth
      },
      registeredPerDay,
      registeredPerMonth,
      admittedPerDay,
      admittedPerMonth,
      dischargedPerDay,
      dischargedPerMonth
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching admin stats', error });
  }
};

// Admin gets all billing records with filters
export const getBillingRecords = async (req, res) => {
  try {
    if (!['admin', 'nurse'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Only admin and nurses can view billing records.' });
    }

    const { patientId, nurseId, startDate, endDate } = req.query;

    // Build filter object
    const filter = {};
    if (patientId) filter.patient = patientId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Fetch billing records
    let records = await Billing.find(filter)
      .populate('patient', 'name email role')
      .populate({
        path: 'charges',
        select: 'description amount unit date'
      })
      .populate({
        path: 'paymentsandadjustments',
        select: 'description amount date'
      });

    // If nurse filter is applied, filter records by nurse who created them
    if (nurseId) {
      records = records.filter(r => r.createdBy?.toString() === nurseId);
    }

    res.status(200).json({
      message: 'Billing records retrieved successfully',
      count: records.length,
      records
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching billing records', error });
  }
};

export const getFinanceStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admin can view finance stats.' });
    }

    // --- Billing Totals ---
    const billingPerDay = await Billing.aggregate([
      {
        $group: {
          _id: {
            day: { $dayOfMonth: "$createdAt" },
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" }
          },
          totalCharges: { $sum: "$totalchaerges" },
          totalPayments: { $sum: "$totalpayment" },
          totalBalance: { $sum: "$balance" }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } }
    ]);

    const billingPerMonth = await Billing.aggregate([
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" }
          },
          totalCharges: { $sum: "$totalchaerges" },
          totalPayments: { $sum: "$totalpayment" },
          totalBalance: { $sum: "$balance" }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } }
    ]);

    // --- Appointment Totals ---
    const appointmentPerDay = await Appointment.aggregate([
      {
        $group: {
          _id: {
            day: { $dayOfMonth: "$date" },
            month: { $month: "$date" },
            year: { $year: "$date" }
          },
          totalFees: { $sum: "$fee" }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } }
    ]);

    const appointmentPerMonth = await Appointment.aggregate([
      {
        $group: {
          _id: {
            month: { $month: "$date" },
            year: { $year: "$date" }
          },
          totalFees: { $sum: "$fee" }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } }
    ]);

    res.status(200).json({
      billingPerDay,
      billingPerMonth,
      appointmentPerDay,
      appointmentPerMonth
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching finance stats', error });
  }
};



export const getDoctorsAndNurses = async (req, res) => {
  try {
    // Only admins can access
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Only admins can view staff list." });
    }

    const doctors = await Doctor.find({})
      .populate('account', 'name email role')
      .select('name email department role account createdAt');
    const nurses = await Nurse.find({}).select('name email ward role createdAt');

    const doctorList = doctors.map((doc) => ({
      _id: doc._id,
      name: doc.account?.name || doc.name || '',
      email: doc.account?.email || doc.email || '',
      role: doc.account?.role || doc.role || '',
      department: doc.department || 'N/A',
      createdAt: doc.createdAt
    }));

    res.status(200).json({
      doctors: doctorList,
      nurses,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching staff list", error: error.message });
  }
};
