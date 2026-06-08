import express from 'express';
import { authenticateToken, allowRoles } from '../middlewares/auth.js';
import { login, setStaffPassword, getClientDetails } from '../controllers/authentication.js';
import {getMedicalHistory} from '../controllers/patient.js';
import { updateMedicalHistory } from '../controllers/medicalHis.js';
import { getAllPatients } from '../controllers/nurse.js';
import { getDoctorPrescriptions, updateDoctorProfile, getDoctorProfile, getDoctorAppointments } from '../controllers/doctor.js';


const router = express.Router();
router.post('/login', login);
router.get('/getClientDetails', authenticateToken, getClientDetails);
router.get('/patients', authenticateToken, allowRoles(['admin', 'nurse', 'doctor']), getAllPatients);
router.get('/doctorProfile/:doctorId', authenticateToken, allowRoles(['admin', 'doctor']), getDoctorProfile);
router.get('/doctorPrescriptions/:doctorId', authenticateToken, allowRoles(['admin', 'doctor']), getDoctorPrescriptions);
router.get('/doctorAppointments/:doctorId', authenticateToken, allowRoles(['admin', 'doctor']), getDoctorAppointments);
router.put('/doctorProfile/:doctorId', authenticateToken, allowRoles(['admin', 'doctor']), updateDoctorProfile);
router.get('/medicalHistory/:userId', authenticateToken, allowRoles(['admin', 'doctor', 'nurse', 'client']), getMedicalHistory);
router.put('/medicalHistory/:userId', authenticateToken, allowRoles([ 'doctor', 'nurse']), updateMedicalHistory);
export default router;