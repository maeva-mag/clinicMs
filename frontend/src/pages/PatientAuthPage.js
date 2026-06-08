import React, {useState} from "react";
import { useNavigate } from "react-router-dom";
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
    // const handleChange = (e) => {
    //     setFormData({ ...formData, [e.target.name]: e.target.value });
    // };

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
        <div className="Plogin-container">
            <img src={logo} alt="Clinic Logo" className='auth-logo' />
            <h1 className="logo">HealthCare Clinic</h1>
            <h2 className="logo">Patient Login</h2>
            <form onSubmit={handleLogin}>
                <label className="form-label">Email:</label>
                <br/>
                <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                />
                <br/>
                <label className="form-label">Password:</label>
                <br/>
                <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                />
                <br/>
                <button type="submit" className="form-btn">login</button>
                </form>

            {error && <p className="error">{error}</p>}
            </div>

    );

}
export default PatientAuth;
