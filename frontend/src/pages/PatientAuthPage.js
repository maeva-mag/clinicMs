import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaArrowRight } from "react-icons/fa";
import './Auth.css';
import API from '../services/api';
import logo from '../assets/clinic-logo.jpg';

function PatientAuth() {
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
            const response = await API.post('/patients/login', formData);
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('userId', response.data.userId);
            if (response.data.name) {
                localStorage.setItem('name', response.data.name);
            }
            navigate('/patient/dashboard');
        } catch (error) {
            if(error.response && error.response.status === 401){
                setError('Invalid Password');
             } else if(error.response && error.response.status === 403){
                setError('Account does not exist.');
             } else if(error.response && error.response.status === 404){
                setError('All fields are required.');
             } else{
                setError('Login failed. Please try again later.');
             }
        }
    };

    return( 
        <div className="login-page-wrapper">
            <div className="login-card">
                <div className="login-card-header">
                    <div className="logo-wrapper">
                        <img src={logo} alt="Clinic Logo" className="auth-logo" />
                    </div>
                    <h1 className="clinic-title">HealthCare Clinic</h1>
                    <h2 className="page-subtitle">Patient Login</h2>
                    <p className="description-text">Access your personal healthcare dashboard, book consultations, and view billing details.</p>
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
                                name="email"
                                placeholder="johndoe@example.com"
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
                                name="password"
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
                        <FaArrowRight className="btn-arrow" />
                    </button>
                </form>

                <div className="login-card-footer">
                    <p>New to HealthCare Clinic?</p>
                    <button onClick={() => navigate('/signUp')} className="footer-register-btn">
                        Create Account
                    </button>
                </div>
            </div>
        </div>
    );

}
export default PatientAuth;
