import React, {useState} from "react";
import { useNavigate } from "react-router-dom";
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

    const handleLogin = async (e)=>{
        e.preventDefault();
        try{
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
                alert("Login successful")
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
        }


            catch (error) {            if(error.response && error.response.status === 401){
                setError('Invalid Password');
             } else if(error.response && error.response.status === 4022){
                setError('Account does not exist.');
             } else if(error.response && error.response.status === 401){
                setError('Invalid password.');
             } else{
                setError('Login failed. Please try again later.');
             }
     }
     };
     return(
         <div className="staff-login-container">
             <img src={logo} alt="Clinic Logo" className='auth-logo' />
             <h1 className="logo">HealthCare Clinic</h1>
             <h2 className="logo">Staff Login</h2>
             <form onSubmit={handleLogin}>
                 <div className="form-group">
                     <label className="form-label">Email:</label>
                     <input
                         type="email"
                         id="email"
                         value={formData.email}
                         onChange={(e) => setFormData({...formData, email: e.target.value})}
                         required
                     />
                 </div>
                 <div className="form-group">
                     <label className="form-label" >Password:</label>
                     <input
                         type="password"
                         id="password"
                         value={formData.password}
                         onChange={(e) => setFormData({...formData, password: e.target.value})}
                         required
                     />
                 </div>
                 {error && <p className="error">{error}</p>}
                 <button className="form-btn" type="submit">Login</button>
                 <p className="set-password-link" onClick={() => navigate('/set-password')}>
                     Are you a new user? Set New Password
                 </p>
             </form>
         </div>
     );
 };
 
 export default StaffAuth;