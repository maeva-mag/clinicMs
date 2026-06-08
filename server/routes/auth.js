import express from 'express';
import { authenticateToken, allowRoles } from '../middlewares/auth.js';
import { login, setStaffPassword } from '../controllers/authentication.js';
const router = express.Router();
router.post('/set-password', setStaffPassword, allowRoles([ 'doctor', 'nurse']));
router.post('/login', login, allowRoles([ 'doctor', 'nurse']));
export default router;