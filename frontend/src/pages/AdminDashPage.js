// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import API from '../services/api';
// import './AdminDashboard.css';

// const AdminDashboard = () => {
//   const navigate = useNavigate();
//   const token = localStorage.getItem('token');
//   const userRole = localStorage.getItem('role');

//   // State management
//   const [activeTab, setActiveTab] = useState('overview');
//   const [stats, setStats] = useState(null);
//   const [billing, setBilling] = useState([]);
//   const [patients, setPatients] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [success, setSuccess] = useState('');

//   // Staff creation form state
//   const [staffForm, setStaffForm] = useState({
//     name: '',
//     email: '',
//     role: 'doctor'
//   });

//   useEffect(() => {
//     if (!token || userRole !== 'admin') {
//       navigate('/staffLogin');
//       return;
//     }
//     fetchStats();
//   }, [token, userRole, navigate]);

//   const fetchStats = async () => {
//     setLoading(true);
//     try {
//       const res = await API.get('/admin/stats');
//       setStats(res.data);
//       setError('');
//     } catch (err) {
//       setError('Failed to load stats');
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchBilling = async () => {
//     setLoading(true);
//     try {
//       const res = await API.get('/admin/billing');
//       setBilling(res.data.records || []);
//       setError('');
//     } catch (err) {
//       setError('Failed to load billing records');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchPatients = async () => {
//     setLoading(true);
//     try {
//       const res = await API.get('/admin/patients');
//       setPatients(res.data.patients || []);
//       setError('');
//     } catch (err) {
//       setError('Failed to load patients');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (activeTab === 'billing') fetchBilling();
//     if (activeTab === 'patients') fetchPatients();
//     if (activeTab === 'overview') fetchStats();
//   }, [activeTab]);

//   const handleStaffChange = (e) => {
//     setStaffForm({ ...staffForm, [e.target.name]: e.target.value });
//   };

//   const handleCreateStaff = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     try {
//       await API.post('/admin/create-staff', staffForm);
//       setSuccess(`${staffForm.role} account created successfully!`);
//       setStaffForm({ name: '', email: '', role: 'doctor' });
//       fetchStats(); // Update totals
//       setTimeout(() => setSuccess(''), 3000);
//     } catch (err) {
//       setError(err.response?.data?.message || 'Failed to create staff account');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleLogout = () => {
//     localStorage.clear();
//     navigate('/');
//   };

//   if (loading && !stats && activeTab === 'overview') return <div className="loading">Loading Admin Dashboard...</div>;

//   return (
//     <div className="admin-dashboard">
//       <header className="dashboard-header">
//         <h1>Admin Dashboard</h1>
//         <div className="header-actions">
//           <button className="logout-btn" onClick={handleLogout}>Logout</button>
//         </div>
//       </header>

//       {error && <div className="alert alert-error">{error}</div>}
//       {success && <div className="alert alert-success">{success}</div>}

//       <div className="tabs">
//         <button 
//           className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
//           onClick={() => setActiveTab('overview')}
//         >
//           Overview
//         </button>
//         <button 
//           className={`tab ${activeTab === 'staff' ? 'active' : ''}`}
//           onClick={() => setActiveTab('staff')}
//         >
//           Manage Staff
//         </button>
//         <button 
//           className={`tab ${activeTab === 'patients' ? 'active' : ''}`}
//           onClick={() => setActiveTab('patients')}
//         >
//           Patients
//         </button>
//         <button 
//           className={`tab ${activeTab === 'billing' ? 'active' : ''}`}
//           onClick={() => setActiveTab('billing')}
//         >
//           Billing
//         </button>
//       </div>

//       <div className="tab-content">
//         {activeTab === 'overview' && stats && (
//           <div className="overview-section">
//             <div className="stats-grid">
//               <div className="stat-card">
//                 <h3>Total Doctors</h3>
//                 <p>{stats.totals.doctors}</p>
//               </div>
//               <div className="stat-card">
//                 <h3>Total Nurses</h3>
//                 <p>{stats.totals.nurses}</p>
//               </div>
//               <div className="stat-card">
//                 <h3>Registered Patients</h3>
//                 <p>{stats.totals.registeredPatients}</p>
//               </div>
//               <div className="stat-card">
//                 <h3>Onsite Patients</h3>
//                 <p>{stats.totals.onsitePatients}</p>
//               </div>
//             </div>
            
//             <div className="data-table-container">
//               <h2>Recent Admissions</h2>
//               {stats.admittedPerDay && stats.admittedPerDay.length > 0 ? (
//                 <table className="data-table">
//                   <thead>
//                     <tr>
//                       <th>Date</th>
//                       <th>Count</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {stats.admittedPerDay.slice(0, 5).map((day, idx) => (
//                       <tr key={idx}>
//                         <td>{`${day._id.day}/${day._id.month}/${day._id.year}`}</td>
//                         <td>{day.count}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               ) : <p className="no-data">No recent admissions</p>}
//             </div>
//           </div>
//         )}

//         {activeTab === 'staff' && (
//           <div className="staff-section">
//             <div className="form-container">
//               <h2>Create New Staff Account</h2>
//               <form onSubmit={handleCreateStaff}>
//                 <div className="form-group">
//                   <label>Full Name</label>
//                   <input 
//                     type="text" 
//                     name="name" 
//                     value={staffForm.name} 
//                     onChange={handleStaffChange} 
//                     required 
//                     placeholder="e.g. Dr. John Doe"
//                   />
//                 </div>
//                 <div className="form-group">
//                   <label>Email Address</label>
//                   <input 
//                     type="email" 
//                     name="email" 
//                     value={staffForm.email} 
//                     onChange={handleStaffChange} 
//                     required 
//                     placeholder="email@hospital.com"
//                   />
//                 </div>
//                 <div className="form-group">
//                   <label>Role</label>
//                   <select name="role" value={staffForm.role} onChange={handleStaffChange}>
//                     <option value="doctor">Doctor</option>
//                     <option value="nurse">Nurse</option>
//                   </select>
//                 </div>
//                 <button type="submit" className="submit-btn" disabled={loading}>
//                   {loading ? 'Creating...' : 'Create Account'}
//                 </button>
//               </form>
//             </div>
//           </div>
//         )}

//         {activeTab === 'patients' && (
//           <div className="patients-section">
//             <div className="data-table-container">
//               <h2>All Patients</h2>
//               {patients.length > 0 ? (
//                 <table className="data-table">
//                   <thead>
//                     <tr>
//                       <th>Name</th>
//                       <th>Email</th>
//                       <th>Type</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {patients.map((patient, idx) => (
//                       <tr key={idx}>
//                         <td>{patient.name}</td>
//                         <td>{patient.email}</td>
//                         <td><span className={`status ${patient.patientType?.toLowerCase()}`}>{patient.patientType}</span></td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               ) : <p className="no-data">No patients found</p>}
//             </div>
//           </div>
//         )}

//         {activeTab === 'billing' && (
//           <div className="billing-section">
//             <div className="data-table-container">
//               <h2>Billing Records</h2>
//               {billing.length > 0 ? (
//                 <table className="data-table">
//                   <thead>
//                     <tr>
//                       <th>Patient</th>
//                       <th>Total Charges</th>
//                       <th>Total Paid</th>
//                       <th>Balance</th>
//                       <th>Date</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {billing.map((record, idx) => (
//                       <tr key={idx}>
//                         <td>{record.patient?.name || 'N/A'}</td>
//                         <td>${record.totalchaerges}</td>
//                         <td>${record.totalpayment}</td>
//                         <td>${record.balance}</td>
//                         <td>{new Date(record.createdAt).toLocaleDateString()}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               ) : <p className="no-data">No billing records found</p>}
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default AdminDashboard;
