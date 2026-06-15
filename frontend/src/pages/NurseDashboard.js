import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import API from '../services/api';
import './NurseDashboard.css';
import { 
  FaUser, 
  FaUsers, 
  FaClipboardList, 
  FaBed, 
  FaUserPlus, 
  FaSignOutAlt, 
  FaSyncAlt, 
  FaArrowLeft,
  FaClock,
  FaSearch,
  FaPhone,
  FaBriefcaseMedical
} from 'react-icons/fa';

const NurseDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  const nurseId = localStorage.getItem('userId');

  const [profile, setProfile] = useState(null);
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState({ onsite: 0, registered: 0, admitted: 0, discharged: 0, occupiedBeds: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('patients'); // patients, beds, register
  const [showProfileTab, setShowProfileTab] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({
    ward: '',
    telephone: '',
    address: '',
    gender: '',
    profilepicture: ''
  });
  const [personalShifts, setPersonalShifts] = useState([]);
  const [myPatients, setMyPatients] = useState([]);
  const [showOnlyMyPatients, setShowOnlyMyPatients] = useState(false);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [viewingPatientId, setViewingPatientId] = useState(null);
  const [viewingPatientData, setViewingPatientData] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [viewingPatientLoading, setViewingPatientLoading] = useState(false);

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

  // Bed allocation states
  const [selectedBed, setSelectedBed] = useState(null);
  const [assignPatientId, setAssignPatientId] = useState('');

  // Onsite patient registration form states
  const [regForm, setRegForm] = useState({
    name: '',
    age: '',
    gender: '',
    bloodType: '',
    telephone: '',
    allergies: '',
    address: '',
    emergencyContact: '',
    email: ''
  });

  // Billing states
  const [billingList, setBillingList] = useState([]);
  const [billingForm, setBillingForm] = useState({
    patientName: '',
    charges: [{ description: '', amount: '', unit: 'FCFA' }],
    payments: [{ description: 'Initial Payment', amount: '' }]
  });

  const bedNames = [
    'Room 101', 'Room 102', 'Room 103', 'Room 104', 
    'Room 201', 'Room 202', 'Room 203', 'Room 204', 
    'Room 301', 'Room 302', 'Room 303', 'Room 304'
  ];

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, patientsRes, shiftsRes, myPatientsRes] = await Promise.all([
        API.get(`/nurses/nurseProfile/${nurseId}`),
        API.get('/nurses/patients'),
        API.get('/shifts/personal'),
        API.get('/nurses/myPatients'),
      ]);

      const nurseProfile = profileRes.data.nurse;
      const allPatients = patientsRes.data.patients || [];

      const onsitePatients = allPatients.filter((item) => item.patientType === 'Onsite');
      const registeredPatients = allPatients.filter((item) => item.patientType === 'Registered');
      
      const admittedCount = onsitePatients.filter((p) => p.admittedAt && !p.dischargedAt).length;
      const dischargedCount = onsitePatients.filter((p) => p.dischargedAt).length;
      const occupiedBedsCount = onsitePatients.filter((p) => p.admittedAt && !p.dischargedAt && p.bed).length;

      setProfile(nurseProfile);
      setPatients(allPatients);
      setMyPatients(myPatientsRes.data.patients || []);
      setPersonalShifts(shiftsRes.data.shifts || []);
      setStats({
        onsite: onsitePatients.length,
        registered: registeredPatients.length,
        admitted: admittedCount,
        discharged: dischargedCount,
        occupiedBeds: occupiedBedsCount
      });
      setError('');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load nurse dashboard');
    } finally {
      setLoading(false);
    }
  }, [nurseId]);

  useEffect(() => {
    if (!token || userRole !== 'nurse') {
      navigate('/staffLogin');
      return;
    }
    if (!nurseId) {
      setError('Nurse ID missing. Please log in again.');
      setLoading(false);
      return;
    }
    loadDashboard();
  }, [token, userRole, nurseId, navigate, loadDashboard]);

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
      const response = await API.put(`/nurses/nurseProfile/${nurseId}`, profileForm);
      setProfile(response.data.nurse || profile);
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

  const handleStatusAction = async (patient) => {
    if (!patient._id) return;
    try {
      setLoading(true);
      const isCurrentlyAdmitted = patient.admittedAt && !patient.dischargedAt;
      
      // If discharging, release bed first if they have one
      if (isCurrentlyAdmitted && patient.bed) {
        await API.delete(`/nurses/patients/${patient._id}/bed`);
      }

      const endpoint = isCurrentlyAdmitted ?
        `/nurses/patients/${patient._id}/discharge` :
        `/nurses/patients/${patient._id}/admit`;

      await API.put(endpoint);
      setSuccess(`Patient ${isCurrentlyAdmitted ? 'discharged' : 'admitted'} successfully.`);
      await loadDashboard();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  // Bed allocation handlers
  const handleAllocateBed = async (e, bedName) => {
    e.preventDefault();
    if (!assignPatientId) {
      setError('Please select a patient to allocate the bed.');
      return;
    }

    setLoading(true);
    try {
      await API.post(`/nurses/patients/${assignPatientId}/bed`, { bed: bedName });
      setSuccess(`Bed ${bedName} allocated successfully.`);
      setSelectedBed(null);
      setAssignPatientId('');
      await loadDashboard();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Bed allocation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseBed = async (patientId) => {
    if (!window.confirm('Are you sure you want to release this bed?')) return;

    setLoading(true);
    try {
      await API.delete(`/nurses/patients/${patientId}/bed`);
      setSuccess('Bed released successfully.');
      await loadDashboard();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to release bed.');
    } finally {
      setLoading(false);
    }
  };

  // Registration Form handlers
  const handleRegChange = (e) => {
    const { name, value } = e.target;
    setRegForm({ ...regForm, [name]: value });
  };

  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    const { name, age, gender, bloodType, telephone, address, emergencyContact, email } = regForm;
    if (!name || !age || !gender || !bloodType || !telephone || !address || !emergencyContact || !email) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...regForm,
        age: Number(age),
        emergencyContact: Number(emergencyContact),
        allergies: regForm.allergies ? regForm.allergies.split(',').map(s => s.trim()).filter(Boolean) : []
      };

      await API.post('/nurses/patients/onsite', payload);
      setSuccess('Onsite patient registered successfully.');
      setRegForm({
        name: '',
        age: '',
        gender: '',
        bloodType: '',
        telephone: '',
        allergies: '',
        address: '',
        emergencyContact: '',
        email: ''
      });
      setActiveTab('patients');
      await loadDashboard();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  // Pre-filter unassigned admitted onsite patients
  const getAssignablePatients = () => {
    return patients.filter(
      (p) => p.patientType === 'Onsite' && p.admittedAt && !p.dischargedAt && !p.bed
    );
  };

  const renderProfile = () => {
    if (!profile) return <p className="no-data">No profile available.</p>;

    if (editMode) {
      return (
        <div className="profile-card">
          <div className="profile-header">
            <h2>Edit Nurse Profile</h2>
            <button type="button" className="close-profile-btn" onClick={() => setEditMode(false)}>
              <FaArrowLeft /> Cancel
            </button>
          </div>
          <form className="profile-form" onSubmit={handleSaveProfile}>
            <div className="form-row">
              <label>Name</label>
              <input type="text" value={profile.name || 'Unknown'} disabled />
            </div>
            <div className="form-row">
              <label>Email</label>
              <input type="email" value={profile.email || 'Not available'} disabled />
            </div>
            <div className="form-row">
              <label>Ward</label>
              <input type="text" name="ward" value={profileForm.ward} onChange={handleProfileChange} placeholder="Ward" />
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
              <button type="button" className="cancel-btn" onClick={() => setEditMode(false)}>Cancel</button>
            </div>
          </form>
        </div>
      );
    }

    return (
      <div className="profile-card">
        <div className="profile-header">
          <h2>Nurse Profile</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="edit-btn" onClick={() => {
              setEditMode(true);
              setProfileForm({
                ward: profile.ward || '',
                telephone: profile.telephone || '',
                address: profile.address || '',
                gender: profile.gender || '',
                profilepicture: profile.profilepicture || ''
              });
            }}>
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
            <span>{profile.name || 'Unknown'}</span>
          </div>
          <div>
            <p>Email</p>
            <span>{profile.email || 'Not available'}</span>
          </div>
          <div>
            <p>Ward</p>
            <span>{profile.ward || 'Not assigned'}</span>
          </div>
          <div>
            <p>Telephone</p>
            <span>{profile.telephone || 'Not available'}</span>
          </div>
          <div>
            <p>Address</p>
            <span>{profile.address || 'Not available'}</span>
          </div>
          <div>
            <p>Gender</p>
            <span>{profile.gender || 'Not set'}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderPatients = () => (
    <div className="table-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h2 style={{ margin: 0 }}>Patients List</h2>
          <div className="nurse-toggle-container">
            <button 
              className={`toggle-btn ${!showOnlyMyPatients ? 'active' : ''}`}
              type="button"
              onClick={() => setShowOnlyMyPatients(false)}
            >
              All Patients
            </button>
            <button 
              className={`toggle-btn ${showOnlyMyPatients ? 'active' : ''}`}
              type="button"
              onClick={() => setShowOnlyMyPatients(true)}
            >
              My Patients ({myPatients.length})
            </button>
          </div>
        </div>
        <div className="search-container" style={{ position: 'relative' }}>
          <div 
            onClick={() => setShowSearch(!showSearch)} 
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#fff', borderRadius: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', color: '#1abc9c', border: '1px solid #d7e2f4' }}
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
      {(showOnlyMyPatients ? myPatients : patients).length === 0 ? (
        <p className="no-data">
          {showOnlyMyPatients ? "No patients assigned to you yet." : "No patients available."}
        </p>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Admission Status</th>
                <th>Bed Assigned</th>
                <th>Assigned Doctor</th>
                <th>Assigned Nurse</th>
                <th>Contact</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {(showOnlyMyPatients ? myPatients : patients).map((patient) => {
                const isOnsite = patient.patientType === 'Onsite';
                const admitted = patient.admittedAt && !patient.dischargedAt;
                const discharged = patient.dischargedAt;
                const status = isOnsite ? (discharged ? 'Discharged' : admitted ? 'Admitted' : 'Awaiting Admission') : 'Registered';
                
                // Fallback logic for assigned nurse name
                const docName = patient.assignedDoctor?.name ? `Dr. ${patient.assignedDoctor.name}` : (patient.assignedDoctor ? `Dr. ${patient.assignedDoctor}` : 'Unassigned');
                const nurseName = patient.assignedNurse?.name || (patient.assignedNurse === nurseId ? (profile?.name || 'Me') : (patient.assignedNurse ? 'Assigned' : 'Unassigned'));

                return (
                  <tr key={patient._id}>
                    <td>
                      <span 
                        onClick={() => handleViewPatientDashboard(patient._id)} 
                        style={{ color: '#1abc9c', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
                      >
                        {patient.name || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${isOnsite ? 'patient-onsite' : 'patient-registered'}`}>
                        {patient.patientType || 'Registered'}
                      </span>
                    </td>
                    <td>{status}</td>
                    <td>
                      {isOnsite && admitted ? (
                        patient.bed ? (
                          <span className="badge bed-assigned">{patient.bed}</span>
                        ) : (
                          <span className="badge no-bed">None</span>
                        )
                      ) : (
                        <span className="text-muted">N/A</span>
                      )}
                    </td>
                    <td>
                      {patient.assignedDoctor ? (
                        <span className="nurse-staff-badge nurse-doc-badge">{docName}</span>
                      ) : (
                        <span className="nurse-staff-badge nurse-unassigned-badge">Unassigned</span>
                      )}
                    </td>
                    <td>
                      {patient.assignedNurse ? (
                        <span className="nurse-staff-badge nurse-nurse-badge">{nurseName}</span>
                      ) : (
                        <span className="nurse-staff-badge nurse-unassigned-badge">Unassigned</span>
                      )}
                    </td>
                    <td>{patient.telephone || patient.email || 'N/A'}</td>
                    <td>
                      {isOnsite && (
                        <button
                          className={`action-btn ${admitted ? 'discharge' : ''}`}
                          type="button"
                          onClick={() => handleStatusAction(patient)}
                        >
                          {admitted ? 'Discharge' : 'Admit'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderBeds = () => {
    const assignable = getAssignablePatients();

    return (
      <div className="table-card beds-container">
        <h2>Bed Assignment & Ward Status</h2>
        <div className="beds-grid">
          {bedNames.map((bedName) => {
            // Find patient currently occupying this bed
            const occupant = patients.find(
              (p) => p.patientType === 'Onsite' && p.admittedAt && !p.dischargedAt && p.bed === bedName
            );

            if (occupant) {
              return (
                <div className="bed-card occupied" key={bedName}>
                  <div className="bed-header">
                    <span className="bed-number">{bedName}</span>
                    <span className="bed-status-pill">Occupied</span>
                  </div>
                  <div className="bed-body">
                    <h4 className="bed-patient-name">{occupant.name}</h4>
                    <span className="bed-time">
                      <FaClock /> Admitted: {new Date(occupant.admittedAt).toLocaleDateString()} {new Date(occupant.admittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button 
                      type="button" 
                      className="release-bed-btn" 
                      onClick={() => handleReleaseBed(occupant._id)}
                    >
                      Release Bed
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div className="bed-card free" key={bedName}>
                <div className="bed-header">
                  <span className="bed-number">{bedName}</span>
                  <span className="bed-status-pill">Free</span>
                </div>
                <div className="bed-body">
                  {selectedBed === bedName ? (
                    <form className="bed-allocation-form" onSubmit={(e) => handleAllocateBed(e, bedName)}>
                      <select 
                        value={assignPatientId} 
                        onChange={(e) => setAssignPatientId(e.target.value)}
                        required
                      >
                        <option value="">Select Admitted Patient</option>
                        {assignable.map((p) => (
                          <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                      </select>
                      <button type="submit" className="bed-assign-btn">Assign</button>
                      <button type="button" className="cancel-btn" style={{ padding: '6px', fontSize: '0.8rem', marginTop: '4px' }} onClick={() => setSelectedBed(null)}>Cancel</button>
                    </form>
                  ) : (
                    <div className="free-prompt" onClick={() => { setSelectedBed(bedName); setAssignPatientId(''); }}>
                      + Click to Allocate Bed
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const fetchBilling = useCallback(async () => {
    try {
      const res = await API.get('/admin/billing');
      setBillingList(res.data.records || []);
    } catch (err) {
      console.error('Failed to load billing history:', err);
      setError('Failed to load billing history');
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'billing') {
      fetchBilling();
    }
  }, [activeTab, fetchBilling]);

  const handleAddChargeRow = () => {
    setBillingForm(prev => ({
      ...prev,
      charges: [...prev.charges, { description: '', amount: '', unit: 'FCFA' }]
    }));
  };

  const handleChargeRowChange = (idx, field, val) => {
    const updatedCharges = [...billingForm.charges];
    updatedCharges[idx][field] = val;
    setBillingForm(prev => ({
      ...prev,
      charges: updatedCharges
    }));
  };

  const handleDeleteChargeRow = (idx) => {
    setBillingForm(prev => ({
      ...prev,
      charges: prev.charges.filter((_, i) => i !== idx)
    }));
  };

  const handleAddPaymentRow = () => {
    setBillingForm(prev => ({
      ...prev,
      payments: [...prev.payments, { description: '', amount: '' }]
    }));
  };

  const handlePaymentRowChange = (idx, field, val) => {
    const updatedPayments = [...billingForm.payments];
    updatedPayments[idx][field] = val;
    setBillingForm(prev => ({
      ...prev,
      payments: updatedPayments
    }));
  };

  const handleDeletePaymentRow = (idx) => {
    setBillingForm(prev => ({
      ...prev,
      payments: prev.payments.filter((_, i) => i !== idx)
    }));
  };

  const handleSaveBilling = async (e) => {
    e.preventDefault();
    if (!billingForm.patientName) {
      setError('Please enter patient name.');
      return;
    }
    setError('');
    setSuccess('');

    const formattedCharges = billingForm.charges.map(c => ({
      description: c.description,
      amount: Number(c.amount),
      unit: c.unit || 'FCFA'
    }));

    const formattedPayments = billingForm.payments.map(p => ({
      description: p.description,
      amount: Number(p.amount)
    }));

    try {
      const res = await API.post('/nurses/billing', {
        patientName: billingForm.patientName,
        charges: formattedCharges,
        paymentsandadjustments: formattedPayments
      });

      setSuccess('Billing record saved successfully!');
      
      // Reset form
      setBillingForm({
        patientName: '',
        charges: [{ description: '', amount: '', unit: 'FCFA' }],
        payments: [{ description: 'Initial Payment', amount: '' }]
      });

      // Reload billing list
      fetchBilling();

      // Download newly created invoice PDF
      downloadInvoicePDF(res.data.billing);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error('Failed to save billing record:', err);
      setError(err.response?.data?.message || 'Failed to save billing record');
    }
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
    doc.text(`By Nurse: Nurse ${profile?.name || 'Staff'}`, 14, finalY + 30);
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

  const renderBillingTab = () => {
    const totalCharges = billingForm.charges.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const totalPayments = billingForm.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const balance = totalCharges - totalPayments;

    return (
      <div className="billing-tab-container">
        {/* Left Side: Create Invoice Form */}
        <div className="table-card create-billing-card">
          <h2>Create New Invoice / Bill</h2>
          <form className="billing-form" onSubmit={handleSaveBilling}>
            <div className="form-group">
              <label>Patient Name *</label>
              <input 
                type="text" 
                placeholder="Enter patient name..."
                value={billingForm.patientName} 
                onChange={(e) => setBillingForm({ ...billingForm, patientName: e.target.value })}
                required
              />
            </div>

            <div className="form-section-divider">
              <h4>Expenditures & Charges</h4>
              <button 
                type="button" 
                className="add-item-row-btn"
                onClick={handleAddChargeRow}
              >
                + Add Charge Item
              </button>
            </div>

            {billingForm.charges.map((charge, idx) => (
              <div key={idx} className="billing-row-items">
                <div className="form-group flex-3">
                  <label>Description *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Consultation, Paracetamol, Lab Test"
                    value={charge.description} 
                    onChange={(e) => handleChargeRowChange(idx, 'description', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group flex-1">
                  <label>Amount *</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={charge.amount} 
                    onChange={(e) => handleChargeRowChange(idx, 'amount', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group flex-1">
                  <label>Unit</label>
                  <input 
                    type="text" 
                    value={charge.unit} 
                    onChange={(e) => handleChargeRowChange(idx, 'unit', e.target.value)}
                    required
                  />
                </div>
                {billingForm.charges.length > 1 && (
                  <button 
                    type="button" 
                    className="delete-row-btn" 
                    onClick={() => handleDeleteChargeRow(idx)}
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}

            <div className="form-section-divider">
              <h4>Payments Received</h4>
              <button 
                type="button" 
                className="add-item-row-btn"
                onClick={handleAddPaymentRow}
              >
                + Add Payment Item
              </button>
            </div>

            {billingForm.payments.map((payment, idx) => (
              <div key={idx} className="billing-row-items">
                <div className="form-group flex-3">
                  <label>Payment Description *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Deposit, Cash, Mobile Money"
                    value={payment.description} 
                    onChange={(e) => handlePaymentRowChange(idx, 'description', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group flex-1">
                  <label>Amount *</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={payment.amount} 
                    onChange={(e) => handlePaymentRowChange(idx, 'amount', e.target.value)}
                    required
                  />
                </div>
                {billingForm.payments.length > 1 && (
                  <button 
                    type="button" 
                    className="delete-row-btn" 
                    onClick={() => handleDeletePaymentRow(idx)}
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}

            <div className="billing-summary-block">
              <div className="summary-item">
                <span>Total Charges:</span>
                <span className="summary-value charges">{totalCharges.toLocaleString()} FCFA</span>
              </div>
              <div className="summary-item">
                <span>Total Paid:</span>
                <span className="summary-value payments">{totalPayments.toLocaleString()} FCFA</span>
              </div>
              <div className="summary-item balance-due">
                <span>Balance Due:</span>
                <span className={`summary-value balance ${balance > 0 ? 'due' : 'paid'}`}>
                  {balance.toLocaleString()} FCFA
                </span>
              </div>
            </div>

            <div className="billing-metadata-info" style={{ marginTop: '15px', padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #eef2f6', fontSize: '0.88rem', color: '#64748b' }}>
              <div style={{ marginBottom: '6px' }}><strong>By Nurse:</strong> Nurse {profile?.name || 'Staff'}</div>
              <div><strong>Date & Time:</strong> {new Date().toLocaleString()}</div>
            </div>

            <div className="form-buttons-row">
              <button type="submit" className="submit-btn">Save & Print Invoice</button>
            </div>
          </form>
        </div>

        {/* Right Side: Billing History */}
        <div className="table-card billing-history-card">
          <h2>Billing History & Invoices</h2>
          <div className="history-list-wrapper">
            {billingList.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Patient</th>
                    <th>Charges</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {billingList.map((bill, idx) => (
                    <tr key={idx}>
                      <td>{new Date(bill.createdAt).toLocaleDateString()}</td>
                      <td>
                        <strong>{bill.patientName || bill.patient?.name || 'N/A'}</strong>
                        {bill.patientModel && (
                          <span className={`badge ${bill.patientModel === 'NonUser' ? 'patient-onsite' : 'patient-registered'}`} style={{ display: 'block', width: 'fit-content', marginTop: '4px', fontSize: '10px' }}>
                            {bill.patientModel === 'NonUser' ? 'Onsite' : 'Registered'}
                          </span>
                        )}
                      </td>
                      <td style={{ color: '#2c3e50', fontWeight: '500' }}>{bill.totalcharges.toLocaleString()} {bill.charges?.[0]?.unit || 'FCFA'}</td>
                      <td style={{ color: '#219653', fontWeight: '500' }}>{bill.totalpayment.toLocaleString()} {bill.charges?.[0]?.unit || 'FCFA'}</td>
                      <td style={{ color: bill.balance > 0 ? '#ef4444' : '#219653', fontWeight: '600' }}>
                        {bill.balance.toLocaleString()} {bill.charges?.[0]?.unit || 'FCFA'}
                      </td>
                      <td>
                        <button 
                          type="button" 
                          className="action-btn invoice-download-btn"
                          onClick={() => downloadInvoicePDF(bill)}
                        >
                          PDF Invoice
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="no-data">No billing history found.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderRegisterForm = () => (
    <div className="register-form-container">
      <div className="register-form-header">
        <div className="header-icon-wrapper">
          <FaUserPlus />
        </div>
        <div>
          <h2>Register Onsite Patient</h2>
          <p className="subtitle">Enter the patient's personal, contact, and medical details below to register them onsite.</p>
        </div>
      </div>

      <form className="patient-register-form" onSubmit={handleRegisterPatient}>
        {/* Section 1: Personal Profile */}
        <div className="form-section span-2">
          <h3 className="section-title">
            <FaUser className="section-icon" /> Personal Details
          </h3>
          <div className="section-grid">
            <div className="form-group">
              <label htmlFor="reg-name">Full Name *</label>
              <div className="input-wrapper">
                <input 
                  id="reg-name"
                  type="text" 
                  name="name" 
                  value={regForm.name} 
                  onChange={handleRegChange} 
                  placeholder="John Doe" 
                  required 
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="reg-age">Age *</label>
              <div className="input-wrapper">
                <input 
                  id="reg-age"
                  type="number" 
                  name="age" 
                  value={regForm.age} 
                  onChange={handleRegChange} 
                  placeholder="35" 
                  required 
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="reg-gender">Gender *</label>
              <div className="input-wrapper">
                <select id="reg-gender" name="gender" value={regForm.gender} onChange={handleRegChange} required>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="reg-bloodType">Blood Type *</label>
              <div className="input-wrapper">
                <select id="reg-bloodType" name="bloodType" value={regForm.bloodType} onChange={handleRegChange} required>
                  <option value="">Select Blood Type</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Contact Information */}
        <div className="form-section span-2">
          <h3 className="section-title">
            <FaPhone className="section-icon" /> Contact & Communication
          </h3>
          <div className="section-grid">
            <div className="form-group">
              <label htmlFor="reg-telephone">Telephone *</label>
              <div className="input-wrapper">
                <input 
                  id="reg-telephone"
                  type="text" 
                  name="telephone" 
                  value={regForm.telephone} 
                  onChange={handleRegChange} 
                  placeholder="123-456-7890" 
                  required 
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="reg-email">Email *</label>
              <div className="input-wrapper">
                <input 
                  id="reg-email"
                  type="email" 
                  name="email" 
                  value={regForm.email} 
                  onChange={handleRegChange} 
                  placeholder="john.doe@example.com" 
                  required 
                />
              </div>
            </div>
            <div className="form-group form-group-full">
              <label htmlFor="reg-address">Address *</label>
              <div className="input-wrapper">
                <textarea 
                  id="reg-address"
                  name="address" 
                  value={regForm.address} 
                  onChange={handleRegChange} 
                  placeholder="123 Main St, Anytown" 
                  required 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Medical & Emergency */}
        <div className="form-section span-2">
          <h3 className="section-title">
            <FaBriefcaseMedical className="section-icon" /> Medical & Emergency Information
          </h3>
          <div className="section-grid">
            <div className="form-group">
              <label htmlFor="reg-emergencyContact">Emergency Contact Number *</label>
              <div className="input-wrapper">
                <input 
                  id="reg-emergencyContact"
                  type="number" 
                  name="emergencyContact" 
                  value={regForm.emergencyContact} 
                  onChange={handleRegChange} 
                  placeholder="1234567890" 
                  required 
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="reg-allergies">Allergies (comma-separated)</label>
              <div className="input-wrapper">
                <input 
                  id="reg-allergies"
                  type="text" 
                  name="allergies" 
                  value={regForm.allergies} 
                  onChange={handleRegChange} 
                  placeholder="Peanuts, Penicillin" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-buttons-row form-group-full">
          <button type="button" className="cancel-btn" onClick={() => { setActiveTab('patients'); setError(''); }}>Cancel</button>
          <button type="submit" className="submit-btn">Register Patient</button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="nurse-dashboard">
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
            <span className="dashboard-title-link" onClick={() => { setShowProfileTab(false); setActiveTab('patients'); }}>
              Nurse Dashboard
            </span>
            <h1>Welcome, {profile?.name ? `Nurse ${profile.name}` : 'Nurse'} 👋</h1>
          </div>
        </div>
        <div className="header-actions">

          <button type="button" className="refresh-btn" onClick={loadDashboard}>
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
        <div className="loading">Loading nurse dashboard...</div>
      ) : (
        <>
          {showProfileTab ? (
            renderProfile()
          ) : (
            <>
              {/* Stats Cards Row */}
              <div className="stats-grid">
                <div className="stat-card patients-assigned" onClick={() => { setActiveTab('patients'); setShowProfileTab(false); }}>
                  <div className="stat-info">
                    <h3>Patients Assigned</h3>
                    <p>{stats.admitted}</p>
                  </div>
                  <div className="stat-icon-wrapper">
                    <FaUsers />
                  </div>
                </div>

                <div className="stat-card total-patients" onClick={() => { setActiveTab('patients'); setShowProfileTab(false); }}>
                  <div className="stat-info">
                    <h3>Total Patients</h3>
                    <p>{patients.length}</p>
                  </div>
                  <div className="stat-icon-wrapper">
                    <FaClipboardList />
                  </div>
                </div>

                <div className="stat-card assign-beds" onClick={() => { setActiveTab('beds'); setShowProfileTab(false); }}>
                  <div className="stat-info">
                    <h3>Assign Beds</h3>
                    <p>{stats.occupiedBeds}</p>
                  </div>
                  <div className="stat-icon-wrapper">
                    <FaBed />
                  </div>
                </div>

                <div className="stat-card register-patient" onClick={() => { setActiveTab('register'); setShowProfileTab(false); }}>
                  <div className="stat-info">
                    <h3>Register Patient</h3>
                    <p>{stats.onsite}</p>
                  </div>
                  <div className="stat-icon-wrapper">
                    <FaUserPlus />
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="tabs">
                <button 
                  className={`tab ${activeTab === 'patients' ? 'active' : ''}`} 
                  type="button" 
                  onClick={() => { setActiveTab('patients'); setShowProfileTab(false); }}
                >
                  Patients List
                </button>
                <button 
                  className={`tab ${activeTab === 'beds' ? 'active' : ''}`} 
                  type="button" 
                  onClick={() => { setActiveTab('beds'); setShowProfileTab(false); }}
                >
                  Bed Allocation
                </button>
                <button 
                  className={`tab ${activeTab === 'register' ? 'active' : ''}`} 
                  type="button" 
                  onClick={() => { setActiveTab('register'); setShowProfileTab(false); }}
                >
                  Onsite Registration
                </button>
                <button 
                  className={`tab ${activeTab === 'shifts' ? 'active' : ''}`} 
                  type="button" 
                  onClick={() => { setActiveTab('shifts'); setShowProfileTab(false); }}
                >
                  Shift Timetable
                </button>
                <button 
                  className={`tab ${activeTab === 'billing' ? 'active' : ''}`} 
                  type="button" 
                  onClick={() => { setActiveTab('billing'); setShowProfileTab(false); }}
                >
                  Billing
                </button>
              </div>

              {/* Tab Content */}
              <div className="tab-content">
                {activeTab === 'patients' && renderPatients()}
                {activeTab === 'beds' && renderBeds()}
                {activeTab === 'register' && renderRegisterForm()}
                {activeTab === 'billing' && renderBillingTab()}
                {activeTab === 'shifts' && (
                  <div className="table-card">
                    <h2>My Personal Shift Timetable</h2>
                    {personalShifts.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                          const dayShifts = personalShifts.filter(s => s.day === day);
                          return (
                            <div key={day} style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', border: '1px solid #eef2f5' }}>
                              <h4 style={{ borderBottom: '2px solid #1abc9c', paddingBottom: '8px', color: '#2c3e50', margin: '0 0 12px 0', fontSize: '15px', fontWeight: '600' }}>{day}</h4>
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
              </div>
            </>
          )}
        </>
      )}
      
      {viewingPatientId && viewingPatientData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '25px', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', position: 'relative', color: '#333' }}>
            <button 
              onClick={() => { setViewingPatientId(null); setViewingPatientData(null); }} 
              style={{ position: 'absolute', top: '15px', right: '15px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', fontWeight: 'bold', zIndex: 10 }}
            >
              ✕
            </button>
            
            <h2 style={{ borderBottom: '2px solid #1abc9c', paddingBottom: '10px', color: '#2c3e50', marginBottom: '20px', marginTop: 0 }}>Patient Dashboard: {viewingPatientData.profile.name}</h2>
            
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
                          <div style={{ marginTop: '5px', paddingLeft: '10px', borderLeft: '2px solid #1abc9c' }}>
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
    </div>
  );
};

export default NurseDashboard;
