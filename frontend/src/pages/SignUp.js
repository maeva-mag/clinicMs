import React, {useState} from "react";
import { useNavigate } from "react-router-dom";
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
            setError('fill all the required fields');
        }
            else if (err.response && err.response.status === 401) {
                setError('Invalid email format');
            }
            else if (err.response && err.response.status === 402) {
                setError('Passwords do not match.');
            }
            else {
                setError('An error occurred during registration');
            }
        }
    };
    return(
        <div className="signup-container">
            <img src={logo} alt="Clinic Logo" className='auth-logo' />
            <h1 className ='logo'>HealthCare Clinic</h1 >
            <h2 className ='logo'>Sign Up</h2 >
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleSubmit}>
                {/* Form fields for patient registration */}
                <label className="form-label" > Name:</label>
                <br/>
                <input 
                    type="text"
                    name="name"
                    placeholder="Name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                />
                <label className="form-label"> Email:</label>
                    <br/>
                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                />
                <label className="form-label"> Password:</label>
                    <br/>
                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                />
                <label className="form-label"> Confirm Password:</label>
                    <br/>
                <input
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                />
                <div className="select">
                    <div className="select-item">

                <label className="form-label"> Age:</label>
                    <br/>
                <input
                    type="number"
                    name="age"
                    placeholder="Age"
                    value={formData.age}
                    onChange={handleChange}
                    required
                /></div>
                <div className="select-item">

                <label className="form-label"> Gender:</label>
                    <br/>
                <select
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
                <label className="form-label"> Blood Type:</label>
                    <br/>
                <select className="blood-type"
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
                <label className="form-label"> Telephone:</label>
                    <br/>
                <input
                    type="text"
                    name="telephone"
                    placeholder="Telephone"
                    value={formData.telephone}
                    onChange={handleChange}
                    required
                />
                <label className="form-label"> Address:</label>
                    <br/>
                <input
                    type="text"
                    name="address"
                    placeholder="Address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                />
                <label className="form-label"> Emergency Contact:</label>
                    <br/>
                <input
                    type="text"
                    name="emergencyContact"
                    placeholder="Emergency Contact"
                    value={formData.emergencyContact}
                    onChange={handleChange}
                    required
                />
                <label className="form-label"> Allergies:</label>
                    <br/>
                <input
                    type="text"
                    name="allergies"
                    placeholder="Allergies (comma-separated)"
                    value={formData.allergies}
                    onChange={handleChange}
                />
                <button type="submit" className="form-btn">Sign Up</button>
            </form>
        </div>
    );
}

export default SignUp;  