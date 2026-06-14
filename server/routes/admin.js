import express from 'express';
import { createAdminAccount, adminLogin, createStaffAccount, getAdminStats, getBillingRecords, getDoctorsAndNurses, getEpidemiologyStats, getAllPills, getAdminProfile, updateAdminProfile } from '../controllers/admin.js';
import { authenticateToken, allowRoles } from '../middlewares/auth.js';
import { getAllPatients } from '../controllers/nurse.js';
import admin from '../model/admin.js';


const router = express.Router();

// Only existing admins can create new admin or staff accounts
router.post('/create-admin', createAdminAccount);
router.post('/login', adminLogin);
router.post('/create-staff', authenticateToken, allowRoles(['admin']), createStaffAccount);
router.get('/stats', authenticateToken, allowRoles(['admin']), getAdminStats);
router.get('/billing', authenticateToken, allowRoles(['admin', 'nurse']), getBillingRecords);
router.get('/patients', authenticateToken, allowRoles(['admin', 'nurse', 'doctor']), getAllPatients)
router.get('/staff', authenticateToken, allowRoles(['admin']), getDoctorsAndNurses);
router.get('/epidemiology', authenticateToken, allowRoles(['admin']), getEpidemiologyStats);
router.get('/pills', authenticateToken, allowRoles(['admin']), getAllPills);
router.get('/profile', authenticateToken, allowRoles(['admin']), getAdminProfile);
router.put('/profile', authenticateToken, allowRoles(['admin']), updateAdminProfile);
export default router;
