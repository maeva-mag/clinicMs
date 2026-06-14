import express from 'express';
import { authenticateToken, allowRoles } from '../middlewares/auth.js';
import { register, patientLogin, getClientDetails, } from '../controllers/authentication.js';
import { 
    createProfile, 
    getUserProfile, 
    updateUserProfile,
    getMedicalHistory,
    makeAppointment, 
    getAppointments, 
    cancelAppointment, 
    getPatientBills } from '../controllers/patient.js';

const router = express.Router();

router.post('/login', patientLogin);
router.post('/register', register);
router.get('/getClientDetails', authenticateToken, getClientDetails);


router.post('/profile/:userId', authenticateToken, allowRoles(['client']), createProfile);
router.get('/profile/:userId', authenticateToken, allowRoles(['admin', 'doctor', 'nurse', 'client']), getUserProfile);
router.put('/profile/:userId', authenticateToken, allowRoles(['client']), updateUserProfile);

router.get('/medicalHistory/:userId', authenticateToken, allowRoles(['admin', 'doctor', 'nurse', 'client']), getMedicalHistory);

router.post('/appointments/:userId', authenticateToken, allowRoles(['client']), makeAppointment);
router.get('/appointments/:userId', authenticateToken, allowRoles(['admin', 'doctor', 'nurse', 'client']), getAppointments);
router.delete('/appointments/:userId/:appointmentId', authenticateToken, allowRoles(['client', 'admin']), cancelAppointment);

router.get('/bills/:userId', authenticateToken, allowRoles(['client', 'admin', 'doctor', 'nurse']), getPatientBills);
export default router;