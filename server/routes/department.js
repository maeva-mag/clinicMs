import express from 'express';
import { createDepartment, getDepartments, updateDepartment, deleteDepartment } from '../controllers/department.js';
import { authenticateToken, allowRoles } from '../middlewares/auth.js';

const router = express.Router();

router.post('/', authenticateToken, allowRoles(['admin']), createDepartment);
router.get('/', authenticateToken, getDepartments);
router.put('/:id', authenticateToken, allowRoles(['admin']), updateDepartment);
router.delete('/:id', authenticateToken, allowRoles(['admin']), deleteDepartment);

export default router;
