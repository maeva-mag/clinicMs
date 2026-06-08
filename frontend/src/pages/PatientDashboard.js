import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import './PatientDashboard.css';
import { FaUser } from 'react-icons/fa';

const PatientDashboard = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  // State management
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [editMode, setEditMode] = useState(false);
  const [showProfileTab, setShowProfileTab] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: '',
    gender: '',
    bloodType: '',
    address: '',
    telephone: '',
    allergies: ''
  });

  const [appointmentForm, setAppointmentForm] = useState({
    doctorId: '',
    date: '',
    time: ''
  });

  // Fetch all patient data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, appointmentsRes, historyRes, billsRes] = await Promise.all([
        API.get(`/patients/profile/${userId}`),
        API.get(`/patients/appointments/${userId}`),
        API.get(`/patients/medicalHistory/${userId}`),
        API.get(`/patients/bills/${userId}`)
      ]);

      setProfile(profileRes.data.user);
      setAppointments(appointmentsRes.data.appointments || []);
      setMedicalHistory(historyRes.data.medicalHistory);
      setBills(billsRes.data.bills || []);
      setError('');
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || !token) {
      navigate('/');
      return;
    }
    fetchAllData();
  }, [userId, token, navigate, fetchAllData]);

  // Handle profile form changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle appointment form changes
  const handleAppointmentChange = (e) => {
    const { name, value } = e.target;
    setAppointmentForm({ ...appointmentForm, [name]: value });
  };

  // Update profile
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await API.put(`/patients/profile/${userId}`, formData);
      setProfile(response.data.user);
      setEditMode(false);
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Make appointment
  const handleMakeAppointment = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await API.post(`/patients/appointments/${userId}`, appointmentForm);
      setAppointments([...appointments, response.data.appointment]);
      setAppointmentForm({ doctorId: '', date: '', time: '' });
      setSuccess('Appointment created successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to create appointment');
    } finally {
      setLoading(false);
    }
  };

  // Cancel appointment
  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;

    setLoading(true);
    try {
      await API.delete(`/patients/appointments/${userId}/${appointmentId}`);
      setAppointments(appointments.filter(apt => apt._id !== appointmentId));
      setSuccess('Appointment cancelled successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to cancel appointment');
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('name');
    navigate('/');
  };

  if (loading && !profile) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="patient-dashboard">
      {/* Header */}
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
            <h1>Patient Dashboard</h1>
            <h2>Welcome {profile?.name || 'Patient'}</h2>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </header>

      {/* Alerts */}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {!showProfileTab && (
      <>
      {/* Navigation Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => { setActiveTab('profile'); setEditMode(false); }}
        >
          Profile
        </button>
        <button
          className={`tab ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          Appointments
        </button>
        <button
          className={`tab ${activeTab === 'medical' ? 'active' : ''}`}
          onClick={() => setActiveTab('medical')}
        >
          Medical History
        </button>
        <button
          className={`tab ${activeTab === 'bills' ? 'active' : ''}`}
          onClick={() => setActiveTab('bills')}
        >
          Bills
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Profile Tab */}
        {activeTab === 'profile' && profile && (
          <div className="profile-section">
            <h2>My Profile</h2>
            {!editMode ? (
              <div className="profile-view">
                <div className="profile-info">
                  <p><strong>Name:</strong> {profile.name}</p>
                  <p><strong>Email:</strong> {profile.email}</p>
                  <p><strong>Age:</strong> {profile.age || 'N/A'}</p>
                  <p><strong>Gender:</strong> {profile.gender || 'N/A'}</p>
                  <p><strong>Blood Type:</strong> {profile.bloodType || 'N/A'}</p>
                  <p><strong>Address:</strong> {profile.address || 'N/A'}</p>
                  <p><strong>Telephone:</strong> {profile.telephone || 'N/A'}</p>
                  <p><strong>Allergies:</strong> {profile.allergies || 'None'}</p>
                </div>
                <button className="edit-btn" onClick={() => {
                  setEditMode(true);
                  setFormData({
                    name: profile.name,
                    email: profile.email,
                    age: profile.age || '',
                    gender: profile.gender || '',
                    bloodType: profile.bloodType || '',
                    address: profile.address || '',
                    telephone: profile.telephone || '',
                    allergies: profile.allergies || ''
                  });
                }}>Edit Profile</button>
              </div>
            ) : (
              <form className="profile-form" onSubmit={handleUpdateProfile}>
                <div className="form-group">
                  <label>Name:</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleProfileChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email:</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleProfileChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Age:</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleProfileChange}
                  />
                </div>
                <div className="form-group">
                  <label>Gender:</label>
                  <select name="gender" value={formData.gender} onChange={handleProfileChange}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Blood Type:</label>
                  <input
                    type="text"
                    name="bloodType"
                    value={formData.bloodType}
                    onChange={handleProfileChange}
                  />
                </div>
                <div className="form-group">
                  <label>Address:</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleProfileChange}
                  ></textarea>
                </div>
                <div className="form-group">
                  <label>Telephone:</label>
                  <input
                    type="tel"
                    name="telephone"
                    value={formData.telephone}
                    onChange={handleProfileChange}
                  />
                </div>
                <div className="form-group">
                  <label>Allergies:</label>
                  <textarea
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleProfileChange}
                  ></textarea>
                </div>
                <div className="form-buttons">
                  <button type="submit" className="submit-btn" disabled={loading}>Save Changes</button>
                  <button type="button" className="cancel-btn" onClick={() => setEditMode(false)}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className="appointments-section">
            <h2>Appointments</h2>

            {/* Make New Appointment */}
            <div className="new-appointment">
              <h3>Book New Appointment</h3>
              <form onSubmit={handleMakeAppointment} className="appointment-form">
                <div className="form-group">
                  <label>Doctor ID:</label>
                  <input
                    type="text"
                    name="doctorId"
                    value={appointmentForm.doctorId}
                    onChange={handleAppointmentChange}
                    placeholder="Enter doctor ID"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Date:</label>
                  <input
                    type="date"
                    name="date"
                    value={appointmentForm.date}
                    onChange={handleAppointmentChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Time:</label>
                  <input
                    type="time"
                    name="time"
                    value={appointmentForm.time}
                    onChange={handleAppointmentChange}
                    required
                  />
                </div>
                <button type="submit" className="submit-btn" disabled={loading}>Book Appointment</button>
              </form>
            </div>

            {/* Appointments List */}
            <div className="appointments-list">
              <h3>Your Appointments</h3>
              {appointments.length === 0 ? (
                <p className="no-data">No appointments yet</p>
              ) : (
                <table className="appointments-table">
                  <thead>
                    <tr>
                      <th>Doctor ID</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map(apt => (
                      <tr key={apt._id}>
                        <td>{apt.doctor}</td>
                        <td>{new Date(apt.date).toLocaleDateString()}</td>
                        <td>{apt.time}</td>
                        <td><span className={`status ${apt.status}`}>{apt.status}</span></td>
                        <td>
                          {apt.status !== 'cancelled' && (
                            <button
                              className="cancel-appointment-btn"
                              onClick={() => handleCancelAppointment(apt._id)}
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Medical History Tab */}
        {activeTab === 'medical' && (
          <div className="medical-section">
            <h2>Medical History</h2>
            {medicalHistory ? (
              <div className="medical-info">
                <p>{medicalHistory}</p>
              </div>
            ) : (
              <p className="no-data">No medical history recorded</p>
            )}
          </div>
        )}

        {/* Bills Tab */}
        {activeTab === 'bills' && (
          <div className="bills-section">
            <h2>Bills & Payments</h2>
            {bills.length === 0 ? (
              <p className="no-data">No bills</p>
            ) : (
              <table className="bills-table">
                <thead>
                  <tr>
                    <th>Bill ID</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map(bill => (
                    <tr key={bill._id}>
                      <td>{bill._id.slice(0, 8)}</td>
                      <td>${bill.amount || 'N/A'}</td>
                      <td>{new Date(bill.createdAt).toLocaleDateString()}</td>
                      <td><span className={`status ${bill.status}`}>{bill.status || 'Pending'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
      </>
      )}
      {showProfileTab && (
        <div className="profile-section">
          <div className="profile-header">
            <h2>My Profile</h2>
            <button type="button" className="close-btn" onClick={() => setShowProfileTab(false)}>Close</button>
          </div>
          {profile && (
            <div className="profile-view">
              <div className="profile-info">
                <p><strong>Name:</strong> {profile.name}</p>
                <p><strong>Email:</strong> {profile.email}</p>
                <p><strong>Age:</strong> {profile.age || 'N/A'}</p>
                <p><strong>Gender:</strong> {profile.gender || 'N/A'}</p>
                <p><strong>Blood Type:</strong> {profile.bloodType || 'N/A'}</p>
                <p><strong>Address:</strong> {profile.address || 'N/A'}</p>
                <p><strong>Telephone:</strong> {profile.telephone || 'N/A'}</p>
                <p><strong>Allergies:</strong> {profile.allergies || 'None'}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
