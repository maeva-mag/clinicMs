import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../model/user.js';
import Admin from '../model/admin.js';
import Doctor from '../model/doctor.js';
import Nurse from '../model/nurse.js';
// import dotenv from 'dotenv';

// dotenv.config();

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Register client (Patient)
export const register = async (req, res) => {
    try {
        const { name, age, gender, bloodType, telephone, address, emergencyContact, email, password, allergies,confirmPassword } = req.body;
        if (!email || !password || !name || !age || !gender || !bloodType || !telephone || !address || !emergencyContact) {
            return res.status(400).json({ message: 'All required fields must be provided.' });
        }

        if (password !== confirmPassword) {
            return res.status(402).json({ message: 'Passwords do not match.' });
        }

        if (!isValidEmail(email)) {
            return res.status(401).json({ message: 'Invalid email format' });
        }

        // Check across all models to prevent email duplication
        const existingUser = await User.findOne({ email });
        

        if (existingUser ) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            age,
            allergies: Array.isArray(allergies) ? allergies : (allergies ? [allergies] : []),
            gender,
            bloodType,
            telephone,
            address,
            emergencyContact,
            role: 'client',
        });

        await newUser.save();
        const token = jwt.sign({ userId: newUser._id, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        res.status(201).json({ message: 'User registered successfully', token, userId: newUser._id, role: newUser.role });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user' });
    }
};
export const patientLogin = async (req, res) => {
    try{
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }
        const patient = await User.findOne({ email });
        if (!patient) {
            return res.status(403).json({ message: 'Account does not exist.' });
        }
        const isMatch = await bcrypt.compare(password, patient.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid password' });
        }
        const token = jwt.sign({ userId: patient._id, role: patient.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ message: 'Login successful', token, userId: patient._id, name: patient.name, email: patient.email, role: patient.role });
    } catch (error) {
        res.status(500).json({ message: 'Error during login' });
    }
};

// Unified Login for Patients, Admin, Doctors, and Nurses
export const login = async (req, res) => {
    try {
       const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }
        const models= [Admin, Doctor, Nurse, ];
        let user = null;
        for (const model of models) {
            user = await model.findOne({ email });
            if (user) break;
        }
        if (!user) {
            return res.status(402).json({ message: 'Account does not exist.' });
        }
        if (user.mustSetPassword){
            return res.status(403).json({ 
                message: 'First-time login detected. Please set your password.',
                mustSetPassword: true,
                userId: user._id,
                role: user.role,
                name: user.name,
            
            });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid password' });
        }
         const token = jwt.sign({ userId: user._id, role: user.role },
             process.env.JWT_SECRET,
              { expiresIn: '1h' });

        res.status(200).json({
             message: 'Login successful',
             token,
             userId: user._id.toString(),
             name: user.name,
             email: user.email,
             role: user.role 
            });

    } catch (error) {
        res.status(500).json({ message: 'Error during login' });
    }
};

// First-time Password Setup for Staff (Admin, Doctor, Nurse)
export const setStaffPassword = async (req, res) => {
    try {
        //const { staffId } = req.params;
        const {email, password, confirmPassword} = req.body;

        // Search in all staff-related models
        let staff = await Admin.findOne({ email });
        if (!staff) staff = await Doctor.findOne({ email });
        if (!staff) staff = await Nurse.findOne({ email });

        if (!staff) return res.status(404).json({ message: 'Staff member not found' });

        if (!staff.mustSetPassword) {
            return res.status(400).json({ message: 'Password already set. Please use normal login.' });
        }
        if (!password || !confirmPassword) {
            return res.status(401).json({ message: 'Password and confirm password are required.' });
        }
        if (password !== confirmPassword) {
            return res.status(402).json({ message: 'Passwords do not match.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        staff.password = hashedPassword;
        staff.mustSetPassword = false;
        await staff.save();

        res.status(200).json({ message: 'Password set successfully. You can now log in.', user: staff });
    } catch (error) {
        res.status(500).json({ message: 'Error setting password' });
    }
};

// Get profile details (Unified)
export const getClientDetails = async (req, res) => {
  try {
    // Only doctor, nurse, or admin can access this endpoint
    if (!['doctor', 'nurse', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Only doctor, nurse, or admin can view user details.' });
    }

    // Get client name from request query
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ message: 'Patient name is required' });
    }

    // Find user by name (case-insensitive)
    const user = await User.findOne({ name: new RegExp(`^${name}$`, 'i') }).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user details' });
  }
};
