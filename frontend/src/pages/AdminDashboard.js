import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import './AdminDashboard.css';
import { FaTachometerAlt, FaUserMd, FaUserInjured, FaFileInvoiceDollar, FaSignOutAlt, FaUser, FaSearch, FaBuilding, FaDownload, FaUserPlus, FaUserNurse, FaCalendarAlt, FaEnvelope, FaIdBadge } from "react-icons/fa";
import logo from '../assets/clinic-logo.jpg';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title } from 'chart.js';
import { Pie, Bar, Doughnut, Line } from 'react-chartjs-2';
import { FaVirus } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  const adminName = localStorage.getItem('name');

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [billing, setBilling] = useState([]);
  const [patients, setPatients] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [newDeptForm, setNewDeptForm] = useState({ name: '', description: '' });

  // ── Health / Epidemiology stats state ──────────────────────────────────
  const [epiStats, setEpiStats] = useState(null);
  const [epiLoading, setEpiLoading] = useState(false);
  const [epiError, setEpiError] = useState('');
  const [epiMonth, setEpiMonth] = useState(String(new Date().getMonth() + 1));
  const [epiYear, setEpiYear] = useState(String(new Date().getFullYear()));
  const [epiSelectedCondition, setEpiSelectedCondition] = useState('');
  const [staffData, setStaffData] = useState({ doctors: [], nurses: [] });
  const [staffView, setStaffView] = useState('none'); // 'none', 'form', 'doctors', 'nurses', 'shifts'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [dateOptions, setDateOptions] = useState([]);
  const [monthOptions, setMonthOptions] = useState([]);

  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    role: 'doctor'
  });
  const [showProfileTab, setShowProfileTab] = useState(false);
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    telephone: '',
    address: '',
    gender: '',
    profilepicture: ''
  });

  const [shifts, setShifts] = useState([]);
  const [shiftForm, setShiftForm] = useState({
    staffType: 'doctor',
    staffId: '',
    day: 'Monday',
    shiftType: 'Morning',
    startTime: '08:00',
    endTime: '16:00',
    notes: ''
  });

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [viewingPatientId, setViewingPatientId] = useState(null);
  const [viewingPatientData, setViewingPatientData] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [viewingPatientLoading, setViewingPatientLoading] = useState(false);

  const [viewingStaffData, setViewingStaffData] = useState(null);
  const [viewingStaffLoading, setViewingStaffLoading] = useState(false);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (val.trim().length > 0) {
      const filtered = patients.filter(p => p.name && p.name.toLowerCase().includes(val.toLowerCase()));
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  const handleViewPatientDashboard = async (patientId) => {
    setViewingPatientLoading(true);
    setError('');
    try {
      const [profileRes, appointmentsRes, historyRes, billsRes] = await Promise.all([
        API.get(`/patients/profile/${patientId}`),
        API.get(`/patients/appointments/${patientId}`),
        API.get(`/patients/medicalHistory/${patientId}`),
        API.get(`/patients/bills/${patientId}`)
      ]);
      setViewingPatientData({
        profile: profileRes.data.user,
        appointments: appointmentsRes.data.appointments || [],
        medicalHistory: historyRes.data.medicalHistory,
        bills: billsRes.data.bills || []
      });
      setViewingPatientId(patientId);
    } catch (err) {
      console.error('Error loading patient dashboard:', err);
      setError('Failed to load patient dashboard');
    } finally {
      setViewingPatientLoading(false);
    }
  };

  const handleViewStaffDashboard = async (staffId, staffType) => {
    setViewingStaffLoading(true);
    setError('');
    try {
      let profileRes, appointmentsRes, shiftsRes;
      if (staffType === 'doctor') {
        [profileRes, appointmentsRes, shiftsRes] = await Promise.all([
          API.get(`/doctors/doctorProfile/${staffId}`),
          API.get(`/doctors/doctorAppointments/${staffId}`),
          API.get('/shifts')
        ]);
        const doctor = profileRes.data.doctor;
        const allShifts = shiftsRes.data.shifts || [];
        const personalShifts = allShifts.filter(s => s.staffType === 'doctor' && (s.doctor?._id === staffId || s.doctor === staffId));
        setViewingStaffData({
          type: 'doctor',
          profile: {
            name: doctor.account?.name || doctor.name,
            email: doctor.account?.email || doctor.email,
            role: doctor.account?.role || doctor.role || 'doctor',
            department: doctor.department || 'N/A',
            specialisation: doctor.specialisation || 'N/A',
            gender: doctor.gender || 'N/A',
            telephone: doctor.telephone || 'N/A',
            address: doctor.address || 'N/A',
            profilepicture: doctor.profilepicture || null,
            active: doctor.active,
            createdAt: doctor.createdAt,
          },
          appointments: appointmentsRes.data.appointments || [],
          shifts: personalShifts,
        });
      } else {
        [profileRes, shiftsRes] = await Promise.all([
          API.get(`/nurses/nurseProfile/${staffId}`),
          API.get('/shifts')
        ]);
        const nurse = profileRes.data.nurse;
        const allShifts = shiftsRes.data.shifts || [];
        const personalShifts = allShifts.filter(s => s.staffType === 'nurse' && (s.nurse?._id === staffId || s.nurse === staffId));
        setViewingStaffData({
          type: 'nurse',
          profile: {
            name: nurse.name,
            email: nurse.email,
            role: nurse.role || 'nurse',
            ward: nurse.ward || 'N/A',
            gender: nurse.gender || 'N/A',
            telephone: nurse.telephone || 'N/A',
            address: nurse.address || 'N/A',
            profilepicture: nurse.profilepicture || null,
            active: nurse.active,
            createdAt: nurse.createdAt,
          },
          appointments: [],
          shifts: personalShifts,
        });
      }
    } catch (err) {
      console.error('Error loading staff dashboard:', err);
      setError('Failed to load staff dashboard');
    } finally {
      setViewingStaffLoading(false);
    }
  };

  useEffect(() => {
    const options = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const formattedValue = date.toISOString().slice(0, 10);
      const label = i === 0 ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      options.push({ label, value: formattedValue });
    }
    setDateOptions(options);

    const monthList = [];
    const monthDate = new Date();
    for (let i = 0; i < 12; i++) {
      const value = monthDate.toISOString().slice(0, 7);
      const label = monthDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
      monthList.push({ label, value });
      monthDate.setMonth(monthDate.getMonth() - 1);
    }
    setMonthOptions(monthList);
  }, []);

  useEffect(() => {
    if (!token || userRole !== 'admin') {
      navigate('/staffLogin');
      return;
    }
  }, [token, userRole, navigate]);

  const fetchStats = async (date, month) => {
    setLoading(true);
    try {
      const query = [];
      if (date) query.push(`date=${date}`);
      if (month) query.push(`month=${month}`);
      const queryString = query.length ? `?${query.join('&')}` : '';
      const res = await API.get(`/admin/stats${queryString}`);
      setStats(res.data);
      setError('');
    } catch (err) {
      setError('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  const fetchBilling = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/billing');
      setBilling(res.data.records || []);
      setError('');
    } catch (err) {
      setError('Failed to load billing records');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/patients');
      setPatients(res.data.patients || []);
      setError('');
    } catch (err) {
      setError('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/staff');
      setStaffData(res.data);
      setError('');
    } catch (err) {
      setError('Failed to load staff list');
    } finally {
      setLoading(false);
    }
  };

  const fetchShifts = async () => {
    try {
      const res = await API.get('/shifts');
      setShifts(res.data.shifts || []);
      setError('');
    } catch (err) {
      setError('Failed to load shift timetable');
    }
  };

  const fetchEpidemiology = async (month, year) => {
    setEpiLoading(true);
    setEpiError('');
    try {
      const params = new URLSearchParams();
      if (month) params.append('month', month);
      if (year)  params.append('year', year);
      const res = await API.get(`/admin/epidemiology?${params.toString()}`);
      setEpiStats(res.data);
      if (res.data.conditions && res.data.conditions.length > 0) {
        setEpiSelectedCondition(prev => prev || res.data.conditions[0].condition);
      }
    } catch (err) {
      setEpiError('Failed to load health statistics');
    } finally {
      setEpiLoading(false);
    }
  };

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await API.get('/departments');
      setDepartments(res.data.departments || []);
      setError('');
    } catch (err) {
      setError('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptForm.name.trim()) return;
    setLoading(true);
    try {
      await API.post('/departments', newDeptForm);
      setSuccess('Department created successfully');
      setNewDeptForm({ name: '', description: '' });
      fetchDepartments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create department');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDepartmentDetails = async (deptId, name, description, headId, docIds) => {
    setLoading(true);
    try {
      await API.put(`/departments/${deptId}`, {
        name,
        description,
        headOfDepartmentId: headId,
        doctorIds: docIds
      });
      setSuccess('Department updated successfully');
      fetchDepartments();
      fetchStaff();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update department');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDepartment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this department?")) return;
    setLoading(true);
    try {
      await API.delete(`/departments/${id}`);
      setSuccess('Department deleted successfully');
      fetchDepartments();
      fetchStaff();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete department');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ── PDF Generation Helpers & Functions ──────────────────────────────────
  const addPDFHeader = (doc, title) => {
    doc.setFillColor(30, 61, 122);
    doc.rect(0, 0, doc.internal.pageSize.width, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("JHC Clinic Management System", 14, 16);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, doc.internal.pageSize.width - 70, 16);
    
    doc.setTextColor(30, 61, 122);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 38);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 42, doc.internal.pageSize.width - 14, 42);
  };

  const downloadPatientsPDF = () => {
    if (patients.length === 0) {
      alert("No patient data available to download.");
      return;
    }
    const doc = new jsPDF();
    addPDFHeader(doc, "PATIENT RECORDS LIST");
    
    const tableData = patients.map((p, idx) => [
      idx + 1,
      p.name || 'N/A',
      p.age || 'N/A',
      p.gender || 'N/A',
      p.bloodType || 'N/A',
      p.telephone || 'N/A',
      p.email || 'N/A',
      p.patientType || 'Registered',
      p.registeredOn ? (new Date(p.registeredOn).toLocaleDateString() + ' ' + new Date(p.registeredOn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : 'N/A'
    ]);
    
    autoTable(doc, {
      startY: 48,
      head: [['#', 'Name', 'Age', 'Gender', 'Blood Type', 'Phone', 'Email', 'Type', 'Registered On']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [30, 61, 122] },
      styles: { fontSize: 8 }
    });
    
    doc.save("JHC_Patients_List.pdf");
  };

  const downloadDoctorsOnlyPDF = () => {
    if (staffData.doctors.length === 0) {
      alert("No doctor data available to download.");
      return;
    }
    const doc = new jsPDF();
    addPDFHeader(doc, "STAFF DIRECTORY - DOCTORS");
    
    const tableData = staffData.doctors.map((d, idx) => [
      idx + 1,
      d.account?.name || d.name || 'Unknown',
      d.account?.email || d.email || 'N/A',
      d.account?.role || d.role || 'doctor',
      d.department || 'N/A',
      d.createdAt ? (new Date(d.createdAt).toLocaleDateString() + ' ' + new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : 'N/A'
    ]);
    
    autoTable(doc, {
      startY: 48,
      head: [['#', 'Name', 'Email', 'Role', 'Department', 'Date Joined']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [30, 61, 122] },
      styles: { fontSize: 10 }
    });
    
    doc.save("doctors_list.pdf");
  };


  const downloadNursesOnlyPDF = () => {
    if (staffData.nurses.length === 0) {
      alert("No nurse data available to download.");
      return;
    }
    const doc = new jsPDF();
    addPDFHeader(doc, "STAFF DIRECTORY - NURSES");
    
    const tableData = staffData.nurses.map((n, idx) => [
      idx + 1,
      n.name || 'N/A',
      n.email || 'N/A',
      'Nurse',
      n.ward || 'N/A',
      n.createdAt ? (new Date(n.createdAt).toLocaleDateString() + ' ' + new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : 'N/A'
    ]);
    
    autoTable(doc, {
      startY: 48,
      head: [['#', 'Name', 'Email', 'Role', 'Ward', 'Date Joined']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [30, 61, 122] },
      styles: { fontSize: 10 }
    });
    
    doc.save("nurses_list.pdf");
  };

  const downloadInvoicePDF = (bill) => {
    const doc = new jsPDF();

    // Custom branded header for invoice
    doc.setFillColor(33, 150, 83); // Green theme color of the clinic
    doc.rect(0, 0, doc.internal.pageSize.width, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("JHC CLINIC - INVOICE", 14, 16);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice Date: ${new Date(bill.createdAt || Date.now()).toLocaleDateString()}`, doc.internal.pageSize.width - 70, 16);

    // Bill Info
    doc.setTextColor(30, 61, 122);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Patient Invoice Summary`, 14, 38);

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 42, doc.internal.pageSize.width - 14, 42);

    // Patient Details
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("BILL TO:", 14, 50);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Patient Name: ${bill.patientName || bill.patient?.name || 'N/A'}`, 14, 56);
    doc.text(`Email Address: ${bill.patient?.email || 'N/A'}`, 14, 62);
    doc.text(`Patient Type: ${bill.patientModel === 'NonUser' ? 'Onsite' : bill.patientModel === 'User' ? 'Registered' : 'N/A'}`, 14, 68);

    // Charges Table
    const tableData = (bill.charges || []).map((c, idx) => [
      idx + 1,
      c.description,
      c.unit || 'FCFA',
      `${c.amount.toLocaleString()} FCFA`
    ]);

    doc.setFont('helvetica', 'bold');
    doc.text("INVOICE CHARGES & EXPENDITURES", 14, 80);

    autoTable(doc, {
      startY: 84,
      head: [['#', 'Item Description', 'Unit', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [33, 150, 83] }, // clinic green
      margin: { left: 14, right: 14 }
    });

    const nextY = doc.previousAutoTable.finalY + 12;

    // Payments Table
    const paymentData = (bill.paymentsandadjustments || []).map((p, idx) => [
      idx + 1,
      p.description,
      `${p.amount.toLocaleString()} FCFA`
    ]);

    if (paymentData.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text("PAYMENTS & ADJUSTMENTS", 14, nextY);

      autoTable(doc, {
        startY: nextY + 4,
        head: [['#', 'Payment Details', 'Amount Paid']],
        body: paymentData,
        theme: 'striped',
        headStyles: { fillColor: [47, 109, 255] }, // blue theme accent
        margin: { left: 14, right: 14 }
      });
    }

    const finalY = doc.previousAutoTable.finalY + 15;

    // Summary block on the right
    const summaryX = doc.internal.pageSize.width - 90;
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Expenditures:`, summaryX, finalY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${bill.totalcharges.toLocaleString()} FCFA`, summaryX + 50, finalY);

    doc.setFont('helvetica', 'normal');
    doc.text(`Total Payments:`, summaryX, finalY + 6);
    doc.setFont('helvetica', 'bold');
    doc.text(`${bill.totalpayment.toLocaleString()} FCFA`, summaryX + 50, finalY + 6);

    // Line separator
    doc.setDrawColor(200, 200, 200);
    doc.line(summaryX, finalY + 10, doc.internal.pageSize.width - 14, finalY + 10);

    // Balance Due
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`BALANCE DUE:`, summaryX, finalY + 16);
    doc.setTextColor(bill.balance > 0 ? 239 : 33, bill.balance > 0 ? 68 : 150, bill.balance > 0 ? 68 : 83); // red if balance due, green if paid
    doc.text(`${bill.balance.toLocaleString()} FCFA`, summaryX + 50, finalY + 16);

    // Prepared by section (at the end of PDF)
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`By Nurse: Nurse ${bill.createdBy?.name || 'Staff'}`, 14, finalY + 30);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date & Time: ${new Date(bill.createdAt || Date.now()).toLocaleString()}`, 14, finalY + 36);

    // Footer message
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text("Thank you for choosing JHC Clinic. Get well soon!", doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 20, { align: 'center' });

    // Save
    doc.save(`invoice_${bill._id || 'new'}.pdf`);
  };

  // eslint-disable-next-line no-unused-vars
  const downloadPillsPDF = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/pills');
      const pillsList = res.data.pills || [];
      if (pillsList.length === 0) {
        alert("No prescribed medication data available to download.");
        return;
      }
      
      const doc = new jsPDF();
      addPDFHeader(doc, "PRESCRIBED MEDICATIONS & PILLS INVENTORY REPORT");
      
      const tableData = pillsList.map((p, idx) => [
        idx + 1,
        p.pillName,
        p.dosage,
        p.frequency,
        p.patientName,
        p.condition,
        p.prescribedDate
      ]);
      
      autoTable(doc, {
        startY: 48,
        head: [['#', 'Pill Name', 'Dosage', 'Frequency', 'Patient Name', 'Condition', 'Date Prescribed']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [30, 61, 122] },
        styles: { fontSize: 9 }
      });
      
      doc.save("JHC_Pills_Prescriptions_Report.pdf");
    } catch (err) {
      console.error(err);
      setError('Failed to download pills report');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const downloadStatsPDF = () => {
    if (!epiStats || epiStats.conditions.length === 0) {
      alert("No epidemiology stats available to download.");
      return;
    }
    const doc = new jsPDF();
    addPDFHeader(doc, `EPIDEMIOLOGY & CLINIC HEALTH STATISTICS REPORT (${epiMonth}/${epiYear})`);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(`Total Recorded Diagnoses for this Period: ${epiStats.totalDiagnoses}`, 14, 50);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Disease / Sickness Percentage Distribution", 14, 62);
    
    const condTable = epiStats.conditions.map((c, idx) => [
      idx + 1,
      c.condition,
      c.count,
      `${c.percentage}%`
    ]);
    
    autoTable(doc, {
      startY: 66,
      head: [['#', 'Condition Name', 'Number of Cases', 'Percentage of Total']],
      body: condTable,
      theme: 'grid',
      headStyles: { fillColor: [30, 61, 122] },
      styles: { fontSize: 10 }
    });
    
    const nextY = doc.previousAutoTable.finalY + 12;
    doc.setFont('helvetica', 'bold');
    doc.text("Gender Breakdown per Sickness", 14, nextY);
    
    const genderTable = epiStats.genderBreakdown.map((g, idx) => [
      idx + 1,
      g.condition,
      `${g.Male} (${g.malePct}%)`,
      `${g.Female} (${g.femalePct}%)`
    ]);
    
    autoTable(doc, {
      startY: nextY + 4,
      head: [['#', 'Condition', 'Male Cases (%)', 'Female Cases (%)']],
      body: genderTable,
      theme: 'grid',
      headStyles: { fillColor: [30, 61, 122] },
      styles: { fontSize: 10 }
    });
    
    doc.save(`JHC_Epidemiology_Stats_${epiMonth}_${epiYear}.pdf`);
  };

  const handleShiftTypeChange = (type) => {
    let start = '08:00';
    let end = '16:00';
    if (type === 'Afternoon') {
      start = '16:00';
      end = '00:00';
    } else if (type === 'Night') {
      start = '00:00';
      end = '08:00';
    }
    setShiftForm(prev => ({
      ...prev,
      shiftType: type,
      startTime: start,
      endTime: end
    }));
  };

  const handleCreateShift = async (e) => {
    e.preventDefault();
    if (!shiftForm.staffId) {
      setError('Please select a staff member');
      return;
    }
    setLoading(true);
    try {
      const res = await API.post('/shifts', shiftForm);
      setSuccess(res.data.message || 'Shift scheduled successfully!');
      fetchShifts();
      setShiftForm({
        staffType: 'doctor',
        staffId: '',
        day: 'Monday',
        shiftType: 'Morning',
        startTime: '08:00',
        endTime: '16:00',
        notes: ''
      });
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule shift');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShift = async (id) => {
    if (!window.confirm("Are you sure you want to delete this shift?")) return;
    setLoading(true);
    try {
      await API.delete(`/shifts/${id}`);
      setSuccess('Shift deleted successfully');
      fetchShifts();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete shift');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const getStaffOptions = () => {
    if (shiftForm.staffType === 'doctor') {
      return staffData.doctors.map(d => ({ id: d._id, name: d.name }));
    } else {
      return staffData.nurses.map(n => ({ id: n._id, name: n.name }));
    }
  };

  useEffect(() => {
    if (activeTab === 'billing') fetchBilling();
    if (activeTab === 'patients') fetchPatients();
    if (activeTab === 'staff') {
      fetchStaff();
      fetchShifts();
    }
    if (activeTab === 'departments') {
      fetchDepartments();
      fetchStaff();
    }
    if (activeTab === 'overview') fetchStats(selectedDate, selectedMonth);
    if (activeTab === 'health') fetchEpidemiology(epiMonth, epiYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedDate, selectedMonth]);

  useEffect(() => {
    if (activeTab === 'health') fetchEpidemiology(epiMonth, epiYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epiMonth, epiYear]);

  const fetchAdminProfile = async () => {
    try {
      const res = await API.get('/admin/profile');
      setProfile(res.data.user);
      if (res.data.user) {
        setProfileForm({
          name: res.data.user.name || '',
          email: res.data.user.email || '',
          telephone: res.data.user.telephone || '',
          address: res.data.user.address || '',
          gender: res.data.user.gender || '',
          profilepicture: res.data.user.profilepicture || ''
        });
      }
    } catch (err) {
      console.error('Failed to load admin profile', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAdminProfile();
    }
  }, [token]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm({ ...profileForm, [name]: value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image file is too large (maximum size is 2MB)');
        setTimeout(() => setError(''), 4000);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileForm(prev => ({ ...prev, profilepicture: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await API.put('/admin/profile', profileForm);
      setProfile(response.data.user || profile);
      if (response.data.user?.name) {
        localStorage.setItem('name', response.data.user.name);
      }
      setSuccess('Profile updated successfully.');
      setEditMode(false);
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffChange = (e) => {
    setStaffForm({ ...staffForm, [e.target.name]: e.target.value });
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/admin/create-staff', staffForm);
      setSuccess(`${staffForm.role} account created successfully!`);
      setStaffForm({ name: '', email: '', role: 'doctor' });
      fetchStats();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create staff account');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <img src={logo} alt="JHC Clinic Logo" className="clinic-logo" />
        <ul>
          <li className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
            <FaTachometerAlt className="icon" /> Overview
          </li>
          <li className={activeTab === 'staff' ? 'active' : ''} onClick={() => setActiveTab('staff')}>
            <FaUserMd className="icon" /> Manage Staff
          </li>
          <li className={activeTab === 'departments' ? 'active' : ''} onClick={() => setActiveTab('departments')}>
            <FaBuilding className="icon" /> Departments
          </li>
          <li className={activeTab === 'patients' ? 'active' : ''} onClick={() => setActiveTab('patients')}>
            <FaUserInjured className="icon" /> Patients
          </li>
          <li className={activeTab === 'billing' ? 'active' : ''} onClick={() => setActiveTab('billing')}>
            <FaFileInvoiceDollar className="icon" /> Billing
          </li>
          <li className={activeTab === 'health' ? 'active' : ''} onClick={() => setActiveTab('health')}>
            <FaVirus className="icon" /> Health Stats
          </li>
          <li onClick={handleLogout}>
            <FaSignOutAlt className="icon" /> Logout
          </li>
        </ul>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="dashboard-header">
          <div className="header-left">
            <div className="profile-pic" onClick={() => { setShowProfileTab(true); setEditMode(false); }} style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {profile?.profilepicture ? (
                <img src={profile.profilepicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <FaUser className="default-avatar" />
              )}
            </div>
            <div className="welcome-section">
              <h1>Admin Dashboard</h1>
              <span className="user-info">Welcome {profile?.name || adminName || 'Admin'}</span>
            </div>
          </div>

        </header>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="tab-content">
          {showProfileTab && (
            <div className="profile-section" style={{ background: '#fff', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #eef2f5' }}>
              <div className="profile-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eef2f5', paddingBottom: '15px', marginBottom: '25px' }}>
                <h2 style={{ color: '#1e3d7a', margin: 0, fontSize: '22px' }}>Admin Profile</h2>
                <button type="button" className="close-btn" onClick={() => setShowProfileTab(false)} style={{ background: '#64748b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Close</button>
              </div>

              {!editMode ? (
                <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', minWidth: '180px' }}>
                    <div style={{ width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #2f6dff', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                      {profile?.profilepicture ? (
                        <img src={profile.profilepicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <FaUser style={{ fontSize: '50px', color: '#cbd5e1' }} />
                      )}
                    </div>
                    <span style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>Administrator</span>
                  </div>

                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                      <p style={{ margin: 0, fontSize: '15px', color: '#475569' }}><strong style={{ color: '#1e293b', display: 'block', marginBottom: '4px' }}>Name</strong> {profile?.name || adminName || 'N/A'}</p>
                      <p style={{ margin: 0, fontSize: '15px', color: '#475569' }}><strong style={{ color: '#1e293b', display: 'block', marginBottom: '4px' }}>Email Address</strong> {profile?.email || 'N/A'}</p>
                      <p style={{ margin: 0, fontSize: '15px', color: '#475569' }}><strong style={{ color: '#1e293b', display: 'block', marginBottom: '4px' }}>Telephone</strong> {profile?.telephone || 'N/A'}</p>
                      <p style={{ margin: 0, fontSize: '15px', color: '#475569' }}><strong style={{ color: '#1e293b', display: 'block', marginBottom: '4px' }}>Gender</strong> {profile?.gender || 'N/A'}</p>
                      <p style={{ margin: 0, fontSize: '15px', color: '#475569', gridColumn: '1 / -1' }}><strong style={{ color: '#1e293b', display: 'block', marginBottom: '4px' }}>Address</strong> {profile?.address || 'N/A'}</p>
                    </div>

                    <button 
                      type="button" 
                      onClick={() => {
                        setEditMode(true);
                        setProfileForm({
                          name: profile?.name || adminName || '',
                          email: profile?.email || '',
                          telephone: profile?.telephone || '',
                          address: profile?.address || '',
                          gender: profile?.gender || '',
                          profilepicture: profile?.profilepicture || ''
                        });
                      }}
                      style={{ padding: '10px 22px', background: '#2f6dff', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#1e52d4'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#2f6dff'}
                    >
                      Edit Profile
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} style={{ display: 'flex', gap: '30px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', minWidth: '180px' }}>
                    <div style={{ width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #2f6dff', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                      {profileForm.profilepicture ? (
                        <img src={profileForm.profilepicture} alt="Profile Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <FaUser style={{ fontSize: '50px', color: '#cbd5e1' }} />
                      )}
                    </div>
                    <label style={{ cursor: 'pointer', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', color: '#475569', textAlign: 'center' }}>
                      Change Photo
                      <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                    </label>
                  </div>

                  <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#475569', fontSize: '13px' }}>Full Name</label>
                        <input type="text" name="name" value={profileForm.name} onChange={handleProfileChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#475569', fontSize: '13px' }}>Email Address</label>
                        <input type="email" name="email" value={profileForm.email} onChange={handleProfileChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#475569', fontSize: '13px' }}>Telephone</label>
                        <input type="text" name="telephone" value={profileForm.telephone} onChange={handleProfileChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#475569', fontSize: '13px' }}>Gender</label>
                        <select name="gender" value={profileForm.gender} onChange={handleProfileChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#475569', fontSize: '13px' }}>Address</label>
                        <textarea name="address" value={profileForm.address} onChange={handleProfileChange} rows={2} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button type="submit" disabled={loading} style={{ padding: '10px 22px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button type="button" onClick={() => setEditMode(false)} style={{ padding: '10px 22px', background: '#cbd5e1', color: '#475569', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}
          {!showProfileTab && activeTab === 'overview' && stats && (
            <div className="overview-section">
              {/* Stats cards */}
              <div className="overview-top">
                <div className="divider">
                  <div className="divider-header">
                    <h3>Summary for {new Date(selectedDate).toLocaleDateString()}</h3>
                    <div className="date-selector">
                      <select id="stats-date" value={selectedDate} onChange={handleDateChange}>
                        {dateOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="highlight-grid">
                    <div className="stat-card highlight"><h3>Registered Today</h3><p>{stats.totals.registeredToday}</p></div>
                    <div className="stat-card highlight"><h3>Onsite Patients Today</h3><p>{stats.totals.admittedToday}</p></div>
                    <div className="stat-card highlight"><h3>Admitted Today</h3><p>{stats.totals.admittedToday}</p></div>
                    <div className="stat-card highlight"><h3>Discharged Today</h3><p>{stats.totals.dischargedToday}</p></div>
                  </div>
                  </div>
                <div className="patient-chart-card">
                  <div className="patient-chart-header">
                    <h3>Patient Overview</h3>
                    <select className="month-select" value={selectedMonth} onChange={handleMonthChange}>
                      {monthOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="patient-chart-body">
                    <div className="patient-chart-legend">
                      <div className="legend-item">
                        <span className="dot registered"></span>
                        <span className="legend-label">Registered: <strong>{stats.totals.registeredThisMonth}</strong></span>
                      </div>
                      <div className="legend-item">
                        <span className="dot onsite"></span>
                        <span className="legend-label">Onsite: <strong>{stats.totals.onsiteThisMonth}</strong></span>
                      </div>
                      <div className="legend-item">
                        <span className="dot others"></span>
                        <span className="legend-label">Others: <strong>{Math.max(0, stats.totals.totalPatientsThisMonth - stats.totals.registeredThisMonth - stats.totals.onsiteThisMonth)}</strong></span>
                      </div>
                      <div className="legend-item total">
                        <span className="dot yellow-dot"></span>
                        <span className="legend-label">Total: <strong>{stats.totals.totalPatientsThisMonth}</strong></span>
                      </div>
                    </div>
                    <div className="patient-doughnut-wrapper">
                      <Doughnut 
                        data={{
                          labels: ['Registered', 'Onsite', 'Others'],
                          datasets: [
                            {
                              data: [
                                stats.totals.registeredThisMonth, 
                                stats.totals.onsiteThisMonth,
                                Math.max(0, stats.totals.totalPatientsThisMonth - stats.totals.registeredThisMonth - stats.totals.onsiteThisMonth)
                              ],
                              backgroundColor: ['#3b82f6', '#a855f7', '#10b981'],
                              hoverBackgroundColor: ['#2563eb', '#9333ea', '#059669'],
                              borderWidth: 0,
                            },
                          ],
                        }}
                        options={{
                          cutout: '70%',
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false,
                            },
                            tooltip: {
                              callbacks: {
                                label: (context) => {
                                  const label = context.label || '';
                                  const value = context.raw || 0;
                                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                  const percentage = ((value / total) * 100).toFixed(1);
                                  return `${label}: ${value} (${percentage}%)`;
                                }
                              }
                            }
                          },
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="stats-grid">
                <div className="stat-card"><h3>Bills This Month</h3><p>{stats.totals.totalBillsThisMonth}</p></div>
              </div>
              

              <div className="charts-container">
                <div className="chart-card">
                  <h3>Staff Distribution</h3>
                  <div className="bar-chart-wrapper">
                    <Bar
                      data={{
                        labels: ['Doctors', 'Nurses'],
                        datasets: [
                          {
                            label: 'Count',
                            data: [stats.totals.doctors, stats.totals.nurses],
                            backgroundColor: ['#3498db', '#9b59b6'],
                            borderColor: ['#2980b9', '#8e44ad'],
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={{
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: true,
                            position: 'top',
                          },
                        },
                        scales: {
                          x: {
                            beginAtZero: true,
                          },
                        },
                      }}
                    />
                  </div>
                </div>
                <div className="chart-card">
                  <h3>Bed Availability</h3>
                  <div className="pie-chart-wrapper">
                    <Pie 
                      data={{
                        labels: ['Occupied Beds', 'Unoccupied Beds'],
                        datasets: [
                          {
                            data: [stats.totals.occupiedBeds, stats.totals.unoccupiedBeds],
                            backgroundColor: ['#e74c3c', '#2ecc71'],
                            borderColor: ['#c0392b', '#27ae60'],
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
                          },
                        },
                      }}
                    />
                  </div>
                  <div className="chart-stats">
                    <div className="chart-stat-item">
                      <span className="dot occupied"></span>
                      Occupied: <strong>{stats.totals.occupiedBeds}</strong>
                    </div>
                    <div className="chart-stat-item">
                      <span className="dot unoccupied"></span>
                      Unoccupied: <strong>{stats.totals.unoccupiedBeds}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!showProfileTab && activeTab === 'staff' && (
            <div className="staff-section">

              {/* ── Staff Tab Navigation ── */}
              <div className="staff-nav-tabs">
                <button
                  className={`staff-nav-btn${staffView === 'form' ? ' snb-active' : ''}`}
                  onClick={() => setStaffView('form')}
                >
                  <FaUserPlus className="snb-icon" /> Create Staff
                </button>
                <button
                  className={`staff-nav-btn${staffView === 'nurses' ? ' snb-active' : ''}`}
                  onClick={() => setStaffView('nurses')}
                >
                  <FaUserNurse className="snb-icon" /> Nurses
                  <span className="snb-badge">{staffData.nurses.length}</span>
                </button>
                <button
                  className={`staff-nav-btn${staffView === 'doctors' ? ' snb-active' : ''}`}
                  onClick={() => setStaffView('doctors')}
                >
                  <FaUserMd className="snb-icon" /> Doctors
                  <span className="snb-badge">{staffData.doctors.length}</span>
                </button>
                <button
                  className={`staff-nav-btn${staffView === 'shifts' ? ' snb-active' : ''}`}
                  onClick={() => setStaffView('shifts')}
                >
                  <FaCalendarAlt className="snb-icon" /> Shift Timetable
                </button>
              </div>

              {/* ── Create Staff Form ── */}
              {staffView === 'form' && (
                <div className="create-staff-card">
                  <div className="csc-header">
                    <div className="csc-header-icon"><FaUserPlus /></div>
                    <div>
                      <h2 className="csc-title">Create New Staff Account</h2>
                      <p className="csc-subtitle">Add a doctor or nurse to the system. They will receive a setup email.</p>
                    </div>
                  </div>
                  <form onSubmit={handleCreateStaff} className="csc-form">
                    <div className="csc-field">
                      <label className="csc-label">Full Name</label>
                      <div className="csc-input-wrap">
                        <FaUser className="csc-input-icon" />
                        <input
                          type="text"
                          name="name"
                          value={staffForm.name}
                          onChange={handleStaffChange}
                          placeholder="e.g. Dr. Sarah Johnson"
                          required
                          className="csc-input"
                        />
                      </div>
                    </div>
                    <div className="csc-field">
                      <label className="csc-label">Email Address</label>
                      <div className="csc-input-wrap">
                        <FaEnvelope className="csc-input-icon" />
                        <input
                          type="email"
                          name="email"
                          value={staffForm.email}
                          onChange={handleStaffChange}
                          placeholder="e.g. sarah.johnson@hospital.com"
                          required
                          className="csc-input"
                        />
                      </div>
                    </div>
                    <div className="csc-field">
                      <label className="csc-label">Role</label>
                      <div className="csc-input-wrap">
                        <FaIdBadge className="csc-input-icon" />
                        <select
                          name="role"
                          value={staffForm.role}
                          onChange={handleStaffChange}
                          className="csc-input"
                        >
                          <option value="doctor">Doctor</option>
                          <option value="nurse">Nurse</option>
                        </select>
                      </div>
                    </div>
                    <button type="submit" disabled={loading} className="csc-submit-btn">
                      {loading ? (
                        <><span className="csc-spinner"></span> Creating...</>
                      ) : (
                        <><FaUserPlus style={{ marginRight: '8px' }} /> Create Account</>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* ── Nurses List ── */}
              {staffView === 'nurses' && (
                <div className="staff-list-card">
                  <div className="slc-header nurse-header">
                    <div className="slc-header-left">
                      <div className="slc-icon-wrap nurse-icon"><FaUserNurse /></div>
                      <div>
                        <h2 className="slc-title">Nursing Staff</h2>
                        <p className="slc-subtitle">{staffData.nurses.length} nurse{staffData.nurses.length !== 1 ? 's' : ''} registered</p>
                      </div>
                    </div>
                    {staffData.nurses.length > 0 && (
                      <button className="slc-pdf-btn" onClick={downloadNursesOnlyPDF}>
                        <FaDownload style={{ marginRight: '6px' }} /> Export PDF
                      </button>
                    )}
                  </div>
                  {staffData.nurses.length > 0 ? (
                    <div className="slc-table-wrap">
                      <table className="slc-table">
                        <thead>
                          <tr>
                            <th>Name</th><th>Email</th><th>Role</th><th>Ward</th><th>Created At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {staffData.nurses.map((n, idx) => (
                            <tr key={idx} className="slc-row">
                              <td>
                                <div className="slc-name-cell">
                                  <div className="slc-avatar nurse-av">{(n.name || 'N')[0].toUpperCase()}</div>
                                  <span
                                    onClick={() => handleViewStaffDashboard(n._id, 'nurse')}
                                    style={{ color: '#0f766e', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}
                                    title="Click to view nurse dashboard"
                                  >{n.name}</span>
                                </div>
                              </td>
                              <td className="slc-email">{n.email || 'N/A'}</td>
                              <td><span className="slc-role-badge nurse-badge">{n.role}</span></td>
                              <td>{n.ward || 'N/A'}</td>
                              <td className="slc-date">{n.createdAt ? (new Date(n.createdAt).toLocaleDateString() + ' ' + new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="slc-empty">
                      <FaUserNurse className="slc-empty-icon" />
                      <p>No nurses found</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Doctors List ── */}
              {staffView === 'doctors' && (
                <div className="staff-list-card">
                  <div className="slc-header doctor-header">
                    <div className="slc-header-left">
                      <div className="slc-icon-wrap doctor-icon"><FaUserMd /></div>
                      <div>
                        <h2 className="slc-title">Medical Doctors</h2>
                        <p className="slc-subtitle">{staffData.doctors.length} doctor{staffData.doctors.length !== 1 ? 's' : ''} registered</p>
                      </div>
                    </div>
                    {staffData.doctors.length > 0 && (
                      <button className="slc-pdf-btn" onClick={downloadDoctorsOnlyPDF}>
                        <FaDownload style={{ marginRight: '6px' }} /> Export PDF
                      </button>
                    )}
                  </div>
                  {staffData.doctors.length > 0 ? (
                    <div className="slc-table-wrap">
                      <table className="slc-table">
                        <thead>
                          <tr>
                            <th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Created At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {staffData.doctors.map((d, idx) => (
                            <tr key={idx} className="slc-row">
                              <td>
                                <div className="slc-name-cell">
                                  <div className="slc-avatar doctor-av">{((d.account?.name || d.name || 'D')[0]).toUpperCase()}</div>
                                  <span
                                    onClick={() => handleViewStaffDashboard(d._id, 'doctor')}
                                    style={{ color: '#1e40af', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}
                                    title="Click to view doctor dashboard"
                                  >{d.account?.name || d.name || 'Unknown'}</span>
                                </div>
                              </td>
                              <td className="slc-email">{d.account?.email || d.email || 'N/A'}</td>
                              <td><span className="slc-role-badge doctor-badge">{d.account?.role || d.role || 'doctor'}</span></td>
                              <td>{d.department || 'N/A'}</td>
                              <td className="slc-date">{d.createdAt ? (new Date(d.createdAt).toLocaleDateString() + ' ' + new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="slc-empty">
                      <FaUserMd className="slc-empty-icon" />
                      <p>No doctors found</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Schedule a Shift ── */}
              {staffView === 'shifts' && (
                <div className="shift-management-container">

                  {/* Schedule Form */}
                  <div className="shift-form-card">
                    <div className="sfc-header">
                      <div className="sfc-header-icon"><FaCalendarAlt /></div>
                      <div>
                        <h2 className="sfc-title">Schedule a Shift</h2>
                        <p className="sfc-subtitle">Assign a weekly shift slot to a staff member</p>
                      </div>
                    </div>
                    <form onSubmit={handleCreateShift} className="sfc-form">
                      <div className="sfc-grid">

                        <div className="sfc-field">
                          <label className="sfc-label">Staff Type</label>
                          <select
                            className="sfc-select"
                            value={shiftForm.staffType}
                            onChange={(e) => setShiftForm({ ...shiftForm, staffType: e.target.value, staffId: '' })}
                          >
                            <option value="doctor">Doctor</option>
                            <option value="nurse">Nurse</option>
                          </select>
                        </div>

                        <div className="sfc-field">
                          <label className="sfc-label">Staff Member</label>
                          <select
                            className="sfc-select"
                            value={shiftForm.staffId}
                            onChange={(e) => setShiftForm({ ...shiftForm, staffId: e.target.value })}
                            required
                          >
                            <option value="">— Select Staff Member —</option>
                            {getStaffOptions().map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="sfc-field">
                          <label className="sfc-label">Day of Week</label>
                          <select
                            className="sfc-select"
                            value={shiftForm.day}
                            onChange={(e) => setShiftForm({ ...shiftForm, day: e.target.value })}
                          >
                            {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>

                        <div className="sfc-field">
                          <label className="sfc-label">Shift Type</label>
                          <select
                            className="sfc-select"
                            value={shiftForm.shiftType}
                            onChange={(e) => handleShiftTypeChange(e.target.value)}
                          >
                            <option value="Morning">🌅 Morning (08:00 – 16:00)</option>
                            <option value="Afternoon">🌇 Afternoon (16:00 – 00:00)</option>
                            <option value="Night">🌙 Night (00:00 – 08:00)</option>
                          </select>
                        </div>

                        <div className="sfc-field">
                          <label className="sfc-label">Start Time</label>
                          <input
                            type="text"
                            className="sfc-input"
                            placeholder="e.g. 08:00"
                            value={shiftForm.startTime}
                            onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                            required
                          />
                        </div>

                        <div className="sfc-field">
                          <label className="sfc-label">End Time</label>
                          <input
                            type="text"
                            className="sfc-input"
                            placeholder="e.g. 16:00"
                            value={shiftForm.endTime}
                            onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                            required
                          />
                        </div>

                        <div className="sfc-field sfc-field-full">
                          <label className="sfc-label">Notes <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span></label>
                          <input
                            type="text"
                            className="sfc-input"
                            placeholder="e.g. Room 101 duty, on-call coverage..."
                            value={shiftForm.notes}
                            onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
                          />
                        </div>

                      </div>
                      <div className="sfc-actions">
                        <button type="submit" className="sfc-submit-btn">
                          <FaCalendarAlt style={{ marginRight: '8px' }} /> Schedule Shift
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Weekly Timetable */}
                  <div className="weekly-timetable">
                    <h3 className="wt-title">General Weekly Shift Timetable</h3>
                    <div className="wt-grid">
                      {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((day) => {
                        const dayShifts = shifts.filter(s => s.day === day);
                        const isWeekend = day === 'Saturday' || day === 'Sunday';
                        return (
                          <div key={day} className={`wt-day-card${isWeekend ? ' wt-weekend' : ''}`}>
                            <div className="wt-day-header">
                              <span className="wt-day-name">{day}</span>
                              <span className="wt-day-count">{dayShifts.length} shift{dayShifts.length !== 1 ? 's' : ''}</span>
                            </div>
                            {dayShifts.length > 0 ? (
                              <div className="wt-shifts">
                                {dayShifts.map((s) => {
                                  const staffName = s.staffType === 'doctor' ? (s.doctor?.name || 'Doctor') : (s.nurse?.name || 'Nurse');
                                  const deptOrWard = s.staffType === 'doctor' ? (s.doctor?.department || 'N/A') : (s.nurse?.ward || 'N/A');
                                  const shiftColor = s.shiftType === 'Morning' ? 'wt-shift-morning' : s.shiftType === 'Afternoon' ? 'wt-shift-afternoon' : 'wt-shift-night';
                                  return (
                                    <div key={s._id} className={`wt-shift-item ${shiftColor}`}>
                                      <div className="wt-shift-top">
                                        <strong className="wt-shift-name">{staffName}</strong>
                                        <button onClick={() => handleDeleteShift(s._id)} className="wt-delete-btn" title="Delete shift">✕</button>
                                      </div>
                                      <span className="wt-shift-role">{s.staffType === 'doctor' ? '👨‍⚕️ Doctor' : '👩‍⚕️ Nurse'}</span>
                                      <div className="wt-shift-details">
                                        <span>🕒 {s.startTime} – {s.endTime}</span>
                                        <span className="wt-shift-type-badge">{s.shiftType}</span>
                                      </div>
                                      <div className="wt-shift-location">📍 {deptOrWard}</div>
                                      {s.notes && <div className="wt-shift-notes">📝 {s.notes}</div>}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="wt-empty">
                                <span>No shifts</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {!showProfileTab && activeTab === 'departments' && (
            <div className="departments-section" style={{ width: '100%' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', alignItems: 'start' }}>
                {/* Left Side: Create Department Form */}
                <div className="staff-form-container" style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #eef2f5' }}>
                  <h2 style={{ color: '#1e3d7a', fontSize: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaBuilding style={{ color: '#3498db' }} /> Create Department
                  </h2>
                  <form onSubmit={handleCreateDepartment} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Department Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Cardiology" 
                        value={newDeptForm.name} 
                        onChange={(e) => setNewDeptForm({ ...newDeptForm, name: e.target.value })} 
                        required 
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Description</label>
                      <textarea 
                        placeholder="Describe the department specialty..." 
                        value={newDeptForm.description} 
                        onChange={(e) => setNewDeptForm({ ...newDeptForm, description: e.target.value })} 
                        rows={3}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box', fontFamily: 'inherit' }}
                      />
                    </div>
                    <button type="submit" disabled={loading} style={{ padding: '12px', fontWeight: 'bold', background: '#3498db', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }}>
                      {loading ? 'Creating...' : 'Create Department'}
                    </button>
                  </form>
                </div>

                {/* Right Side: Departments List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h2 style={{ color: '#1e3d7a', fontSize: '20px', margin: 0 }}>Active Departments</h2>
                  
                  {departments.length === 0 ? (
                    <p style={{ fontStyle: 'italic', color: '#94a3b8', background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eef2f5' }}>No departments created yet.</p>
                  ) : (
                    departments.map((dept) => {
                      const availableDoctors = staffData.doctors.filter(doc => 
                        !dept.doctors.some(d => d._id === doc._id)
                      );
                      
                      return (
                        <div key={dept._id} style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #eef2f5', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px', marginBottom: '15px' }}>
                            <div>
                              <h3 style={{ margin: '0 0 5px 0', color: '#1e293b', fontSize: '18px' }}>{dept.name}</h3>
                              <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>{dept.description || 'No description provided.'}</p>
                            </div>
                            <button 
                              onClick={() => handleDeleteDepartment(dept._id)} 
                              style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              Delete
                            </button>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            {/* Head of Department Selector */}
                            <div>
                              <label style={{ display: 'block', fontWeight: '600', color: '#475569', fontSize: '13px', marginBottom: '8px' }}>Head of Department (HOD)</label>
                              <select 
                                value={dept.headOfDepartment?._id || ''} 
                                onChange={(e) => {
                                  const selectedHeadId = e.target.value || null;
                                  handleUpdateDepartmentDetails(
                                    dept._id, 
                                    dept.name, 
                                    dept.description, 
                                    selectedHeadId, 
                                    dept.doctors.map(d => d._id)
                                  );
                                }}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }}
                              >
                                <option value="">Select HOD (Doctor)</option>
                                {staffData.doctors.map(doc => (
                                  <option key={doc._id} value={doc._id}>{doc.name}</option>
                                ))}
                              </select>
                              {dept.headOfDepartment ? (
                                <div style={{ marginTop: '8px', fontSize: '12px', color: '#16a34a', fontWeight: '500' }}>
                                  ✓ Head: {dept.headOfDepartment.name} ({dept.headOfDepartment.specialisation || 'General'})
                                </div>
                              ) : (
                                <div style={{ marginTop: '8px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                                  No Head of Department assigned
                                </div>
                              )}
                            </div>

                            {/* Doctors List & Add Doctor */}
                            <div>
                              <label style={{ display: 'block', fontWeight: '600', color: '#475569', fontSize: '13px', marginBottom: '8px' }}>Assigned Doctors ({dept.doctors.length})</label>
                              
                              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                <select 
                                  id={`add-doc-select-${dept._id}`}
                                  defaultValue=""
                                  style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }}
                                >
                                  <option value="">Add Doctor...</option>
                                  {availableDoctors.map(doc => (
                                    <option key={doc._id} value={doc._id}>{doc.name} {doc.department ? `(${doc.department})` : ''}</option>
                                  ))}
                                </select>
                                <button 
                                  onClick={() => {
                                    const selectEl = document.getElementById(`add-doc-select-${dept._id}`);
                                    const selectedDoctorId = selectEl.value;
                                    if (!selectedDoctorId) return;
                                    handleUpdateDepartmentDetails(
                                      dept._id,
                                      dept.name,
                                      dept.description,
                                      dept.headOfDepartment?._id || null,
                                      [...dept.doctors.map(d => d._id), selectedDoctorId]
                                    );
                                    selectEl.value = "";
                                  }}
                                  style={{ padding: '8px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                  Add
                                </button>
                              </div>

                              {dept.doctors.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto', padding: '5px 0' }}>
                                  {dept.doctors.map(doc => (
                                    <div 
                                      key={doc._id} 
                                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '20px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                                    >
                                      <span>{doc.name}</span>
                                      <button 
                                        onClick={() => {
                                          handleUpdateDepartmentDetails(
                                            dept._id,
                                            dept.name,
                                            dept.description,
                                            dept.headOfDepartment?._id || null,
                                            dept.doctors.map(d => d._id).filter(id => id !== doc._id)
                                          );
                                        }}
                                        style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: '14px', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '12px' }}>No doctors assigned to this department.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {!showProfileTab && activeTab === 'patients' && (
            <div className="data-table-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <h2 style={{ margin: 0 }}>All Patients</h2>
                <div className="search-container" style={{ position: 'relative' }}>
                  <div 
                    onClick={() => setShowSearch(!showSearch)} 
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#fff', borderRadius: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', color: '#1798ee', border: '1px solid #d7e2f4' }}
                  >
                    <FaSearch /> <span style={{ fontSize: '13px', fontWeight: '500' }}>Search Patient</span>
                  </div>
                  
                  {showSearch && (
                    <div style={{ position: 'absolute', top: '45px', right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '10px', width: '250px', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                      <input 
                        type="text" 
                        placeholder="Type name..." 
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                        autoFocus
                      />
                      {suggestions.length > 0 && (
                        <div style={{ marginTop: '8px', borderTop: '1px solid #eee', maxHeight: '150px', overflowY: 'auto' }}>
                          {suggestions.map(p => (
                            <div 
                              key={p._id} 
                              onClick={() => {
                                handleViewPatientDashboard(p._id);
                                setShowSearch(false);
                                setSearchQuery('');
                                setSuggestions([]);
                              }}
                              style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #f9f9f9', fontSize: '13px', color: '#333' }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                              {p.name}
                            </div>
                          ))}
                        </div>
                      )}
                      {searchQuery.trim().length > 0 && suggestions.length === 0 && (
                        <div style={{ padding: '8px', color: '#888', fontSize: '12px' }}>No matches found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="patient-totals">
                <div className="total-card">
                  <h3>Total Registered Patients</h3>
                  <p>{stats ? stats.totals.registeredPatients : 0}</p>
                </div>
                <div className="total-card">
                  <h3>Total Onsite Patients</h3>
                  <p>{stats ? stats.totals.onsitePatients : 0}</p>
                </div>
              </div>
              {patients.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Type</th>
                      <th>Registered On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((p, idx) => (
                      <tr key={idx}>
                        <td>
                          <span 
                            onClick={() => handleViewPatientDashboard(p._id)} 
                            style={{ color: '#1798ee', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
                          >
                            {p.name}
                          </span>
                        </td>
                        <td>{p.email}</td>
                        <td>{p.patientType}</td>
                        <td>{p.registeredOn ? (new Date(p.registeredOn).toLocaleDateString() + ' ' + new Date(p.registeredOn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="no-data">No patients found</p>}
              {patients.length > 0 && (
                <div style={{ marginTop: '15px' }}>
                  <button 
                    onClick={downloadPatientsPDF}
                    style={{ display: 'inline-flex', alignItems: 'center', padding: '10px 18px', background: '#2f6dff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#1e52d4'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#2f6dff'}
                  >
                    <FaDownload style={{ marginRight: '8px' }} /> Save Patients List as PDF
                  </button>
                </div>
              )}
            </div>
          )}

          {!showProfileTab && activeTab === 'billing' && (
            <div className="data-table-container">
              <h2>Billing Records</h2>
              {billing.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Total Charges</th>
                      <th>Total Paid</th>
                      <th>Balance</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billing.map((record, idx) => (
                      <tr key={idx}>
                        <td>{record.patientName || record.patient?.name || 'N/A'}</td>
                        <td>{record.totalcharges?.toLocaleString()} {record.charges?.[0]?.unit || 'FCFA'}</td>
                        <td>{record.totalpayment?.toLocaleString()} {record.charges?.[0]?.unit || 'FCFA'}</td>
                        <td style={{ color: record.balance > 0 ? '#ef4444' : '#219653', fontWeight: '600' }}>
                          {record.balance?.toLocaleString()} {record.charges?.[0]?.unit || 'FCFA'}
                        </td>
                        <td>{new Date(record.createdAt).toLocaleDateString()}</td>
                        <td>
                          <button 
                            type="button" 
                            onClick={() => downloadInvoicePDF(record)}
                            style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 12px', background: '#2f6dff', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px', transition: 'background-color 0.2s' }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#1e52d4'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#2f6dff'}
                          >
                            <FaDownload style={{ marginRight: '4px' }} /> Save PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="no-data">No billing records found</p>}
            </div>
          )}

          {/* ── HEALTH STATISTICS TAB ─────────────────────────────────────── */}
          {!showProfileTab && activeTab === 'health' && (
            <div className="health-stats-container">
              <div className="health-stats-header">
                <h2>🦠 Health Statistics — Disease Surveillance</h2>
                <p className="health-stats-subtitle">
                  Epidemiology data automatically captured from every doctor diagnosis in this locality.
                </p>
              </div>

              {/* Filters */}
              <div className="health-filters">
                <div className="health-filter-group">
                  <label>Month</label>
                  <select value={epiMonth} onChange={e => setEpiMonth(e.target.value)}>
                    <option value="">All Months</option>
                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                      <option key={i+1} value={String(i+1)}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="health-filter-group">
                  <label>Year</label>
                  <select value={epiYear} onChange={e => setEpiYear(e.target.value)}>
                    {[2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="health-total-badge">
                  Total Diagnoses: <strong>{epiStats?.totalDiagnoses ?? '—'}</strong>
                </div>
              </div>

              {epiLoading && <div className="loading" style={{ padding: '40px 0' }}>Loading health statistics…</div>}
              {epiError  && <div className="alert alert-error">{epiError}</div>}

              {epiStats && !epiLoading && (
                <>
                  {epiStats.totalDiagnoses === 0 ? (
                    <div className="no-data" style={{ padding: '60px 0' }}>
                      No diagnoses recorded yet for the selected period.<br />
                      <small>Diagnoses are recorded automatically when a doctor writes a prescription.</small>
                    </div>
                  ) : (
                    <>
                      {/* ── Row 1: Condition Distribution + Gender Breakdown ── */}
                      <div className="health-charts-row">
                        {/* Condition Distribution — Horizontal Bar */}
                        <div className="health-chart-card health-chart-wide">
                          <h3>Condition Distribution (%)</h3>
                          <p className="chart-sub">Percentage of each disease diagnosed this period</p>
                          <div style={{ height: Math.max(200, epiStats.conditions.length * 42) }}>
                            <Bar
                              data={{
                                labels: epiStats.conditions.map(c => c.condition),
                                datasets: [{
                                  label: '% of Diagnoses',
                                  data: epiStats.conditions.map(c => c.percentage),
                                  backgroundColor: epiStats.conditions.map((_, i) => [
                                    '#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6',
                                    '#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6'
                                  ][i % 10]),
                                  borderRadius: 6,
                                }]
                              }}
                              options={{
                                indexAxis: 'y',
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: { display: false },
                                  tooltip: {
                                    callbacks: {
                                      label: ctx => {
                                        const cond = epiStats.conditions[ctx.dataIndex];
                                        return ` ${ctx.raw}%  (${cond.count} cases)`;
                                      }
                                    }
                                  }
                                },
                                scales: {
                                  x: { beginAtZero: true, max: 100, ticks: { callback: v => `${v}%` } }
                                }
                              }}
                            />
                          </div>
                        </div>

                        {/* Gender Breakdown for selected condition */}
                        <div className="health-chart-card">
                          <h3>Gender Split</h3>
                          <div className="condition-selector-wrap">
                            <label>Condition:</label>
                            <select
                              value={epiSelectedCondition}
                              onChange={e => setEpiSelectedCondition(e.target.value)}
                            >
                              {epiStats.conditions.map(c => (
                                <option key={c.condition} value={c.condition}>{c.condition}</option>
                              ))}
                            </select>
                          </div>
                          {(() => {
                            const gb = epiStats.genderBreakdown.find(g => g.condition === epiSelectedCondition);
                            if (!gb) return <p className="no-data">No data</p>;
                            const total = gb.Male + gb.Female + gb.Other + gb.Unknown;
                            return (
                              <>
                                <div style={{ height: 200, position: 'relative' }}>
                                  <Doughnut
                                    data={{
                                      labels: ['Male', 'Female', 'Other / Unknown'],
                                      datasets: [{
                                        data: [gb.Male, gb.Female, gb.Other + gb.Unknown],
                                        backgroundColor: ['#3b82f6', '#ec4899', '#94a3b8'],
                                        borderWidth: 2,
                                        borderColor: '#fff'
                                      }]
                                    }}
                                    options={{
                                      cutout: '65%',
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      plugins: {
                                        legend: { position: 'bottom', labels: { font: { size: 12 } } },
                                        tooltip: {
                                          callbacks: {
                                            label: ctx => {
                                              const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                                              return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
                                            }
                                          }
                                        }
                                      }
                                    }}
                                  />
                                </div>
                                <div className="gender-stats-row">
                                  <div className="gender-stat male"><span>♂</span><strong>{gb.Male}</strong><small>{gb.malePct}%</small></div>
                                  <div className="gender-stat female"><span>♀</span><strong>{gb.Female}</strong><small>{gb.femalePct}%</small></div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* ── Row 2: Age Range Breakdown ── */}
                      <div className="health-chart-card" style={{ marginTop: 24 }}>
                        <h3>Age Range Breakdown per Condition</h3>
                        <p className="chart-sub">Number of cases per age group for each diagnosed condition</p>
                        {(() => {
                          const AGE_BUCKETS = epiStats.ageRangeBuckets.filter(b => b !== 'Unknown');
                          const COLORS = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899'];
                          return (
                            <div style={{ height: 300 }}>
                              <Bar
                                data={{
                                  labels: AGE_BUCKETS,
                                  datasets: epiStats.ageBreakdown.map((ab, i) => ({
                                    label: ab.condition,
                                    data: AGE_BUCKETS.map(bucket => ab.buckets[bucket] || 0),
                                    backgroundColor: COLORS[i % COLORS.length] + 'cc',
                                    borderColor: COLORS[i % COLORS.length],
                                    borderWidth: 1,
                                    borderRadius: 4,
                                  }))
                                }}
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  plugins: {
                                    legend: { position: 'top' },
                                    tooltip: { mode: 'index', intersect: false }
                                  },
                                  scales: {
                                    x: { stacked: false, grid: { display: false } },
                                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                                  }
                                }}
                              />
                            </div>
                          );
                        })()}
                      </div>

                      {/* ── Row 3: Monthly Trend Line ── */}
                      <div className="health-chart-card" style={{ marginTop: 24 }}>
                        <h3>Monthly Trend — {epiYear}</h3>
                        <p className="chart-sub">Cases per condition across each month of the year</p>
                        {(() => {
                          const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                          const COLORS = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899'];

                          // Collect unique conditions from trend
                          const condSet = [...new Set(epiStats.monthlyTrend.map(t => t.condition))];

                          const datasets = condSet.map((cond, i) => {
                            const data = MONTH_LABELS.map((_, mi) => {
                              const entry = epiStats.monthlyTrend.find(t => t.condition === cond && t.month === mi + 1);
                              return entry ? entry.count : 0;
                            });
                            return {
                              label: cond,
                              data,
                              borderColor: COLORS[i % COLORS.length],
                              backgroundColor: COLORS[i % COLORS.length] + '30',
                              tension: 0.4,
                              fill: false,
                              pointRadius: 5,
                              pointHoverRadius: 7,
                            };
                          });

                          if (datasets.length === 0) return <p className="no-data">No trend data for {epiYear}</p>;

                          return (
                            <div style={{ height: 280 }}>
                              <Line
                                data={{ labels: MONTH_LABELS, datasets }}
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  plugins: {
                                    legend: { position: 'top' },
                                    tooltip: { mode: 'index', intersect: false }
                                  },
                                  scales: {
                                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                                    x: { grid: { display: false } }
                                  }
                                }}
                              />
                            </div>
                          );
                        })()}
                      </div>

                      {/* ── Summary Table ── */}
                      <div className="health-chart-card" style={{ marginTop: 24 }}>
                        <h3>Summary Table</h3>
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Condition / Disease</th>
                              <th>Cases</th>
                              <th>% of Total</th>
                              <th>Top Age Range</th>
                              <th>Male %</th>
                              <th>Female %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {epiStats.conditions.map((cond, idx) => {
                              const gb  = epiStats.genderBreakdown.find(g => g.condition === cond.condition);
                              const ab  = epiStats.ageBreakdown.find(a => a.condition === cond.condition);
                              const topAge = ab ? Object.entries(ab.buckets).sort((a,b) => b[1]-a[1])[0]?.[0] : '—';
                              return (
                                <tr key={cond.condition}>
                                  <td>{idx + 1}</td>
                                  <td><strong>{cond.condition}</strong></td>
                                  <td>{cond.count}</td>
                                  <td><span className="epi-pct-badge">{cond.percentage}%</span></td>
                                  <td>{topAge || '—'}</td>
                                  <td style={{ color: '#3b82f6' }}>{gb?.malePct ?? 0}%</td>
                                  <td style={{ color: '#ec4899' }}>{gb?.femalePct ?? 0}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

        </div>
        
        {viewingPatientId && viewingPatientData && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '25px', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', position: 'relative' }}>
              <button 
                onClick={() => { setViewingPatientId(null); setViewingPatientData(null); }} 
                style={{ position: 'absolute', top: '15px', right: '15px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', fontWeight: 'bold', zIndex: 10 }}
              >
                ✕
              </button>
              
              <h2 style={{ borderBottom: '2px solid #3498db', paddingBottom: '10px', color: '#2c3e50', marginBottom: '20px', marginTop: 0 }}>Patient Dashboard: {viewingPatientData.profile.name}</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', textAlign: 'left' }}>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #eef2f5' }}>
                  <h3 style={{ color: '#1e3d7a', marginTop: 0, marginBottom: '10px' }}>Patient Profile</h3>
                  <p style={{ margin: '8px 0' }}><strong>Name:</strong> {viewingPatientData.profile.name}</p>
                  <p style={{ margin: '8px 0' }}><strong>Email:</strong> {viewingPatientData.profile.email}</p>
                  <p style={{ margin: '8px 0' }}><strong>Age:</strong> {viewingPatientData.profile.age || 'N/A'}</p>
                  <p style={{ margin: '8px 0' }}><strong>Gender:</strong> {viewingPatientData.profile.gender || 'N/A'}</p>
                  <p style={{ margin: '8px 0' }}><strong>Blood Type:</strong> {viewingPatientData.profile.bloodType || 'N/A'}</p>
                  <p style={{ margin: '8px 0' }}><strong>Address:</strong> {viewingPatientData.profile.address || 'N/A'}</p>
                  <p style={{ margin: '8px 0' }}><strong>Telephone:</strong> {viewingPatientData.profile.telephone || 'N/A'}</p>
                  <p style={{ margin: '8px 0' }}><strong>Allergies:</strong> {Array.isArray(viewingPatientData.profile.allergies) ? viewingPatientData.profile.allergies.join(', ') : viewingPatientData.profile.allergies || 'None'}</p>
                </div>
                
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #eef2f5' }}>
                  <h3 style={{ color: '#1e3d7a', marginTop: 0, marginBottom: '10px' }}>Medical History</h3>
                  {viewingPatientData.profile.medicalHistory && viewingPatientData.profile.medicalHistory.length > 0 ? (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      {viewingPatientData.profile.medicalHistory.map((entry, idx) => (
                        <div key={idx} style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                          <div><strong>Condition:</strong> {entry.condition || 'N/A'}</div>
                          <div><strong>Date:</strong> {entry.diagnosisDate ? new Date(entry.diagnosisDate).toLocaleDateString() : 'N/A'}</div>
                          <div><strong>Treatment:</strong> {entry.treatment || 'N/A'}</div>
                          {entry.notes && <div><strong>Notes:</strong> {entry.notes}</div>}
                          {entry.medications && entry.medications.length > 0 && (
                            <div style={{ marginTop: '5px', paddingLeft: '10px', borderLeft: '2px solid #3498db' }}>
                              <strong>Medications:</strong>
                              <ul style={{ margin: '5px 0 0 0', paddingLeft: '15px' }}>
                                {entry.medications.map((med, mIdx) => (
                                  <li key={mIdx}>{med.name} - {med.dosage} ({med.frequency})</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : viewingPatientData.medicalHistory ? (
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{viewingPatientData.medicalHistory}</p>
                  ) : (
                    <p style={{ fontStyle: 'italic', color: '#94a3b8', margin: 0 }}>No medical history recorded</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Staff Dashboard Modal ── */}
        {viewingStaffData && (
          <div className="sdm-overlay" onClick={() => setViewingStaffData(null)}>
            <div className="sdm-modal" onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className={`sdm-header ${viewingStaffData.type === 'nurse' ? 'sdm-nurse' : 'sdm-doctor'}`}>
                <div className="sdm-avatar">
                  {viewingStaffData.profile.profilepicture ? (
                    <img src={viewingStaffData.profile.profilepicture} alt="Profile" className="sdm-avatar-img" />
                  ) : (
                    <span className="sdm-avatar-initials">
                      {(viewingStaffData.profile.name || '?')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="sdm-header-info">
                  <h2 className="sdm-name">{viewingStaffData.profile.name}</h2>
                  <div className="sdm-meta">
                    <span className="sdm-role-badge">
                      {viewingStaffData.type === 'doctor' ? '👨‍⚕️ Doctor' : '👩‍⚕️ Nurse'}
                    </span>
                    <span className={`sdm-status ${viewingStaffData.profile.active ? 'sdm-active' : 'sdm-inactive'}`}>
                      {viewingStaffData.profile.active ? '● Active' : '● Inactive'}
                    </span>
                  </div>
                </div>
                <button className="sdm-close-btn" onClick={() => setViewingStaffData(null)}>✕</button>
              </div>

              {viewingStaffLoading ? (
                <div className="sdm-loading">Loading...</div>
              ) : (
                <div className="sdm-body">

                  {/* Profile Info */}
                  <div className="sdm-section">
                    <h3 className="sdm-section-title">Profile Information</h3>
                    <div className="sdm-info-grid">
                      <div className="sdm-info-item">
                        <span className="sdm-info-label">Email</span>
                        <span className="sdm-info-value">{viewingStaffData.profile.email || 'N/A'}</span>
                      </div>
                      <div className="sdm-info-item">
                        <span className="sdm-info-label">Gender</span>
                        <span className="sdm-info-value">{viewingStaffData.profile.gender}</span>
                      </div>
                      <div className="sdm-info-item">
                        <span className="sdm-info-label">Telephone</span>
                        <span className="sdm-info-value">{viewingStaffData.profile.telephone}</span>
                      </div>
                      <div className="sdm-info-item">
                        <span className="sdm-info-label">Address</span>
                        <span className="sdm-info-value">{viewingStaffData.profile.address}</span>
                      </div>
                      {viewingStaffData.type === 'doctor' && (
                        <>
                          <div className="sdm-info-item">
                            <span className="sdm-info-label">Department</span>
                            <span className="sdm-info-value">{viewingStaffData.profile.department}</span>
                          </div>
                          <div className="sdm-info-item">
                            <span className="sdm-info-label">Specialisation</span>
                            <span className="sdm-info-value">{viewingStaffData.profile.specialisation}</span>
                          </div>
                        </>
                      )}
                      {viewingStaffData.type === 'nurse' && (
                        <div className="sdm-info-item">
                          <span className="sdm-info-label">Ward</span>
                          <span className="sdm-info-value">{viewingStaffData.profile.ward}</span>
                        </div>
                      )}
                      <div className="sdm-info-item">
                        <span className="sdm-info-label">Member Since</span>
                        <span className="sdm-info-value">
                          {viewingStaffData.profile.createdAt ? new Date(viewingStaffData.profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Shifts */}
                  <div className="sdm-section">
                    <h3 className="sdm-section-title">Assigned Shifts ({viewingStaffData.shifts.length})</h3>
                    {viewingStaffData.shifts.length > 0 ? (
                      <div className="sdm-shifts-grid">
                        {viewingStaffData.shifts.map((s, idx) => {
                          const shiftClass = s.shiftType === 'Morning' ? 'sdm-shift-morning' : s.shiftType === 'Afternoon' ? 'sdm-shift-afternoon' : 'sdm-shift-night';
                          return (
                            <div key={idx} className={`sdm-shift-item ${shiftClass}`}>
                              <div className="sdm-shift-day">{s.day}</div>
                              <div className="sdm-shift-time">🕒 {s.startTime} – {s.endTime}</div>
                              <span className="sdm-shift-type">{s.shiftType}</span>
                              {s.notes && <div className="sdm-shift-notes">📝 {s.notes}</div>}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="sdm-empty">No shifts assigned yet.</p>
                    )}
                  </div>

                  {/* Appointments (doctors only) */}
                  {viewingStaffData.type === 'doctor' && (
                    <div className="sdm-section">
                      <h3 className="sdm-section-title">Appointments ({viewingStaffData.appointments.length})</h3>
                      {viewingStaffData.appointments.length > 0 ? (
                        <div className="sdm-table-wrap">
                          <table className="sdm-table">
                            <thead>
                              <tr>
                                <th>Patient</th>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {viewingStaffData.appointments.slice(0, 10).map((apt, idx) => (
                                <tr key={idx}>
                                  <td>{apt.patient?.name || 'N/A'}</td>
                                  <td>{apt.date ? new Date(apt.date).toLocaleDateString() : 'N/A'}</td>
                                  <td>{apt.type || 'N/A'}</td>
                                  <td>
                                    <span className={`sdm-apt-badge ${apt.status === 'completed' ? 'sdm-apt-done' : apt.status === 'cancelled' ? 'sdm-apt-cancelled' : 'sdm-apt-pending'}`}>
                                      {apt.status || 'Pending'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {viewingStaffData.appointments.length > 10 && (
                            <p className="sdm-more">+ {viewingStaffData.appointments.length - 10} more appointments</p>
                          )}
                        </div>
                      ) : (
                        <p className="sdm-empty">No appointments recorded.</p>
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default AdminDashboard;
