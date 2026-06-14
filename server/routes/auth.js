import express from 'express';
import { login, setStaffPassword } from '../controllers/authentication.js';

const router = express.Router();

router.post('/set-password', setStaffPassword);
router.post('/login', login);

export default router;