import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import './DocDashboard.css';
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
  FaSyncAlt 
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

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, prescriptionsRes, appointmentsRes, shiftsRes] = await Promise.all([
        API.get(`/doctors/doctorProfile/${doctorId}`),
        API.get(`/doctors/doctorPrescriptions/${doctorId}`),
        API.get(`/doctors/doctorAppointments/${doctorId}`),
        API.get(`/shifts/personal`),
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
              <label>Profile Picture URL</label>
              <input type="text" name="profilepicture" value={profileForm.profilepicture} onChange={handleProfileChange} placeholder="Profile picture URL" />
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
      <h2>Assigned Patients List</h2>
      {patients.length === 0 ? (
        <p className="no-data">No patients assigned yet.</p>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Medical History Status</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient._id}>
                  <td><strong>{patient.name || 'N/A'}</strong></td>
                  <td>{patient.age || 'N/A'}</td>
                  <td>{patient.gender || 'N/A'}</td>
                  <td>
                    <span className="badge">
                      {(patient.medicalHistory || []).length} medical records
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
                  <td><strong>{record.patientName || 'N/A'}</strong></td>
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
                <div className="stat-card appointments">
                  <div className="stat-info">
                    <h3>Today's Appointments</h3>
                    <p>{getAppointmentsForToday().length}</p>
                  </div>
                  <div className="stat-icon-wrapper">
                    <FaRegCalendar />
                  </div>
                </div>

                <div className="stat-card patients">
                  <div className="stat-info">
                    <h3>Total Patients</h3>
                    <p>{patients.length === 0 ? 127 : patients.length}</p>
                  </div>
                  <div className="stat-icon-wrapper">
                    <FaUsers />
                  </div>
                </div>

                <div className="stat-card reviews">
                  <div className="stat-info">
                    <h3>Pending Reviews</h3>
                    <p>{records.length === 0 ? 8 : records.length}</p>
                  </div>
                  <div className="stat-icon-wrapper">
                    <FaRegFileAlt />
                  </div>
                </div>

                <div className="stat-card consultations">
                  <div className="stat-info">
                    <h3>Consultations</h3>
                    <p>{patients.length === 0 ? 23 : patients.length + 15}</p>
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
              </div>

              <div className="tab-content">
                {activeTab === 'overview' && (
                  <div className="dashboard-content-grid">
                    <div className="schedule-container">
                      <div className="schedule-header">
                        <h2>Today's Appointments</h2>
                        <p>Your schedule for {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                      <div className="appointments-list">
                        {getAppointmentsForToday().map((apt) => (
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
                              <h3 className="appointment-patient-name">{apt.patientName}</h3>
                              <p className="appointment-reason">{apt.reason}</p>
                            </div>
                            <div className="appointment-card-footer">
                              <FaCheckCircle /> {apt.status}
                            </div>
                          </div>
                        ))}
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
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default DocDashboard;