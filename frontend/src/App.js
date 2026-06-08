import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/loginPage'; // create this component for login
import SignUp from './pages/SignUp'; // create this component for sign up
import PatientAuth from './pages/PatientAuthPage'; // create this component for patient authentication
import StaffAuth from './pages/StaffAuthPage'; // create this component for staff authentication
import SetPassword from './pages/setpassword'; // create this component for setting password
import PatientDashboard from './pages/PatientDashboard'; // Patient dashboard
import AdminDashboard from './pages/AdminDashboard'; // Admin dashboard
import DocDashboard from './pages/DocDashboard'; // Doctor dashboard
import NurseDashboard from './pages/NurseDashboard'; // Nurse dashboard
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* <Route path="/Dauth" element={<DocAuth />} />
        <Route path="/Aauth" element={<AdminAuth />} />
        <Route path="/Nauth" element={<NurseAuth />} />
          */}
        <Route path="/Pauth" element={<PatientAuth />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signUp" element={<SignUp />} />
        <Route path="/staffLogin" element={<StaffAuth />} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="/patient/dashboard" element={<PatientDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/doctor/dashboard" element={<DocDashboard />} />
        <Route path="/nurse/dashboard" element={<NurseDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;



