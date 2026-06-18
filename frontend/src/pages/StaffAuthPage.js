import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaArrowRight } from "react-icons/fa";
import './Auth.css';
import API from '../services/api';
import logo from '../assets/clinic-logo.jpg';

const StaffAuth = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await API.post('/auth/login', formData);
            const setPassword = response.data.mustSetPassword;
            if (setPassword) {
                if (response.data.name) {
                    localStorage.setItem('name', response.data.name);
                }
                setError('First-time login detected. Please set your password.');
            } else {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('role', response.data.role);
                localStorage.setItem('userId', response.data.userId);
                if (response.data.name) {
                    localStorage.setItem('name', response.data.name);
                }
                const userRole = response.data.role;
                if (userRole === 'admin') {
                    navigate('/admin/dashboard');
                } else if (userRole === 'doctor') {
                    navigate('/doctor/dashboard');
                } else if (userRole === 'nurse') {
                    navigate('/nurse/dashboard');
                } else {
                    setError('Unknown user role. Please contact support.');
                }
            }
        } catch (error) {
            if (error.response && error.response.status === 401) {
                setError('Invalid Password');
            } else if (error.response && error.response.status === 4022) {
                setError('Account does not exist.');
            } else {
                setError('Login failed. Please try again later.');
            }
        }
    };

    return (
        <div className="login-page-wrapper">
            <div className="login-card">
                <div className="login-card-header">
                    <div className="logo-wrapper">
                        <img src={logo} alt="Clinic Logo" className="auth-logo" />
                    </div>
                    <h1 className="clinic-title">HealthCare Clinic</h1>
                    <h2 className="page-subtitle">Staff Login</h2>
                    <p className="description-text">Nurses, Doctors, and Administrators portal login.</p>
                </div>

                {error && <p className="error-alert">{error}</p>}

                <form onSubmit={handleLogin} className="login-form">
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <div className="input-wrapper">
                            <FaEnvelope className="field-icon" />
                            <input
                                type="email"
                                id="email"
                                placeholder="staff@clinic.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="input-wrapper">
                            <FaLock className="field-icon" />
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                            <button 
                                type="button" 
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex="-1"
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="login-submit-btn">
                        <span>Log In</span>
                    </button>
                </form>

                <div className="login-card-footer">
                    <p>First time logging in or need to reset?</p>
                    <button onClick={() => navigate('/set-password')} className="footer-register-btn">
                        Set Password
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StaffAuth;