import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import './DocDashboard.css';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  FaUser, 
  FaRegCalendar, 
  FaUsers, 
  FaRegFileAlt, 
  FaHeartbeat, 
  FaSignOutAlt, 
  FaRegClock, 
  FaCheckCircle, 
  FaArrowLeft, 
  FaSyncAlt,
  FaSearch,
  FaDownload,
  FaFileMedical
} from 'react-icons/fa';

const DocDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  const doctorId = localStorage.getItem('userId');

  const [profile, setProfile] = useState(null);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [appointmentFilter, setAppointmentFilter] = useState('all');
  const [editMode, setEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    department: '',
    address: '',
    telephone: '',
    gender: '',
    specialisation: '',
    profilepicture: ''
  });

  const [showProfileTab, setShowProfileTab] = useState(false);
  const [personalShifts, setPersonalShifts] = useState([]);
  const [allPatients, setAllPatients] = useState([]);
  const [myPatients, setMyPatients] = useState([]);
  const [onsitePrescriptions, setOnsitePrescriptions] = useState([]);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  // Patient action menu state
  const [actionMenu, setActionMenu] = useState(null); // { patientId, patientName, x, y }

  // Patient profile view (no payments/appointments)
  const [viewingProfile, setViewingProfile] = useState(null); // { profile, medicalHistory }

  // Prescription modal
  const [prescriptionModal, setPrescriptionModal] = useState(null); // { patientId, patientName }
  const [prescriptionForm, setPrescriptionForm] = useState({
    condition: '',
    symptoms: '',
    diagnosisDate: new Date().toISOString().split('T')[0],
    treatment: '',
    notes: '',
    medications: [{ name: '', dosage: '', frequency: '' }],
  });
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
  const [prescriptionSuccess, setPrescriptionSuccess] = useState('');

  // Open the action-choice menu when a patient name is clicked
  const handlePatientClick = (patientId, patientName, e, patientType = 'registered') => {
    e.stopPropagation();
    setActionMenu({ patientId, patientName, patientType });
  };

  // Load and show the patient profile view (no payments/appointments)
  const handleViewProfile = async (patientId) => {
    setActionMenu(null);
    setError('');
    try {
      const [profileRes, historyRes] = await Promise.all([
        API.get(`/patients/profile/${patientId}`),
        API.get(`/patients/medicalHistory/${patientId}`),
      ]);
      setViewingProfile({
        profile: profileRes.data.user,
        medicalHistory: historyRes.data.medicalHistory,
      });
    } catch (err) {
      console.error('Error loading patient profile:', err);
      setError('Failed to load patient profile');
    }
  };

  // Open the prescription writing modal — also records patient type so the success
  // message can inform the doctor where the prescription was stored.
  const handleOpenPrescription = (patientId, patientName, patientType = 'registered') => {
    setActionMenu(null);
    setPrescriptionForm({
      condition: '',
      symptoms: '',
      diagnosisDate: new Date().toISOString().split('T')[0],
      treatment: '',
      notes: '',
      medications: [{ name: '', dosage: '', frequency: '' }],
    });
    setPrescriptionSuccess('');
    setPrescriptionModal({ patientId, patientName, patientType });
  };

  // PDF download for a single onsite prescription
  const downloadOnsitePrescriptionPDF = (rx) => {
    const doc = new jsPDF();

    // Header
    doc.setFillColor(30, 61, 122);
    doc.rect(0, 0, doc.internal.pageSize.width, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('JHC Clinic — Prescription Record', 14, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, doc.internal.pageSize.width - 14, 18, { align: 'right' });

    // Patient info block
    doc.setTextColor(30, 61, 122);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Patient Information', 14, 40);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 43, doc.internal.pageSize.width - 14, 43);

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const info = [
      [`Patient Name:`, rx.patientName || 'N/A'],
      [`Age:`, rx.patientAge != null ? String(rx.patientAge) : 'N/A'],
      [`Gender:`, rx.patientGender || 'N/A'],
      [`Email:`, rx.patientEmail || 'N/A'],
      [`Patient Type:`, 'Onsite (Walk-in)'],
    ];
    let y = 50;
    info.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 65, y);
      y += 7;
    });

    // Prescription details
    y += 4;
    doc.setTextColor(30, 61, 122);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Prescription Details', 14, y);
    doc.line(14, y + 3, doc.internal.pageSize.width - 14, y + 3);
    y += 10;

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    const details = [
      ['Condition / Diagnosis:', rx.condition],
      ['Symptoms:', rx.symptoms || 'N/A'],
      ['Diagnosis Date:', rx.diagnosisDate ? new Date(rx.diagnosisDate).toLocaleDateString() : 'N/A'],
      ['Treatment:', rx.treatment || 'N/A'],
      ['Notes:', rx.notes || 'N/A'],
    ];
    details.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 14, y);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(value, 120);
      doc.text(lines, 75, y);
      y += 7 * lines.length;
    });

    // Medications table
    if (rx.medications && rx.medications.length > 0) {
      y += 4;
      doc.setTextColor(30, 61, 122);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Medications', 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Medication', 'Dosage', 'Frequency']],
        body: rx.medications.map(m => [m.name || '', m.dosage || '', m.frequency || '']),
        theme: 'striped',
        headStyles: { fillColor: [30, 61, 122] },
        styles: { fontSize: 9 },
      });
    }

    // Footer
    const pageH = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('This prescription is stored in the doctor\'s records. Confidential — JHC Clinic.', 14, pageH - 10);

    const dateStr = new Date(rx.diagnosisDate).toLocaleDateString().split('/').join('-');
    doc.save(`Prescription_${rx.patientName}_${dateStr}.pdf`);
  };

  // Handle medication row changes
  const handleMedChange = (idx, field, value) => {
    const updated = prescriptionForm.medications.map((m, i) =>
      i === idx ? { ...m, [field]: value } : m
    );
    setPrescriptionForm({ ...prescriptionForm, medications: updated });
  };

  const addMedRow = () =>
    setPrescriptionForm({
      ...prescriptionForm,
      medications: [...prescriptionForm.medications, { name: '', dosage: '', frequency: '' }],
    });

  const removeMedRow = (idx) =>
    setPrescriptionForm({
      ...prescriptionForm,
      medications: prescriptionForm.medications.filter((_, i) => i !== idx),
    });

  // Submit prescription to backend
  const handleSubmitPrescription = async (e) => {
    e.preventDefault();
    if (!prescriptionForm.condition.trim()) {
      setError('Condition / Diagnosis is required.');
      return;
    }
    setPrescriptionLoading(true);
    setError('');
    try {
      const res = await API.post(`/doctors/prescription/${prescriptionModal.patientId}`, prescriptionForm);
      const isOnsite = res.data.patientType === 'onsite';
      setPrescriptionSuccess(
        isOnsite
          ? 'Prescription saved! It is stored in your records (onsite patient). You can download it as a PDF from the "Onsite Prescriptions" tab.'
          : 'Prescription written successfully! It has been added to the patient\'s medical records.'
      );
      // Refresh dashboard data
      fetchDashboard();
      // Always refresh onsite prescriptions list
      try {
        const oxRes = await API.get('/doctors/onsitePrescriptions');
        setOnsitePrescriptions(oxRes.data.prescriptions || []);
      } catch (_) {}
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to write prescription');
    } finally {
      setPrescriptionLoading(false);
    }
  };

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, prescriptionsRes, appointmentsRes, shiftsRes, allPatientsRes, myPatientsRes, onsiteRxRes] = await Promise.all([
        API.get(`/doctors/doctorProfile/${doctorId}`),
        API.get(`/doctors/doctorPrescriptions/${doctorId}`),
        API.get(`/doctors/doctorAppointments/${doctorId}`),
        API.get(`/shifts/personal`),
        API.get('/doctors/patients'),
        API.get('/doctors/myPatients'),
        API.get('/doctors/onsitePrescriptions'),
      ]);

      const doctorProfile = profileRes.data.doctor || null;
      setProfile(doctorProfile);
      setProfileForm({
        name: doctorProfile?.account?.name || '',
        email: doctorProfile?.account?.email || '',
        department: doctorProfile?.department || '',
        address: doctorProfile?.address || '',
        telephone: doctorProfile?.telephone || '',
        gender: doctorProfile?.gender || '',
        specialisation: doctorProfile?.specialisation || '',
        profilepicture: doctorProfile?.profilepicture || ''
      });

      const patientList = prescriptionsRes.data.prescriptions || [];
      setPatients(patientList);

      setAppointments(appointmentsRes.data.appointments || []);
      setPersonalShifts(shiftsRes.data.shifts || []);
      setAllPatients(allPatientsRes.data.patients || []);
      setMyPatients(myPatientsRes.data.patients || []);
      setOnsitePrescriptions(onsiteRxRes.data.prescriptions || []);

      const historyRecords = [];
      patientList.forEach((patient) => {
        const patientMedicalHistory = Array.isArray(patient.medicalHistory) ? patient.medicalHistory : [];
        patientMedicalHistory.forEach((item) => {
          historyRecords.push({
            patientName: patient.name,
            patientAge: patient.age,
            patientGender: patient.gender,
            patientId: patient._id,
            condition: item.condition,
            diagnosisDate: item.diagnosisDate,
            treatment: item.treatment,
            prescribedBy: item.prescribedBy?.name || profileRes.data.doctor?.account?.name || 'Doctor',
          });
        });
      });
      setRecords(historyRecords);
      setError('');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load doctor dashboard');
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    if (!token || userRole !== 'doctor') {
      navigate('/staffLogin');
      return;
    }
    if (!doctorId) {
      setError('Doctor ID missing. Please log in again.');
      setLoading(false);
      return;
    }
    fetchDashboard();
  }, [token, userRole, doctorId, navigate, fetchDashboard]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

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
      const response = await API.put(`/doctors/doctorProfile/${doctorId}`, profileForm);
      setProfile(response.data.doctor || profile);
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

  const handleCancelEdit = () => {
    setEditMode(false);
    setProfileForm({
      department: profile?.department || '',
      address: profile?.address || '',
      telephone: profile?.telephone || '',
      gender: profile?.gender || '',
      specialisation: profile?.specialisation || '',
      profilepicture: profile?.profilepicture || ''
    });
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (val.trim().length > 0) {
      const filtered = allPatients.filter(p => p.name && p.name.toLowerCase().includes(val.toLowerCase()));
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  const getAppointmentsForToday = () => {
    const today = new Date().toISOString().split('T')[0];
    return appointments.filter(apt => {
      const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
      return aptDate === today;
    }).map(apt => ({
      id: apt._id,
      time: apt.time,
      patientName: apt.patient?.name || 'Unknown',
      reason: apt.reason || 'Consultation',
      status: apt.status,
      type: apt.reason || 'Consultation'
    }));
  };

  const getFollowUpsForToday = () => {
    return getAppointmentsForToday().filter(apt => apt.type === 'Follow-up');
  };

  const getConsultationsForToday = () => {
    return getAppointmentsForToday().filter(apt => apt.type === 'Consultation');
  };


  const getDoctorDisplayName = () => {
    const name = profile?.account?.name;
    if (!name) {
      return "Doctor";
    }
    const lower = name.toLowerCase();
    if (lower.startsWith("dr.") || lower.startsWith("dr ")) {
      return name;
    }
    return `Dr. ${name}`;
  };

  const renderProfile = () => {
    if (!profile) return <p className="no-data">No profile available.</p>;

    if (editMode) {
      return (
        <div className="profile-card">
          <div className="profile-header">
            <h2>Edit Doctor Profile</h2>
            <button type="button" className="close-profile-btn" onClick={handleCancelEdit}>
              <FaArrowLeft /> Cancel
            </button>
          </div>
          <form className="profile-form" onSubmit={handleSaveProfile}>
            <div className="form-row">
              <label>Name</label>
              <input type="text" value={profile.account?.name || 'Unknown'} disabled />
            </div>
            <div className="form-row">
              <label>Email</label>
              <input type="email" value={profile.account?.email || 'Not available'} disabled />
            </div>
            <div className="form-row">
              <label>Specialisation</label>
              <input type="text" name="specialisation" value={profileForm.specialisation} onChange={handleProfileChange} placeholder="Specialisation" />
            </div>
            <div className="form-row">
              <label>Department</label>
              <input type="text" name="department" value={profileForm.department} onChange={handleProfileChange} placeholder="Department" />
            </div>
            <div className="form-row">
              <label>Telephone</label>
              <input type="text" name="telephone" value={profileForm.telephone} onChange={handleProfileChange} placeholder="Telephone" />
            </div>
            <div className="form-row">
              <label>Address</label>
              <textarea name="address" value={profileForm.address} onChange={handleProfileChange} placeholder="Address" />
            </div>
            <div className="form-row">
              <label>Gender</label>
              <select name="gender" value={profileForm.gender} onChange={handleProfileChange}>
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-row">
              <label>Profile Picture</label>
              <input type="file" accept="image/*" onChange={handleImageChange} />
              {profileForm.profilepicture && (
                <div style={{ marginTop: '10px' }}>
                  <img src={profileForm.profilepicture} alt="Preview" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #2f6dff' }} />
                </div>
              )}
            </div>
            <div className="form-actions">
              <button type="submit" className="submit-btn">Save Changes</button>
              <button type="button" className="cancel-btn" onClick={handleCancelEdit}>Cancel</button>
            </div>
          </form>
        </div>
      );
    }

    return (
      <div className="profile-card">
        <div className="profile-header">
          <h2>Doctor Profile</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="edit-btn" onClick={() => setEditMode(true)}>
              Edit Profile
            </button>
            <button type="button" className="close-profile-btn" onClick={() => setShowProfileTab(false)}>
              <FaArrowLeft /> Back to Dashboard
            </button>
          </div>
        </div>
        <div className="profile-grid">
          <div>
            <p>Name</p>
            <span>{profile.account?.name || 'Unknown'}</span>
          </div>
          <div>
            <p>Email</p>
            <span>{profile.account?.email || 'Not available'}</span>
          </div>
          <div>
            <p>Specialisation</p>
            <span>{profile.specialisation || 'Not set'}</span>
          </div>
          <div>
            <p>Department</p>
            <span>{profile.department || 'Not set'}</span>
          </div>
          <div>
            <p>Telephone</p>
            <span>{profile.telephone || 'Not set'}</span>
          </div>
          <div>
            <p>Address</p>
            <span>{profile.address || 'Not set'}</span>
          </div>
          <div>
            <p>Gender</p>
            <span>{profile.gender || 'Not set'}</span>
          </div>
          <div>
            <p>Patients Assigned</p>
            <span>{patients.length}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderPatients = () => (
    <div className="table-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ margin: 0 }}>Assigned Patients List</h2>
        <div className="search-container" style={{ position: 'relative' }}>
          <div 
            onClick={() => setShowSearch(!showSearch)} 
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#fff', borderRadius: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', color: '#3498db', border: '1px solid #d7e2f4' }}
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
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', color: '#000' }}
                autoFocus
              />
              {suggestions.length > 0 && (
                <div style={{ marginTop: '8px', borderTop: '1px solid #eee', maxHeight: '150px', overflowY: 'auto' }}>
                  {suggestions.map(p => (
                    <div 
                      key={p._id} 
                      onClick={(e) => {
                        handlePatientClick(p._id, p.name, e);
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
      {myPatients.length === 0 ? (
        <p className="no-data">No patients assigned to you yet.</p>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Type</th>
                <th>Assigned Nurse</th>
                <th>Bed / Room</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {myPatients.map((patient) => (
                <tr key={patient._id}>
                  <td>
                    <span 
                      onClick={(e) => handlePatientClick(patient._id, patient.name, e, patient.patientType === 'Onsite' ? 'onsite' : 'registered')} 
                      style={{ color: '#3498db', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
                    >
                      {patient.name || 'N/A'}
                    </span>
                  </td>
                  <td>{patient.age || 'N/A'}</td>
                  <td>{patient.gender || 'N/A'}</td>
                  <td>
                    <span className={`patient-type-badge ${patient.patientType.toLowerCase()}`}>
                      {patient.patientType}
                    </span>
                  </td>
                  <td>
                    {patient.assignedNurse ? (
                      patient.assignedNurse.name || patient.assignedNurse
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>None</span>
                    )}
                  </td>
                  <td>{patient.bed || 'N/A'}</td>
                  <td>
                    <button 
                      onClick={(e) => handlePatientClick(patient._id, patient.name, e, patient.patientType === 'Onsite' ? 'onsite' : 'registered')}
                      style={{ padding: '6px 12px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#2980b9'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#3498db'}
                    >
                      Options
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderAllPatients = () => (
    <div className="table-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ margin: 0 }}>All Patients List</h2>
        <div className="search-container" style={{ position: 'relative' }}>
          <div 
            onClick={() => setShowSearch(!showSearch)} 
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#fff', borderRadius: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', color: '#3498db', border: '1px solid #d7e2f4' }}
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
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', color: '#000' }}
                autoFocus
              />
              {suggestions.length > 0 && (
                <div style={{ marginTop: '8px', borderTop: '1px solid #eee', maxHeight: '150px', overflowY: 'auto' }}>
                  {suggestions.map(p => (
                    <div 
                      key={p._id} 
                      onClick={(e) => {
                        handlePatientClick(p._id, p.name, e);
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
      {allPatients.length === 0 ? (
        <p className="no-data">No patients found.</p>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {allPatients.map((patient) => (
                <tr key={patient._id}>
                  <td>
                    <span 
                      onClick={(e) => handlePatientClick(patient._id, patient.name, e)} 
                      style={{ color: '#3498db', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
                    >
                      {patient.name || 'N/A'}
                    </span>
                  </td>
                  <td>{patient.email || 'N/A'}</td>
                  <td>
                    <span className={`badge ${patient.patientType === 'Onsite' ? 'patient-onsite' : 'patient-registered'}`}>
                      {patient.patientType || 'Registered'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderRecords = () => (
    <div className="table-card">
      <h2>Medical History Entries</h2>
      {records.length === 0 ? (
        <p className="no-data">No medical history entries found.</p>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Condition</th>
                <th>Treatment Plan</th>
                <th>Diagnosis Date</th>
                <th>Prescribed By</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => (
                <tr key={`${record.patientId}-${index}`}>
                  <td>
                    <span 
                      onClick={(e) => handlePatientClick(record.patientId, record.patientName, e)} 
                      style={{ color: '#3498db', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
                    >
                      {record.patientName || 'N/A'}
                    </span>
                  </td>
                  <td>{record.condition || 'N/A'}</td>
                  <td>{record.treatment || 'N/A'}</td>
                  <td>{record.diagnosisDate ? new Date(record.diagnosisDate).toLocaleDateString() : 'N/A'}</td>
                  <td>{record.prescribedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="doctor-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="profile-pic" onClick={() => setShowProfileTab(true)}>
            {profile?.profilepicture ? (
              <img src={profile.profilepicture} alt="Profile" className="profile-img" />
            ) : (
              <FaUser className="default-avatar" />
            )}
          </div>
          <div className="welcome-section">
            <span className="dashboard-title-link" onClick={() => { setShowProfileTab(false); setActiveTab('overview'); }}>
              Doctor Dashboard
            </span>
            <h1>
               Welcome, {getDoctorDisplayName()} 👋
               </h1>

          </div>
        </div>
        <div className="header-actions">
          <button type="button" className="refresh-btn" onClick={fetchDashboard}>
            <FaSyncAlt /> Refresh
          </button>
          <button type="button" className="logout-btn" onClick={handleLogout}>
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading ? (
        <div className="loading">Loading doctor dashboard...</div>
      ) : (
        <>
          {showProfileTab ? (
            renderProfile()
          ) : (
            <>
              <div className="stats-grid">
                <div className="stat-card appointments" style={{ cursor: 'pointer' }} onClick={() => { setActiveTab('overview'); setAppointmentFilter('all'); setShowProfileTab(false); }}>
                  <div className="stat-info">
                    <h3>Today's Appointments</h3>
                    <p>{getAppointmentsForToday().length}</p>
                  </div>
                  <div className="stat-icon-wrapper">
                    <FaRegCalendar />
                  </div>
                </div>

                <div className="stat-card patients" style={{ cursor: 'pointer' }} onClick={() => { setActiveTab('allPatients'); setShowProfileTab(false); }}>
                  <div className="stat-info">
                    <h3>Total Patients</h3>
                    <p>{allPatients.length}</p>
                  </div>
                  <div className="stat-icon-wrapper">
                    <FaUsers />
                  </div>
                </div>

                <div className="stat-card reviews" style={{ cursor: 'pointer' }} onClick={() => { setActiveTab('overview'); setAppointmentFilter('Follow-up'); setShowProfileTab(false); }}>
                  <div className="stat-info">
                    <h3>Follow-up</h3>
                    <p>{getFollowUpsForToday().length}</p>
                  </div>
                  <div className="stat-icon-wrapper">
                    <FaRegFileAlt />
                  </div>
                </div>

                <div className="stat-card consultations" style={{ cursor: 'pointer' }} onClick={() => { setActiveTab('overview'); setAppointmentFilter('Consultation'); setShowProfileTab(false); }}>
                  <div className="stat-info">
                    <h3>Consultations</h3>
                    <p>{getConsultationsForToday().length}</p>
                  </div>
                  <div className="stat-icon-wrapper">
                    <FaHeartbeat />
                  </div>
                </div>
              </div>

              <div className="tabs">
                <button 
                  className={`tab ${activeTab === 'overview' ? 'active' : ''}`} 
                  type="button" 
                  onClick={() => { setActiveTab('overview'); setShowProfileTab(false); }}
                >
                  Overview
                </button>
                <button 
                  className={`tab ${activeTab === 'patients' ? 'active' : ''}`} 
                  type="button" 
                  onClick={() => { setActiveTab('patients'); setShowProfileTab(false); }}
                >
                  Assigned Patients
                </button>
                <button 
                  className={`tab ${activeTab === 'allPatients' ? 'active' : ''}`} 
                  type="button" 
                  onClick={() => { setActiveTab('allPatients'); setShowProfileTab(false); }}
                >
                  All Patients
                </button>
                <button 
                  className={`tab ${activeTab === 'records' ? 'active' : ''}`} 
                  type="button" 
                  onClick={() => { setActiveTab('records'); setShowProfileTab(false); }}
                >
                  Medical Records
                </button>
                <button 
                  className={`tab ${activeTab === 'shifts' ? 'active' : ''}`} 
                  type="button" 
                  onClick={() => { setActiveTab('shifts'); setShowProfileTab(false); }}
                >
                  Shift Timetable
                </button>
                <button 
                  className={`tab ${activeTab === 'onsiteRx' ? 'active' : ''}`} 
                  type="button" 
                  onClick={() => { setActiveTab('onsiteRx'); setShowProfileTab(false); }}
                >
                  <FaFileMedical style={{ marginRight: 6 }} />
                  Onsite Prescriptions {onsitePrescriptions.length > 0 && <span className="badge-count">{onsitePrescriptions.length}</span>}
                </button>
              </div>

              <div className="tab-content">
                {activeTab === 'overview' && (
                  <div className="dashboard-content-grid">
                    <div className="schedule-container">
                      <div className="schedule-header">
                        <h2>
                          Today's {appointmentFilter === 'all' ? '' : appointmentFilter + ' '}Appointments
                          {appointmentFilter !== 'all' && (
                            <button 
                              onClick={() => setAppointmentFilter('all')} 
                              style={{ marginLeft: '10px', fontSize: '12px', color: '#3498db', border: 'none', background: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              Show All
                            </button>
                          )}
                        </h2>
                        <p>Your schedule for {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                      <div className="appointments-list">
                        {(() => {
                          const todayApts = getAppointmentsForToday();
                          const filtered = appointmentFilter === 'all'
                            ? todayApts
                            : todayApts.filter(apt => apt.type === appointmentFilter);
                          
                          if (filtered.length === 0) {
                            return <p style={{ fontStyle: 'italic', color: '#94a3b8', padding: '15px 0' }}>No {appointmentFilter === 'all' ? '' : appointmentFilter.toLowerCase() + ' '}appointments scheduled for today.</p>;
                          }

                          return filtered.map((apt) => (
                            <div className="appointment-card" key={apt.id}>
                              <div className="appointment-card-header">
                                <span className="appointment-time-badge">
                                  <FaRegClock /> {apt.time}
                                </span>
                                <span className={`appointment-type-tag ${apt.type.toLowerCase().replace(' ', '-')}`}>
                                  {apt.type}
                                </span>
                              </div>
                              <div className="appointment-card-body">
                                <h3 className="appointment-patient-name" style={{ color: '#2c3e50' }}>{apt.patientName}</h3>
                                <p className="appointment-reason" style={{ margin: '5px 0' }}>{apt.reason}</p>
                              </div>
                              <div className="appointment-card-footer" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', fontSize: '12px', color: '#64748b' }}>
                                <FaCheckCircle /> {apt.status}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    <div className="recent-patients-container">
                      <div className="recent-patients-header">
                        <h2>Recent Patients</h2>
                        <p>Recently seen</p>
                      </div>
                    </div>
                  </div>
                )}
                 {activeTab === 'patients' && renderPatients()}
                 {activeTab === 'allPatients' && renderAllPatients()}
                 {activeTab === 'records' && renderRecords()}
                {activeTab === 'shifts' && (
                  <div className="table-card">
                    <h2>My Personal Shift Timetable</h2>
                    {personalShifts.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                          const dayShifts = personalShifts.filter(s => s.day === day);
                          return (
                            <div key={day} style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', border: '1px solid #eef2f5' }}>
                              <h4 style={{ borderBottom: '2px solid #3498db', paddingBottom: '8px', color: '#2c3e50', margin: '0 0 12px 0', fontSize: '15px', fontWeight: '600' }}>{day}</h4>
                              {dayShifts.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {dayShifts.map((s) => (
                                    <div key={s._id} style={{ border: '1px solid #eef2f5', padding: '10px', borderRadius: '6px', fontSize: '13px', backgroundColor: '#f8fafc' }}>
                                      <strong style={{ display: 'block', color: '#2c3e50' }}>{s.shiftType} Shift</strong>
                                      <div style={{ color: '#555', marginTop: '5px', fontSize: '12px' }}>
                                        <div>🕒 {s.startTime} - {s.endTime}</div>
                                        {s.notes && <div style={{ fontStyle: 'italic', color: '#888', marginTop: '3px' }}>📝 {s.notes}</div>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : <p style={{ fontStyle: 'italic', color: '#aaa', fontSize: '13px', margin: 0 }}>No shifts assigned</p>}
                            </div>
                          );
                        })}
                      </div>
                    ) : <p className="no-data">No shifts scheduled for this week.</p>}
                  </div>
                )}
                {activeTab === 'onsiteRx' && (
                  <div className="table-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div>
                        <h2 style={{ margin: 0 }}>Onsite Patient Prescriptions</h2>
                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>Prescriptions written for walk-in (onsite) patients — stored only in your records.</p>
                      </div>
                    </div>
                    {onsitePrescriptions.length === 0 ? (
                      <p className="no-data">No onsite prescriptions written yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {onsitePrescriptions.map((rx) => (
                          <div key={rx._id} style={{
                            background: '#fff',
                            borderRadius: 10,
                            border: '1px solid #e2e8f0',
                            padding: '16px 20px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 12,
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
                                <span style={{ fontWeight: 700, color: '#1e3d7a', fontSize: 15 }}>{rx.patientName}</span>
                                <span style={{ fontSize: 12, background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 12, fontWeight: 500 }}>Onsite</span>
                                <span style={{ fontSize: 12, color: '#94a3b8' }}>{rx.patientAge && `Age ${rx.patientAge}`} {rx.patientGender}</span>
                              </div>
                              <div style={{ fontSize: 13, color: '#334155', marginBottom: 4 }}>
                                <strong>Condition:</strong> {rx.condition}
                              </div>
                              {rx.treatment && (
                                <div style={{ fontSize: 13, color: '#334155', marginBottom: 4 }}>
                                  <strong>Treatment:</strong> {rx.treatment}
                                </div>
                              )}
                              {rx.medications && rx.medications.length > 0 && (
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                                  <strong>Medications:</strong> {rx.medications.map(m => `${m.name} (${m.dosage}, ${m.frequency})`).join(' • ')}
                                </div>
                              )}
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                                {new Date(rx.diagnosisDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </div>
                            </div>
                            <button
                              className="submit-btn"
                              style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13 }}
                              onClick={() => downloadOnsitePrescriptionPDF(rx)}
                            >
                              <FaDownload /> Download PDF
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
      
      {/* ── ACTION MENU ── */}
      {actionMenu && (
        <div
          className="patient-action-overlay"
          onClick={() => setActionMenu(null)}
        >
          <div className="patient-action-menu" onClick={(e) => e.stopPropagation()}>
            <div className="patient-action-header">
              <span className="patient-action-icon">👤</span>
              <div>
                <p className="patient-action-title">Select Action</p>
                <p className="patient-action-name">{actionMenu.patientName}</p>
              </div>
              <button className="patient-action-close" onClick={() => setActionMenu(null)}>✕</button>
            </div>
            <div className="patient-action-buttons">
              <button
                className="action-btn action-btn-profile"
                onClick={() => handleViewProfile(actionMenu.patientId)}
              >
                <span className="action-btn-icon">🩺</span>
                <div>
                  <strong>View Profile</strong>
                  <p>Patient info &amp; medical history</p>
                </div>
              </button>
              <button
                className="action-btn action-btn-prescription"
                onClick={() => handleOpenPrescription(actionMenu.patientId, actionMenu.patientName, actionMenu.patientType || 'registered')}
              >
                <span className="action-btn-icon">✍️</span>
                <div>
                  <strong>Write Prescription</strong>
                  <p>{actionMenu.patientType === 'onsite' ? "Saved to your onsite records (downloadable PDF)" : "Sent to patient's medical records"}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PATIENT PROFILE MODAL (no payments / appointments) ── */}
      {viewingProfile && (
        <div className="modal-overlay" onClick={() => setViewingProfile(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setViewingProfile(null)}>✕</button>
            <h2 className="modal-title">Patient Profile — {viewingProfile.profile?.name}</h2>

            <div className="modal-two-col">
              {/* Left: personal info */}
              <div className="modal-section">
                <h3 className="modal-section-title">Personal Information</h3>
                {[
                  ['Patient Type', viewingProfile.profile?.patientType || 'Registered'],
                  ['Name', viewingProfile.profile?.name],
                  ['Email', viewingProfile.profile?.email],
                  ['Age', viewingProfile.profile?.age],
                  ['Gender', viewingProfile.profile?.gender],
                  ['Blood Type', viewingProfile.profile?.bloodType],
                  ['Telephone', viewingProfile.profile?.telephone],
                  ['Address', viewingProfile.profile?.address],
                  ['Allergies', (viewingProfile.profile?.allergies || []).join(', ') || 'None'],
                  ['Emergency Contact', viewingProfile.profile?.emergencyContact],
                  ...(viewingProfile.profile?.patientType === 'Onsite' ? [
                    ['Bed / Room', viewingProfile.profile?.bed || 'None'],
                    ['Admitted At', viewingProfile.profile?.admittedAt ? new Date(viewingProfile.profile.admittedAt).toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'],
                    ['Assigned Doctor', viewingProfile.profile?.assignedDoctor?.name || 'None'],
                    ['Assigned Nurse', viewingProfile.profile?.assignedNurse?.name || 'None'],
                  ] : [])
                ].map(([label, val]) => (
                  <div key={label} className="modal-field">
                    <span className="modal-field-label">{label}</span>
                    <span className="modal-field-value">{val || 'N/A'}</span>
                  </div>
                ))}
              </div>

              {/* Right: medical history entries */}
              <div className="modal-section">
                <h3 className="modal-section-title">Medical History</h3>
                {Array.isArray(viewingProfile.medicalHistory) && viewingProfile.medicalHistory.length > 0 ? (
                  <div className="med-history-list">
                    {viewingProfile.medicalHistory.map((entry, i) => (
                      <div key={i} className="med-history-card">
                        <div className="med-history-row">
                          <span className="med-badge">{entry.condition || 'Unknown condition'}</span>
                          <span className="med-date">{entry.diagnosisDate ? new Date(entry.diagnosisDate).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        {entry.symptoms && <p className="med-treatment"><strong>Symptoms:</strong> {entry.symptoms}</p>}
                        {entry.treatment && <p className="med-treatment"><strong>Treatment:</strong> {entry.treatment}</p>}
                        {entry.prescribedBy?.name && (
                          <p className="med-prescribed">Prescribed by: {entry.prescribedBy.name}</p>
                        )}
                        {entry.medications && entry.medications.length > 0 && (
                          <div className="med-meds">
                            <strong>Medications:</strong>
                            <ul>
                              {entry.medications.map((m, mi) => (
                                <li key={mi}>{m.name} — {m.dosage}, {m.frequency}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="modal-empty">No medical history recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── WRITE PRESCRIPTION MODAL ── */}
      {prescriptionModal && (
        <div className="modal-overlay" onClick={() => { if (!prescriptionLoading) setPrescriptionModal(null); }}>
          <div className="modal-box modal-box-wide" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setPrescriptionModal(null)} disabled={prescriptionLoading}>✕</button>
            <h2 className="modal-title">✍️ Write Prescription</h2>
            <p className="modal-subtitle">Patient: <strong>{prescriptionModal.patientName}</strong></p>

            {prescriptionSuccess ? (
              <div className="prescription-success">
                <span className="prescription-success-icon">✅</span>
                <p>{prescriptionSuccess}</p>
                <button
                  className="action-btn action-btn-profile"
                  style={{ width: '100%', marginTop: '12px' }}
                  onClick={() => setPrescriptionModal(null)}
                >
                  Close
                </button>
              </div>
            ) : (
              <form className="prescription-form" onSubmit={handleSubmitPrescription}>
                <div className="prx-two-col">
                  <div className="prx-field">
                    <label>Condition / Diagnosis <span className="req">*</span></label>
                    <input
                      type="text"
                      value={prescriptionForm.condition}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, condition: e.target.value })}
                      placeholder="e.g. Hypertension"
                      required
                    />
                  </div>
                  <div className="prx-field">
                    <label>Diagnosis Date</label>
                    <input
                      type="date"
                      value={prescriptionForm.diagnosisDate}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, diagnosisDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="prx-field">
                  <label>Symptoms</label>
                  <textarea
                    rows={2}
                    value={prescriptionForm.symptoms}
                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, symptoms: e.target.value })}
                    placeholder="Describe patient symptoms..."
                  />
                </div>

                <div className="prx-field">
                  <label>Treatment Plan</label>
                  <textarea
                    rows={3}
                    value={prescriptionForm.treatment}
                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, treatment: e.target.value })}
                    placeholder="Describe the treatment plan..."
                  />
                </div>

                <div className="prx-field">
                  <label>Additional Notes</label>
                  <textarea
                    rows={2}
                    value={prescriptionForm.notes}
                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, notes: e.target.value })}
                    placeholder="Follow-up instructions, lifestyle advice, etc."
                  />
                </div>

                {/* Medications */}
                <div className="prx-field">
                  <div className="prx-med-header">
                    <label>Medications</label>
                    <button type="button" className="prx-add-med" onClick={addMedRow}>+ Add</button>
                  </div>
                  {prescriptionForm.medications.map((med, idx) => (
                    <div key={idx} className="prx-med-row">
                      <input
                        type="text"
                        placeholder="Name"
                        value={med.name}
                        onChange={(e) => handleMedChange(idx, 'name', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Dosage"
                        value={med.dosage}
                        onChange={(e) => handleMedChange(idx, 'dosage', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Frequency"
                        value={med.frequency}
                        onChange={(e) => handleMedChange(idx, 'frequency', e.target.value)}
                      />
                      {prescriptionForm.medications.length > 1 && (
                        <button type="button" className="prx-remove-med" onClick={() => removeMedRow(idx)}>✕</button>
                      )}
                    </div>
                  ))}
                </div>

                {error && <div className="alert alert-error" style={{ marginBottom: '10px' }}>{error}</div>}

                <div className="prx-actions">
                  <button type="button" className="cancel-btn" onClick={() => setPrescriptionModal(null)} disabled={prescriptionLoading}>Cancel</button>
                  <button type="submit" className="submit-btn" disabled={prescriptionLoading}>
                    {prescriptionLoading ? 'Submitting...' : '✅ Submit Prescription'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocDashboard;