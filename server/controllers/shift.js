import Shift from "../model/shift.js";
import Doctor from "../model/doctor.js";
import Nurse from "../model/nurse.js";

// Create or update a shift (Admin only)
export const createShift = async (req, res) => {
  try {
    const { staffType, staffId, day, shiftType, startTime, endTime, notes } = req.body;

    if (!staffType || !staffId || !day || !shiftType || !startTime || !endTime) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if staff member exists
    let staffMember;
    if (staffType === 'doctor') {
      staffMember = await Doctor.findById(staffId);
    } else {
      staffMember = await Nurse.findById(staffId);
    }

    if (!staffMember) {
      return res.status(404).json({ message: `${staffType} not found` });
    }

    // Prepare shift data
    const shiftData = {
      staffType,
      day,
      shiftType,
      startTime,
      endTime,
      notes: notes || ""
    };

    if (staffType === 'doctor') {
      shiftData.doctor = staffId;
    } else {
      shiftData.nurse = staffId;
    }

    // Check if a shift already exists for this staff member on this day
    const query = { day };
    if (staffType === 'doctor') {
      query.doctor = staffId;
    } else {
      query.nurse = staffId;
    }

    const existingShift = await Shift.findOne(query);
    if (existingShift) {
      // Update existing
      existingShift.shiftType = shiftType;
      existingShift.startTime = startTime;
      existingShift.endTime = endTime;
      existingShift.notes = notes || "";
      await existingShift.save();
      return res.status(200).json({ message: "Shift updated successfully", shift: existingShift });
    }

    const newShift = new Shift(shiftData);
    await newShift.save();
    res.status(201).json({ message: "Shift created successfully", shift: newShift });
  } catch (error) {
    res.status(500).json({ message: "Error scheduling shift", error: error.message });
  }
};

// Get all shifts (general weekly timetable)
export const getShifts = async (req, res) => {
  try {
    const shifts = await Shift.find({})
      .populate('doctor', 'name email department')
      .populate('nurse', 'name email ward');
    res.status(200).json({ shifts });
  } catch (error) {
    res.status(500).json({ message: "Error fetching shifts", error: error.message });
  }
};

// Get personal shifts for logged-in doctor/nurse
export const getPersonalShifts = async (req, res) => {
  try {
    const { userId, role } = req.user;

    if (!['doctor', 'nurse'].includes(role)) {
      return res.status(400).json({ message: "Invalid role for personal shift timetable" });
    }

    const query = {};
    if (role === 'doctor') {
      query.doctor = userId;
    } else {
      query.nurse = userId;
    }

    const shifts = await Shift.find(query)
      .populate('doctor', 'name email department')
      .populate('nurse', 'name email ward');

    res.status(200).json({ shifts });
  } catch (error) {
    res.status(500).json({ message: "Error fetching personal shifts", error: error.message });
  }
};

// Delete a shift (Admin only)
export const deleteShift = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedShift = await Shift.findByIdAndDelete(id);
    if (!deletedShift) {
      return res.status(404).json({ message: "Shift not found" });
    }
    res.status(200).json({ message: "Shift deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting shift", error: error.message });
  }
};
