import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaArrowRight } from "react-icons/fa";
import './Auth.css';
import API from '../services/api';
import logo from '../assets/clinic-logo.jpg';

function SetPassword() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await API.post('/auth/set-password', {
                email,
                password,
                confirmPassword
            });
            if (response.status === 200) {
                navigate('/login');
            } else {
                setError('Failed to set password. Please try again.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred while setting the password.');
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
                    <h2 className="page-subtitle">Set Password</h2>
                    <p className="description-text">Establish your credentials to activate or reset your staff account.</p>
                </div>

                {error && <p className="error-alert">{error}</p>}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <div className="input-wrapper">
                            <FaEnvelope className="field-icon" />
                            <input
                                type="email"
                                id="email"
                                placeholder="staff@clinic.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">New Password</label>
                        <div className="input-wrapper">
                            <FaLock className="field-icon" />
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <div className="input-wrapper">
                            <FaLock className="field-icon" />
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                id="confirmPassword"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                            <button 
                                type="button" 
                                className="password-toggle-btn"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                tabIndex="-1"
                            >
                                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="login-submit-btn">
                        <span>Set Password</span>
                        <FaArrowRight className="btn-arrow" />
                    </button>
                </form>

                <div className="login-card-footer">
                    <p>Already configured your account?</p>
                    <button onClick={() => navigate('/login')} className="footer-register-btn">
                        Back to Login Selection
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SetPassword;