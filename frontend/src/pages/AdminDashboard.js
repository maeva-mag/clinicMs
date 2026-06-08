import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import './AdminDashboard.css';
import { FaTachometerAlt, FaUserMd, FaUserInjured, FaFileInvoiceDollar, FaSignOutAlt, FaUser } from "react-icons/fa";
import logo from '../assets/clinic-logo.jpg';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  const adminName = localStorage.getItem('name');

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [billing, setBilling] = useState([]);
  const [patients, setPatients] = useState([]);
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
    if (activeTab === 'overview') fetchStats(selectedDate, selectedMonth);
  }, [activeTab, selectedDate, selectedMonth]);

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
    <li className={activeTab === 'patients' ? 'active' : ''} onClick={() => setActiveTab('patients')}>
      <FaUserInjured className="icon" /> Patients
    </li>
    <li className={activeTab === 'billing' ? 'active' : ''} onClick={() => setActiveTab('billing')}>
      <FaFileInvoiceDollar className="icon" /> Billing
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
            <div className="profile-pic" onClick={() => setShowProfileTab(true)}>
              <FaUser className="default-avatar" />
            </div>
            <div className="welcome-section">
              <h1>Admin Dashboard</h1>
              <span className="user-info">Welcome {adminName || 'Admin'}</span>
            </div>
          </div>
        </header>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="tab-content">
          {showProfileTab && (
            <div className="profile-section">
              <div className="profile-header">
                <h2>Admin Profile</h2>
                <button type="button" className="close-btn" onClick={() => setShowProfileTab(false)}>Close</button>
              </div>
              <div className="profile-info">
                <p><strong>Name:</strong> {adminName || 'N/A'}</p>
                <p><strong>Role:</strong> Admin</p>
              </div>
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
              <div className="staff-actions">
                <button className={staffView === 'form' ? 'active' : ''} onClick={() => setStaffView('form')}>Create Staff Account</button>
                <button className={staffView === 'nurses' ? 'active' : ''} onClick={() => setStaffView('nurses')}>Nurses ({staffData.nurses.length})</button>
                <button className={staffView === 'doctors' ? 'active' : ''} onClick={() => setStaffView('doctors')}>Doctors ({staffData.doctors.length})</button>
                <button className={staffView === 'shifts' ? 'active' : ''} onClick={() => setStaffView('shifts')}>Weekly Shift Timetable</button>
              </div>

              {staffView === 'form' && (
                <div className="staff-form-container">
                  <h2>Create New Staff Account</h2>
                  <form onSubmit={handleCreateStaff}>
                    <input type="text" name="name" value={staffForm.name} onChange={handleStaffChange} placeholder="Full Name" required />
                    <input type="email" name="email" value={staffForm.email} onChange={handleStaffChange} placeholder="Email" required />
                    <select name="role" value={staffForm.role} onChange={handleStaffChange}>
                      <option value="doctor">Doctor</option>
                      <option value="nurse">Nurse</option>
                    </select>
                    <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
                  </form>
                </div>
              )}

              {staffView === 'nurses' && (
                <div className="staff-list">
                  <h2>Nurses List</h2>
                  {staffData.nurses.length > 0 ? (
                    <table>
                      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Ward</th><th>Created At</th></tr></thead>
                      <tbody>
                        {staffData.nurses.map((n, idx) => (
                          <tr key={idx}>
                            <td>{n.name}</td>
                            <td>{n.email || 'N/A'}</td>
                            <td>{n.role}</td>
                            <td>{n.ward || 'N/A'}</td>
                            <td>{n.createdAt ? (new Date(n.createdAt).toLocaleDateString() + ' ' + new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <p>No nurses found</p>}
                </div>
              )}

              {staffView === 'doctors' && (
                <div className="staff-list">
                  <h2>Doctors List</h2>
                  {staffData.doctors.length > 0 ? (
                    <table>
                      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Created At</th></tr></thead>
                      <tbody>
                        {staffData.doctors.map((d, idx) => (
                          <tr key={idx}>
                            <td>{d.account?.name || d.name || 'Unknown'}</td>
                            <td>{d.account?.email || d.email || 'N/A'}</td>
                            <td>{d.account?.role || d.role || 'doctor'}</td>
                            <td>{d.department || 'N/A'}</td>
                            <td>{d.createdAt ? (new Date(d.createdAt).toLocaleDateString() + ' ' + new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <p>No doctors found</p>}
                </div>
              )}

              {staffView === 'shifts' && (
                <div className="shift-management-container" style={{ width: '100%' }}>
                  <div className="staff-form-container" style={{ maxWidth: '100%', marginBottom: '30px' }}>
                    <h2>Schedule a Shift</h2>
                    <form onSubmit={handleCreateShift} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Staff Type</label>
                        <select 
                          value={shiftForm.staffType} 
                          onChange={(e) => setShiftForm({ ...shiftForm, staffType: e.target.value, staffId: '' })}
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                        >
                          <option value="doctor">Doctor</option>
                          <option value="nurse">Nurse</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Staff Member</label>
                        <select 
                          value={shiftForm.staffId} 
                          onChange={(e) => setShiftForm({ ...shiftForm, staffId: e.target.value })}
                          required
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                        >
                          <option value="">Select Staff Member</option>
                          {getStaffOptions().map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Day of Week</label>
                        <select 
                          value={shiftForm.day} 
                          onChange={(e) => setShiftForm({ ...shiftForm, day: e.target.value })}
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                        >
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Shift Type</label>
                        <select 
                          value={shiftForm.shiftType} 
                          onChange={(e) => handleShiftTypeChange(e.target.value)}
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                        >
                          <option value="Morning">Morning (08:00 - 16:00)</option>
                          <option value="Afternoon">Afternoon (16:00 - 00:00)</option>
                          <option value="Night">Night (00:00 - 08:00)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Start Time</label>
                        <input 
                          type="text" 
                          value={shiftForm.startTime} 
                          onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                          required
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>End Time</label>
                        <input 
                          type="text" 
                          value={shiftForm.endTime} 
                          onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                          required
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                        />
                      </div>

                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Notes</label>
                        <input 
                          type="text" 
                          placeholder="E.g. Room 101 duty, on-call notes" 
                          value={shiftForm.notes} 
                          onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                        />
                      </div>

                      <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="submit-btn" style={{ padding: '12px 24px', fontWeight: 'bold' }}>Schedule Shift</button>
                      </div>
                    </form>
                  </div>

                  <div className="timetable-container" style={{ marginTop: '20px' }}>
                    <h3 style={{ color: '#2c3e50', fontSize: '20px', marginBottom: '15px' }}>General Weekly Shift Timetable</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginTop: '15px' }}>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                        const dayShifts = shifts.filter(s => s.day === day);
                        return (
                          <div key={day} style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', border: '1px solid #eef2f5' }}>
                            <h4 style={{ borderBottom: '2px solid #1abc9c', paddingBottom: '8px', color: '#1e3d7a', margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>{day}</h4>
                            {dayShifts.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {dayShifts.map((s) => {
                                  const staffName = s.staffType === 'doctor' ? (s.doctor?.name || 'Doctor') : (s.nurse?.name || 'Nurse');
                                  const deptOrWard = s.staffType === 'doctor' ? (s.doctor?.department || 'N/A') : (s.nurse?.ward || 'N/A');
                                  return (
                                    <div key={s._id} style={{ border: '1px solid #eef2f5', padding: '10px', borderRadius: '6px', position: 'relative', fontSize: '13px', backgroundColor: '#f8fafc' }}>
                                      <strong style={{ display: 'block', color: '#1e293b' }}>{staffName}</strong>
                                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>Role: {s.staffType === 'doctor' ? 'Doctor' : 'Nurse'}</span>
                                      <div style={{ color: '#475569', marginTop: '6px', fontSize: '12px' }}>
                                        <div>🕒 {s.startTime} - {s.endTime} ({s.shiftType})</div>
                                        <div>📍 {deptOrWard}</div>
                                        {s.notes && <div style={{ fontStyle: 'italic', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>📝 {s.notes}</div>}
                                      </div>
                                      <button 
                                        onClick={() => handleDeleteShift(s._id)} 
                                        style={{ position: 'absolute', top: '8px', right: '8px', background: '#fecaca', color: '#ef4444', border: 'none', borderRadius: '4px', padding: '4px 6px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}
                                      >
                                        ✕ Delete
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '13px', margin: 0 }}>No shifts assigned</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!showProfileTab && activeTab === 'patients' && (
            <div className="data-table-container">
              <h2>All Patients</h2>
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
                  <thead><tr><th>Name</th><th>Email</th><th>Type</th></tr></thead>
                  <tbody>
                    {patients.map((p, idx) => (
                      <tr key={idx}><td>{p.name}</td><td>{p.email}</td><td>{p.patientType}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="no-data">No patients found</p>}
            </div>
          )}

          {!showProfileTab && activeTab === 'billing' && (
            <div className="data-table-container">
              <h2>Billing Records</h2>
              {billing.length > 0 ? (
                <table className="data-table">
                  <thead><tr><th>Patient</th><th>Total Charges</th><th>Total Paid</th><th>Balance</th><th>Date</th></tr></thead>
                  <tbody>
                    {billing.map((record, idx) => (
                      <tr key={idx}>
                        <td>{record.patient?.name || 'N/A'}</td>
                        <td>${record.totalcharges}</td>
                        <td>${record.totalpayment}</td>
                        <td>${record.balance}</td>
                        <td>{new Date(record.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="no-data">No billing records found</p>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
