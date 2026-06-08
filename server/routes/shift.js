import express from 'express';
import { authenticateToken, allowRoles } from '../middlewares/auth.js';
import { createShift, getShifts, getPersonalShifts, deleteShift } from '../controllers/shift.js';

const router = express.Router();

// Get all shifts (general weekly timetable) - accessible by admin, doctor, and nurse
router.get('/', authenticateToken, allowRoles(['admin', 'doctor', 'nurse']), getShifts);

// Get personal shifts - accessible by doctor and nurse
router.get('/personal', authenticateToken, allowRoles(['doctor', 'nurse']), getPersonalShifts);

// Create or update a shift - accessible by admin only
router.post('/', authenticateToken, allowRoles(['admin']), createShift);

// Delete a shift - accessible by admin only
router.delete('/:id', authenticateToken, allowRoles(['admin']), deleteShift);

export default router;
