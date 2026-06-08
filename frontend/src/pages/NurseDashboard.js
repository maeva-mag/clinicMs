import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  FaClock
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
  const [personalShifts, setPersonalShifts] = useState([]);

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

  const bedNames = [
    'Room 101', 'Room 102', 'Room 103', 'Room 104', 
    'Room 201', 'Room 202', 'Room 203', 'Room 204', 
    'Room 301', 'Room 302', 'Room 303', 'Room 304'
  ];

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, patientsRes, shiftsRes] = await Promise.all([
        API.get(`/nurses/nurseProfile/${nurseId}`),
        API.get('/nurses/patients'),
        API.get('/shifts/personal'),
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

    return (
      <div className="profile-card">
        <div className="profile-header">
          <h2>Nurse Profile</h2>
          <button type="button" className="close-profile-btn" onClick={() => setShowProfileTab(false)}>
            <FaArrowLeft /> Back to Dashboard
          </button>
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
      <h2>Patients List</h2>
      {patients.length === 0 ? (
        <p className="no-data">No patients available.</p>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Admission Status</th>
                <th>Bed Assigned</th>
                <th>Contact</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => {
                const isOnsite = patient.patientType === 'Onsite';
                const admitted = patient.admittedAt && !patient.dischargedAt;
                const discharged = patient.dischargedAt;
                const status = isOnsite ? (discharged ? 'Discharged' : admitted ? 'Admitted' : 'Awaiting Admission') : 'Registered';
                
                return (
                  <tr key={patient._id}>
                    <td><strong>{patient.name || 'N/A'}</strong></td>
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

  const renderRegisterForm = () => (
    <div className="register-form-container">
      <h2>Register Onsite Patient</h2>
      <form className="patient-register-form" onSubmit={handleRegisterPatient}>
        <div className="form-group">
          <label>Full Name *</label>
          <input 
            type="text" 
            name="name" 
            value={regForm.name} 
            onChange={handleRegChange} 
            placeholder="John Doe" 
            required 
          />
        </div>
        <div className="form-group">
          <label>Age *</label>
          <input 
            type="number" 
            name="age" 
            value={regForm.age} 
            onChange={handleRegChange} 
            placeholder="35" 
            required 
          />
        </div>
        <div className="form-group">
          <label>Gender *</label>
          <select name="gender" value={regForm.gender} onChange={handleRegChange} required>
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label>Blood Type *</label>
          <select name="bloodType" value={regForm.bloodType} onChange={handleRegChange} required>
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
        <div className="form-group">
          <label>Telephone *</label>
          <input 
            type="text" 
            name="telephone" 
            value={regForm.telephone} 
            onChange={handleRegChange} 
            placeholder="123-456-7890" 
            required 
          />
        </div>
        <div className="form-group">
          <label>Email *</label>
          <input 
            type="email" 
            name="email" 
            value={regForm.email} 
            onChange={handleRegChange} 
            placeholder="john.doe@example.com" 
            required 
          />
        </div>
        <div className="form-group">
          <label>Emergency Contact Number *</label>
          <input 
            type="number" 
            name="emergencyContact" 
            value={regForm.emergencyContact} 
            onChange={handleRegChange} 
            placeholder="1234567890" 
            required 
          />
        </div>
        <div className="form-group">
          <label>Allergies (comma-separated)</label>
          <input 
            type="text" 
            name="allergies" 
            value={regForm.allergies} 
            onChange={handleRegChange} 
            placeholder="Peanuts, Penicillin" 
          />
        </div>
        <div className="form-group form-group-full">
          <label>Address *</label>
          <textarea 
            name="address" 
            value={regForm.address} 
            onChange={handleRegChange} 
            placeholder="123 Main St, Anytown" 
            required 
          />
        </div>
        <div className="form-group form-group-full form-buttons-row">
          <button type="submit" className="submit-btn">Register Patient</button>
          <button type="button" className="cancel-btn" onClick={() => { setActiveTab('patients'); setError(''); }}>Cancel</button>
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
              </div>

              {/* Tab Content */}
              <div className="tab-content">
                {activeTab === 'patients' && renderPatients()}
                {activeTab === 'beds' && renderBeds()}
                {activeTab === 'register' && renderRegisterForm()}
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
    </div>
  );
};

export default NurseDashboard;
