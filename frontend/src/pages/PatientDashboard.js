import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import './PatientDashboard.css';
import { FaUser, FaCalendarAlt, FaUserMd, FaMobileAlt, FaCheckCircle, FaTimes, FaLock } from 'react-icons/fa';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PatientDashboard = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  // ── Core state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Profile editing ──────────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [showProfileTab, setShowProfileTab] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', age: '', gender: '',
    bloodType: '', address: '', telephone: '', allergies: ''
  });

  // ── Booking flow state ───────────────────────────────────────────────────────
  const [allShifts, setAllShifts] = useState([]);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingStep, setBookingStep] = useState('form'); // 'form' | 'payment'

  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null); // { doctorId, name, department }
  const [appointmentType, setAppointmentType] = useState(''); // 'Consultation' | 'Follow-up'
  const [paymentMethod, setPaymentMethod] = useState('');    // 'MTN Mobile Money' | 'Orange Mobile Money'
  const [simulationStatus, setSimulationStatus] = useState(''); // '' | 'sending' | 'waiting' | 'verifying'
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // ── Fetch data ───────────────────────────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, appointmentsRes, historyRes, billsRes, shiftsRes] = await Promise.all([
        API.get(`/patients/profile/${userId}`),
        API.get(`/patients/appointments/${userId}`),
        API.get(`/patients/medicalHistory/${userId}`),
        API.get(`/patients/bills/${userId}`),
        API.get('/shifts')
      ]);

      setProfile(profileRes.data.user);
      setAppointments(appointmentsRes.data.appointments || []);
      setMedicalHistory(historyRes.data.medicalHistory);
      setBills(billsRes.data.bills || []);
      setAllShifts(shiftsRes.data.shifts || []);
      setError('');
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || !token) { navigate('/'); return; }
    fetchAllData();
  }, [userId, token, navigate, fetchAllData]);

  // ── Compute available doctors from shifts ─────────────────────────────────
  useEffect(() => {
    if (!bookingDate || !bookingTime || allShifts.length === 0) {
      setAvailableDoctors([]);
      return;
    }

    const selectedDayName = DAYS[new Date(bookingDate + 'T12:00:00').getDay()];
    const [selHour, selMin] = bookingTime.split(':').map(Number);
    const selMinutes = selHour * 60 + selMin;

    // Filter doctor shifts for selected day where time falls within shift window (08:00–15:00)
    const doctorShifts = allShifts.filter(shift => {
      if (shift.staffType !== 'doctor') return false;
      if (shift.day !== selectedDayName) return false;

      const [startH, startM] = shift.startTime.split(':').map(Number);
      const [endH, endM] = shift.endTime.split(':').map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;

      return selMinutes >= startMin && selMinutes < endMin;
    });

    // Deduplicate by doctor ID
    const seen = new Set();
    const doctors = [];
    for (const shift of doctorShifts) {
      const doc = shift.doctor;
      if (!doc) continue;
      const id = doc._id || doc;
      if (!seen.has(id.toString())) {
        seen.add(id.toString());
        doctors.push({
          doctorId: id.toString(),
          name: doc.name || 'Doctor',
          department: doc.department || 'General',
          shiftType: shift.shiftType
        });
      }
    }
    setAvailableDoctors(doctors);
    setSelectedDoctor(null); // reset selection when date/time changes
  }, [bookingDate, bookingTime, allShifts]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getMinDate = () => new Date().toISOString().split('T')[0];

  const handleTimeChange = (e) => {
    const val = e.target.value;
    const [h] = val.split(':').map(Number);
    if (h < 8 || h >= 15) {
      setBookingError('Please select a time between 08:00 and 15:00.');
      setBookingTime(val);
    } else {
      setBookingError('');
      setBookingTime(val);
    }
  };

  const resetBookingForm = () => {
    setShowBookingForm(false);
    setBookingStep('form');
    setBookingDate('');
    setBookingTime('');
    setSelectedDoctor(null);
    setAppointmentType('');
    setPaymentMethod('');
    setAvailableDoctors([]);
    setBookingError('');
  };

  // ── Proceed from form to payment step (consultation) or book directly (follow-up) ─
  const handleProceedBooking = (e) => {
    e.preventDefault();
    if (!bookingDate || !bookingTime) { setBookingError('Please select a date and time.'); return; }
    if (!selectedDoctor) { setBookingError('Please select a doctor.'); return; }
    if (!appointmentType) { setBookingError('Please choose Consultation or Follow-up.'); return; }

    const [h] = bookingTime.split(':').map(Number);
    if (h < 8 || h >= 15) { setBookingError('Time must be between 08:00 and 15:00.'); return; }

    setBookingError('');

    if (appointmentType === 'Consultation') {
      setBookingStep('payment');
    } else {
      handleBookFollowUp();
    }
  };

  // ── Book follow-up directly ───────────────────────────────────────────────
  const handleBookFollowUp = async () => {
    setBookingLoading(true);
    try {
      const res = await API.post(`/patients/appointments/${userId}`, {
        doctorId: selectedDoctor.doctorId,
        date: bookingDate,
        time: bookingTime,
        reason: 'Follow-up'
      });
      setAppointments(prev => [...prev, res.data.appointment]);
      setSuccess('Follow-up appointment booked successfully!');
      resetBookingForm();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setBookingError(err.response?.data?.message || 'Failed to book appointment');
    } finally {
      setBookingLoading(false);
    }
  };

  // ── Make consultation payment and book ────────────────────────────────────
  const handleMakePayment = async (e) => {
    e.preventDefault();
    if (!paymentMethod) { setBookingError('Please select a payment method.'); return; }
    setBookingLoading(true);
    setBookingError('');
    try {
      // 1. Simulate sending USSD payment request (1.5 seconds)
      setSimulationStatus('sending');
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 2. Simulate waiting for pin entry (2.5 seconds)
      setSimulationStatus('waiting');
      await new Promise(resolve => setTimeout(resolve, 2500));

      // 3. Simulate verification/finalizing (1.5 seconds)
      setSimulationStatus('verifying');
      await new Promise(resolve => setTimeout(resolve, 1500));

      const res = await API.post(`/patients/appointments/${userId}`, {
        doctorId: selectedDoctor.doctorId,
        date: bookingDate,
        time: bookingTime,
        reason: 'Consultation',
        paymentMethod: paymentMethod + ' (Simulated)'
      });
      setAppointments(prev => [...prev, res.data.appointment]);
      if (res.data.billing) setBills(prev => [...prev, res.data.billing]);
      setSuccess(`Consultation booked & simulated payment of 1,000 FCFA via ${paymentMethod} completed!`);
      resetBookingForm();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setBookingError(err.response?.data?.message || 'Payment simulation failed. Please try again.');
    } finally {
      setBookingLoading(false);
      setSimulationStatus('');
    }
  };

  const handleProfileChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

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
        setFormData(prev => ({ ...prev, profilepicture: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

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
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('name');
    navigate('/');
  };

  if (loading && !profile) return <div className="loading">Loading dashboard...</div>;

  // ────────────────────────────────────────────────────────────────────────────
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
          {/* Tabs */}
          <div className="tabs">
            <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => { setActiveTab('profile'); setEditMode(false); }}>Profile</button>
            <button className={`tab ${activeTab === 'appointments' ? 'active' : ''}`}
              onClick={() => setActiveTab('appointments')}>Appointments</button>
            <button className={`tab ${activeTab === 'medical' ? 'active' : ''}`}
              onClick={() => setActiveTab('medical')}>Medical History</button>
            <button className={`tab ${activeTab === 'bills' ? 'active' : ''}`}
              onClick={() => setActiveTab('bills')}>History of Payment</button>
          </div>

          <div className="tab-content">

            {/* ── Profile Tab ───────────────────────────────────────────────── */}
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
                        name: profile.name, email: profile.email,
                        age: profile.age || '', gender: profile.gender || '',
                        bloodType: profile.bloodType || '', address: profile.address || '',
                        telephone: profile.telephone || '', allergies: profile.allergies || '',
                        profilepicture: profile.profilepicture || ''
                      });
                    }}>Edit Profile</button>
                  </div>
                ) : (
                  <form className="profile-form" onSubmit={handleUpdateProfile}>
                    {[
                      { label: 'Name', name: 'name', type: 'text' },
                      { label: 'Email', name: 'email', type: 'email' },
                      { label: 'Age', name: 'age', type: 'number' },
                      { label: 'Blood Type', name: 'bloodType', type: 'text' },
                      { label: 'Telephone', name: 'telephone', type: 'tel' },
                    ].map(f => (
                      <div className="form-group" key={f.name}>
                        <label>{f.label}:</label>
                        <input type={f.type} name={f.name}
                          value={formData[f.name]} onChange={handleProfileChange} required={f.name === 'name' || f.name === 'email'} />
                      </div>
                    ))}
                    <div className="form-group">
                      <label>Gender:</label>
                      <select name="gender" value={formData.gender} onChange={handleProfileChange}>
                        <option value="">Select Gender</option>
                        <option>Male</option><option>Female</option><option>Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Address:</label>
                      <textarea name="address" value={formData.address} onChange={handleProfileChange} />
                    </div>
                    <div className="form-group">
                      <label>Allergies:</label>
                      <textarea name="allergies" value={formData.allergies} onChange={handleProfileChange} />
                    </div>
                    <div className="form-group">
                      <label>Profile Picture:</label>
                      <input type="file" accept="image/*" onChange={handleImageChange} />
                      {formData.profilepicture && (
                        <div style={{ marginTop: '10px' }}>
                          <img src={formData.profilepicture} alt="Preview" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #0775ea' }} />
                        </div>
                      )}
                    </div>
                    <div className="form-buttons">
                      <button type="submit" className="submit-btn" disabled={loading}>Save Changes</button>
                      <button type="button" className="cancel-btn" onClick={() => setEditMode(false)}>Cancel</button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* ── Appointments Tab ──────────────────────────────────────────── */}
            {activeTab === 'appointments' && (
              <div className="appointments-section">
                <h2>Appointments</h2>

                {/* Book Appointment Button */}
                {!showBookingForm ? (
                  <button className="book-btn" onClick={() => setShowBookingForm(true)}>
                    <FaCalendarAlt /> Book New Appointment
                  </button>
                ) : (
                  <div className="booking-panel">
                    <div className="booking-panel-header">
                      <h3><FaCalendarAlt /> {bookingStep === 'form' ? 'Book New Appointment' : 'Complete Payment'}</h3>
                      <button className="close-booking-btn" onClick={resetBookingForm} type="button">
                        <FaTimes />
                      </button>
                    </div>

                    {bookingError && <div className="alert alert-error" style={{ margin: '0 0 15px 0' }}>{bookingError}</div>}

                    {/* ── Step 1: Date / Time / Doctor / Type ── */}
                    {bookingStep === 'form' && (
                      <form onSubmit={handleProceedBooking}>
                        {/* Date & Time row */}
                        <div className="booking-row">
                          <div className="form-group">
                            <label>Appointment Date</label>
                            <input type="date" value={bookingDate} min={getMinDate()}
                              onChange={e => setBookingDate(e.target.value)} required />
                          </div>
                          <div className="form-group">
                            <label>Appointment Time <span className="time-hint">(08:00 – 15:00)</span></label>
                            <input type="time" value={bookingTime} min="08:00" max="15:00"
                              onChange={handleTimeChange} required />
                          </div>
                        </div>

                        {/* Available Doctors */}
                        {bookingDate && bookingTime && (
                          <div className="doctors-section">
                            <h4 className="doctors-heading">
                              <FaUserMd /> Available Doctors
                              {availableDoctors.length > 0
                                ? ` (${availableDoctors.length} found)`
                                : ' — No doctors scheduled for this date/time'}
                            </h4>
                            {availableDoctors.length > 0 && (
                              <div className="doctor-cards-grid">
                                {availableDoctors.map(doc => (
                                  <div
                                    key={doc.doctorId}
                                    className={`doctor-card ${selectedDoctor?.doctorId === doc.doctorId ? 'selected' : ''}`}
                                    onClick={() => setSelectedDoctor(doc)}
                                  >
                                    <div className="doctor-card-avatar">
                                      <FaUserMd />
                                    </div>
                                    <div className="doctor-card-info">
                                      <h4>{doc.name}</h4>
                                      <p>{doc.department}</p>
                                      <span className="shift-badge">{doc.shiftType} Shift</span>
                                    </div>
                                    {selectedDoctor?.doctorId === doc.doctorId && (
                                      <FaCheckCircle className="selected-check" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Appointment type */}
                        {selectedDoctor && (
                          <div className="type-section">
                            <h4>Type of Appointment</h4>
                            <div className="type-cards">
                              <div
                                className={`type-card ${appointmentType === 'Consultation' ? 'selected' : ''}`}
                                onClick={() => setAppointmentType('Consultation')}
                              >
                                <div className="type-card-icon">🩺</div>
                                <div>
                                  <strong>Consultation</strong>
                                  <p>First visit / new issue</p>
                                </div>
                                {appointmentType === 'Consultation' && <FaCheckCircle className="selected-check" />}
                              </div>
                              <div
                                className={`type-card ${appointmentType === 'Follow-up' ? 'selected' : ''}`}
                                onClick={() => setAppointmentType('Follow-up')}
                              >
                                <div className="type-card-icon">🔄</div>
                                <div>
                                  <strong>Follow-up</strong>
                                  <p>Ongoing treatment</p>
                                </div>
                                {appointmentType === 'Follow-up' && <FaCheckCircle className="selected-check" />}
                              </div>
                            </div>

                            {/* Price indicator */}
                            {appointmentType === 'Consultation' && (
                              <div className="price-banner">
                                💳 Consultation fee: <strong>1 000 FCFA</strong> — payable at next step
                              </div>
                            )}
                            {appointmentType === 'Follow-up' && (
                              <div className="price-banner free">
                                ✅ Follow-up is <strong>Free</strong>
                              </div>
                            )}
                          </div>
                        )}

                        <button type="submit" className="submit-btn booking-submit" disabled={bookingLoading}>
                          {bookingLoading ? 'Processing…' : appointmentType === 'Follow-up' ? 'Book Appointment (Free)' : 'Continue to Payment →'}
                        </button>
                      </form>
                    )}

                    {/* ── Step 2: Payment ── */}
                    {bookingStep === 'payment' && (
                      simulationStatus ? (
                        <div className="payment-simulation-container">
                          <div className="simulation-phone-card">
                            <div className="phone-screen">
                              <div className="status-indicator">
                                <div className="pulse-indicator"></div>
                                <span>SIMULATED PAYMENT PROMPT</span>
                              </div>
                              
                              {simulationStatus === 'sending' && (
                                <div className="sim-step">
                                  <FaMobileAlt className="sim-icon pulse" />
                                  <h3>Sending Prompt...</h3>
                                  <p>Sending a simulated USSD push notification for <strong>1,000 FCFA</strong> to your phone via <strong>{paymentMethod}</strong>.</p>
                                </div>
                              )}
                              
                              {simulationStatus === 'waiting' && (
                                <div className="sim-step">
                                  <div className="keypad-icon-wrapper">
                                    <FaLock className="sim-icon bounce" />
                                  </div>
                                  <h3>Waiting for PIN Entry</h3>
                                  <p>A simulated USSD prompt has been sent. Please type your PIN on your phone to complete authorization.</p>
                                  <div className="sim-mock-pin">
                                    <div className="dots">
                                      <span className="dot active"></span>
                                      <span className="dot active"></span>
                                      <span className="dot active"></span>
                                      <span className="dot"></span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {simulationStatus === 'verifying' && (
                                <div className="sim-step">
                                  <FaCheckCircle className="sim-icon success-pulse" />
                                  <h3>Verifying Payment</h3>
                                  <p>PIN entry confirmed. Verifying simulated transaction records and finalizing appointment booking...</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <form onSubmit={handleMakePayment} className="payment-form">
                          <div className="payment-summary">
                            <div className="payment-summary-row">
                              <span>Doctor</span>
                              <strong>{selectedDoctor?.name}</strong>
                            </div>
                            <div className="payment-summary-row">
                              <span>Date</span>
                              <strong>{new Date(bookingDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                            </div>
                            <div className="payment-summary-row">
                              <span>Time</span>
                              <strong>{bookingTime}</strong>
                            </div>
                            <div className="payment-summary-row total">
                              <span>Amount Due</span>
                              <strong className="amount">1 000 FCFA</strong>
                            </div>
                          </div>

                          <h4><FaMobileAlt /> Select Payment Method (Simulation)</h4>
                          <div className="payment-methods">
                            <label className={`payment-method-card ${paymentMethod === 'MTN Mobile Money' ? 'selected' : ''}`}>
                              <input type="radio" name="paymentMethod" value="MTN Mobile Money"
                                checked={paymentMethod === 'MTN Mobile Money'}
                                onChange={e => setPaymentMethod(e.target.value)} />
                              <div className="method-logo mtn">MTN</div>
                              <div>
                                <strong>MTN Mobile Money</strong>
                                <p>Pay via MTN MoMo (Simulated)</p>
                              </div>
                            </label>
                            <label className={`payment-method-card ${paymentMethod === 'Orange Mobile Money' ? 'selected' : ''}`}>
                              <input type="radio" name="paymentMethod" value="Orange Mobile Money"
                                checked={paymentMethod === 'Orange Mobile Money'}
                                onChange={e => setPaymentMethod(e.target.value)} />
                              <div className="method-logo orange">Orange</div>
                              <div>
                                <strong>Orange Mobile Money</strong>
                                <p>Pay via Orange Money (Simulated)</p>
                              </div>
                            </label>
                          </div>

                          <div className="payment-actions">
                            <button type="button" className="cancel-btn" onClick={() => setBookingStep('form')}>← Back</button>
                            <button type="submit" className="submit-btn pay-btn" disabled={bookingLoading || !paymentMethod}>
                              {bookingLoading ? 'Processing payment…' : '💳 Make Payment & Book'}
                            </button>
                          </div>
                        </form>
                      )
                    )}
                  </div>
                )}

                {/* Existing appointments list */}
                <div className="appointments-list" style={{ marginTop: '30px' }}>
                  <h3>Your Appointments</h3>
                  {appointments.length === 0 ? (
                    <p className="no-data">No appointments yet</p>
                  ) : (
                    <table className="appointments-table">
                      <thead>
                        <tr>
                          <th>Doctor</th>
                          <th>Date</th>
                          <th>Time</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map(apt => (
                          <tr key={apt._id}>
                            <td>{apt.doctor?.name || apt.doctor || 'N/A'}</td>
                            <td>{new Date(apt.appointmentDate || apt.date).toLocaleDateString()}</td>
                            <td>{apt.time}</td>
                            <td><span className={`apt-type-badge ${apt.reason === 'Consultation' ? 'consultation' : 'followup'}`}>{apt.reason || 'N/A'}</span></td>
                            <td><span className={`status ${apt.status}`}>{apt.status}</span></td>
                            <td>
                              {apt.status !== 'cancelled' && (
                                <button className="cancel-appointment-btn"
                                  onClick={() => handleCancelAppointment(apt._id)}>Cancel</button>
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

            {/* ── Medical History Tab ──────────────────────────────────────── */}
            {activeTab === 'medical' && (
              <div className="medical-section">
                <h2>Medical History</h2>
                {medicalHistory ? (
                  <div className="medical-info"><p>{medicalHistory}</p></div>
                ) : (
                  <p className="no-data">No medical history recorded</p>
                )}
              </div>
            )}

            {/* ── History of Payment Tab ───────────────────────────────────── */}
            {activeTab === 'bills' && (
              <div className="bills-section">
                <h2>History of Payment</h2>
                {bills.length === 0 ? (
                  <p className="no-data">No payment history found</p>
                ) : (
                  <table className="bills-table">
                    <thead>
                      <tr>
                        <th>Receipt #</th>
                        <th>Description</th>
                        <th>Amount (FCFA)</th>
                        <th>Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map(bill => (
                        <tr key={bill._id}>
                          <td style={{ fontFamily: 'monospace' }}>{bill._id.slice(-8).toUpperCase()}</td>
                          <td>{bill.charges?.[0]?.description || 'Consultation Fee'}</td>
                          <td><strong>{bill.totalcharges} FCFA</strong></td>
                          <td>{new Date(bill.createdAt).toLocaleDateString()}</td>
                          <td>
                            <span className={`status ${bill.balance === 0 ? 'confirmed' : 'pending'}`}>
                              {bill.balance === 0 ? 'Paid' : 'Pending'}
                            </span>
                          </td>
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

      {/* ── Profile Sidebar Tab ──────────────────────────────────────────────── */}
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
