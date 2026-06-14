import Department from '../model/department.js';
import Doctor from '../model/doctor.js';

// ── Create Department ─────────────────────────────────────────────────────────
export const createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Department name is required' });
    }
    const existing = await Department.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ message: 'A department with this name already exists' });
    }
    const dept = new Department({ name: name.trim(), description: description || '' });
    await dept.save();
    res.status(201).json({ message: 'Department created successfully', department: dept });
  } catch (error) {
    console.error('createDepartment error:', error);
    res.status(500).json({ message: 'Error creating department', error: error.message });
  }
};

// ── Get All Departments ───────────────────────────────────────────────────────
export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({})
      .populate({
        path: 'headOfDepartment',
        populate: { path: 'account', select: 'name email' }
      })
      .populate({
        path: 'doctors',
        populate: { path: 'account', select: 'name email' }
      })
      .sort({ name: 1 });

    // Normalize for easy frontend consumption
    const normalized = departments.map(d => ({
      _id: d._id,
      name: d.name,
      description: d.description,
      createdAt: d.createdAt,
      headOfDepartment: d.headOfDepartment
        ? {
            _id: d.headOfDepartment._id,
            name: d.headOfDepartment.account?.name || 'Unknown',
            email: d.headOfDepartment.account?.email || '',
            department: d.headOfDepartment.department || '',
            specialisation: d.headOfDepartment.specialisation || ''
          }
        : null,
      doctors: d.doctors.map(doc => ({
        _id: doc._id,
        name: doc.account?.name || 'Unknown',
        email: doc.account?.email || '',
        specialisation: doc.specialisation || '',
        department: doc.department || ''
      }))
    }));

    res.status(200).json({ departments: normalized });
  } catch (error) {
    console.error('getDepartments error:', error);
    res.status(500).json({ message: 'Error fetching departments', error: error.message });
  }
};

// ── Update Department (name, description, head, doctors) ─────────────────────
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, headOfDepartmentId, doctorIds } = req.body;

    const dept = await Department.findById(id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });

    const oldName = dept.name;
    const oldDoctors = dept.doctors || [];

    if (name && name.trim()) {
      // Ensure uniqueness when renaming
      const dup = await Department.findOne({ name: name.trim(), _id: { $ne: id } });
      if (dup) return res.status(409).json({ message: 'Another department with this name already exists' });
      dept.name = name.trim();
    }
    if (description !== undefined) dept.description = description;

    // Set head of department
    if (headOfDepartmentId !== undefined) {
      if (headOfDepartmentId === null || headOfDepartmentId === '') {
        dept.headOfDepartment = null;
      } else {
        const headDoc = await Doctor.findById(headOfDepartmentId);
        if (!headDoc) return res.status(404).json({ message: 'Doctor (head) not found' });
        dept.headOfDepartment = headOfDepartmentId;
      }
    }

    // Replace doctors list
    if (Array.isArray(doctorIds)) {
      dept.doctors = doctorIds;
    }

    await dept.save();

    const newName = dept.name;

    // Sync Doctor documents
    if (Array.isArray(doctorIds)) {
      const removedDoctors = oldDoctors.filter(dId => !doctorIds.map(i => i.toString()).includes(dId.toString()));
      if (removedDoctors.length > 0) {
        await Doctor.updateMany({ _id: { $in: removedDoctors } }, { department: '' });
      }
      if (doctorIds.length > 0) {
        await Doctor.updateMany({ _id: { $in: doctorIds } }, { department: newName });
      }
    } else if (newName !== oldName && oldDoctors.length > 0) {
      await Doctor.updateMany({ _id: { $in: oldDoctors } }, { department: newName });
    }

    if (headOfDepartmentId) {
      await Doctor.findByIdAndUpdate(headOfDepartmentId, { department: newName });
    }

    // Return populated version
    const updated = await Department.findById(id)
      .populate({ path: 'headOfDepartment', populate: { path: 'account', select: 'name email' } })
      .populate({ path: 'doctors', populate: { path: 'account', select: 'name email' } });

    res.status(200).json({ message: 'Department updated successfully', department: updated });
  } catch (error) {
    console.error('updateDepartment error:', error);
    res.status(500).json({ message: 'Error updating department', error: error.message });
  }
};

// ── Delete Department ─────────────────────────────────────────────────────────
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const dept = await Department.findById(id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });

    // Clear department string on all doctors in this department
    const doctorIds = dept.doctors || [];
    if (doctorIds.length > 0) {
      await Doctor.updateMany({ _id: { $in: doctorIds } }, { department: '' });
    }
    if (dept.headOfDepartment) {
      await Doctor.findByIdAndUpdate(dept.headOfDepartment, { department: '' });
    }

    await Department.findByIdAndDelete(id);
    res.status(200).json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('deleteDepartment error:', error);
    res.status(500).json({ message: 'Error deleting department', error: error.message });
  }
};
