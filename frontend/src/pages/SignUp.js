import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
    FaUser, 
    FaEnvelope, 
    FaLock, 
    FaPhone, 
    FaMapMarkerAlt, 
    FaHeartbeat, 
    FaExclamationTriangle, 
    FaArrowRight, 
    FaEye, 
    FaEyeSlash,
    FaBriefcaseMedical,
    FaClipboardList
} from "react-icons/fa";
import './Auth.css';
import '../App.css';
import API from '../services/api';
import logo from '../assets/clinic-logo.jpg';

function SignUp() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        age: '',
        gender: '',
        bloodType: '',
        telephone: '',
        address: '',
        emergencyContact: '',
        allergies: '',
    });
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await API.post('/patients/register', formData);
            if (response.status === 201) {
                navigate('/login');
            } 
        } catch (err) {
            if(err.response && err.response.status === 400) {
                setError('Please fill in all required fields.');
            }
            else if (err.response && err.response.status === 401) {
                setError('Invalid email format.');
            }
            else if (err.response && err.response.status === 402) {
                setError('Passwords do not match.');
            }
            else {
                setError('An error occurred during registration.');
            }
        }
    };

    return (
        <div className="signup-page-wrapper">
            <div className="signup-card">
                <div className="signup-card-header">
                    <div className="logo-wrapper">
                        <img src={logo} alt="Clinic Logo" className="auth-logo" />
                    </div>
                    <h1 className="clinic-title">HealthCare Clinic</h1>
                    <h2 className="page-subtitle">Patient Registration</h2>
                    <p className="description-text">Create your personal account to book appointments, access health records, and connect with our care team.</p>
                </div>

                {error && (
                    <div className="error-alert">
                        <FaExclamationTriangle className="alert-icon" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="signup-form">
                    {/* Section 1: Credentials */}
                    <div className="form-section">
                        <div className="form-section-title">
                            <FaLock className="section-icon" />
                            <h3>Account Credentials</h3>
                        </div>
                        <div className="fields-grid">
                            <div className="form-group span-2">
                                <label htmlFor="name">Full Name *</label>
                                <div className="input-wrapper">
                                    <FaUser className="field-icon" />
                                    <input 
                                        type="text"
                                        id="name"
                                        name="name"
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group span-2">
                                <label htmlFor="email">Email Address *</label>
                                <div className="input-wrapper">
                                    <FaEnvelope className="field-icon" />
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        placeholder="johndoe@example.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="password">Password *</label>
                                <div className="input-wrapper">
                                    <FaLock className="field-icon" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        name="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={handleChange}
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
                                <label htmlFor="confirmPassword">Confirm Password *</label>
                                <div className="input-wrapper">
                                    <FaLock className="field-icon" />
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
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
                        </div>
                    </div>

                    {/* Section 2: Contact Details */}
                    <div className="form-section">
                        <div className="form-section-title">
                            <FaPhone className="section-icon" />
                            <h3>Personal & Contact Information</h3>
                        </div>
                        <div className="fields-grid">
                            <div className="form-group">
                                <label htmlFor="age">Age *</label>
                                <div className="input-wrapper">
                                    <FaClipboardList className="field-icon" />
                                    <input
                                        type="number"
                                        id="age"
                                        name="age"
                                        placeholder="Age"
                                        value={formData.age}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="gender">Gender *</label>
                                <div className="input-wrapper">
                                    <FaUser className="field-icon" />
                                    <select
                                        id="gender"
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group span-2">
                                <label htmlFor="telephone">Telephone Number *</label>
                                <div className="input-wrapper">
                                    <FaPhone className="field-icon" />
                                    <input
                                        type="text"
                                        id="telephone"
                                        name="telephone"
                                        placeholder="e.g. +1234567890"
                                        value={formData.telephone}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group span-2">
                                <label htmlFor="address">Home Address *</label>
                                <div className="input-wrapper">
                                    <FaMapMarkerAlt className="field-icon" />
                                    <input
                                        type="text"
                                        id="address"
                                        name="address"
                                        placeholder="Street, City, Country"
                                        value={formData.address}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Medical Information */}
                    <div className="form-section">
                        <div className="form-section-title">
                            <FaBriefcaseMedical className="section-icon" />
                            <h3>Medical Profile</h3>
                        </div>
                        <div className="fields-grid">
                            <div className="form-group">
                                <label htmlFor="bloodType">Blood Type *</label>
                                <div className="input-wrapper">
                                    <FaHeartbeat className="field-icon" />
                                    <select
                                        id="bloodType"
                                        name="bloodType"
                                        value={formData.bloodType}
                                        onChange={handleChange}
                                        required
                                    >
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
                            </div>

                            <div className="form-group">
                                <label htmlFor="emergencyContact">Emergency Contact *</label>
                                <div className="input-wrapper">
                                    <FaPhone className="field-icon" />
                                    <input
                                        type="text"
                                        id="emergencyContact"
                                        name="emergencyContact"
                                        placeholder="Emergency Number"
                                        value={formData.emergencyContact}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group span-2">
                                <label htmlFor="allergies">Known Allergies</label>
                                <div className="input-wrapper">
                                    <FaExclamationTriangle className="field-icon" />
                                    <input
                                        type="text"
                                        id="allergies"
                                        name="allergies"
                                        placeholder="e.g. Peanuts, Penicillin (leave blank if none)"
                                        value={formData.allergies}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="signup-submit-btn">
                        <span>Register Profile</span>
                        
                    </button>
                </form>

                <div className="signup-card-footer">
                    <p>Already registered with us?</p>
                    <button onClick={() => navigate('/login')} className="footer-login-btn">
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SignUp;  