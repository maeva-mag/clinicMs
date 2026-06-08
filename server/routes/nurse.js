import express from 'express';
import { authenticateToken, allowRoles } from '../middlewares/auth.js';
import { login, setStaffPassword, getClientDetails } from '../controllers/authentication.js';
import {getMedicalHistory} from '../controllers/patient.js';
import { updateMedicalHistory } from '../controllers/medicalHis.js';
import { updateNurseProfile, getNurseProfile, registerOnsitePatient, admitPatient,dischargePatient, createBilling,addCharge, addPayment, allocateBed, releaseBed, getAllPatients} from '../controllers/nurse.js';

const router = express.Router();
router.get('/getClientDetails', authenticateToken, getClientDetails);
router.get('/medicalHistory/:userId', authenticateToken, allowRoles(['admin', 'doctor', 'nurse', 'client']), getMedicalHistory);
router.put('/medicalHistory/:userId', authenticateToken, allowRoles([ 'doctor', 'nurse']), updateMedicalHistory);
router.put('/nurseProfile/:nurseId', authenticateToken, allowRoles(['admin', 'nurse']), updateNurseProfile);
router.get('/nurseProfile/:nurseId', authenticateToken, allowRoles(['admin', 'nurse']), getNurseProfile);

router.post('/patients/onsite', authenticateToken, allowRoles(['admin', 'nurse']), registerOnsitePatient);
router.get('/patients', authenticateToken, allowRoles(['admin', 'nurse', 'doctor']), getAllPatients);
router.put('/patients/:patientId/admit', authenticateToken, allowRoles(['admin', 'nurse']), admitPatient);
router.put('/patients/:patientId/discharge', authenticateToken, allowRoles(['admin', 'nurse']), dischargePatient);

router.post('/billing', authenticateToken, allowRoles(['admin', 'nurse']), createBilling);
router.post('/billing/:billingId/charges', authenticateToken, allowRoles(['admin', 'nurse']), addCharge);
router.post('/billing/:billingId/payments', authenticateToken, allowRoles(['admin', 'nurse']), addPayment);

router.post('/patients/:patientId/bed', authenticateToken, allowRoles(['admin', 'nurse']), allocateBed);
router.delete('/patients/:patientId/bed', authenticateToken, allowRoles(['admin', 'nurse']), releaseBed);
export default router;