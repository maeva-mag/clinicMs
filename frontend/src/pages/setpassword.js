import React, {useState} from "react";
import { useNavigate } from "react-router-dom";
import './Auth.css';
import API from '../services/api';
import logo from '../assets/clinic-logo.jpg';
 function SetPassword() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const handleSubmit = async (e) => {
        e.preventDefault();
        try{
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
            setError('An error occurred while setting the password.');
        }
    }
    return(
        <div className="set-password-container">
            <img src={logo} alt="Clinic Logo" className='auth-logo' />
            <h1 className="logo">HealthCare Clinic</h1>
            <h2 className="logo">Set Password</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="email" className="form-label">Email:</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label className="form-label" htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label className="form-label" htmlFor="confirmPassword">Confirm Password:</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>
                {error && <p className="error">{error}</p>}
                
                <button type="submit" className="form-btn">
                    Set Password
                </button>

            </form>
        </div>
    )
}
export default SetPassword;