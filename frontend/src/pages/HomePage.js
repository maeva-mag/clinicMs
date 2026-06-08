import React from 'react';
import logo from '../assets/clinic-logo.jpg';
import { useNavigate } from 'react-router-dom';
// import logo from './logo.svg';
import '../App.css';
import './Auth.css';

function HomePage() {
  const navigate = useNavigate();

  
  return (
    <div className="Home-Container">
       <img src={logo} alt="Clinic Logo" className='home-logo' />
      <h1>Health made easier </h1>
       <button  className='homeButton' onClick={() => navigate('/login')}>Login</button>
       <div className="separator">
                <span>Don't have an account?</span> <br />
                <button className="homeButton" onClick={() => navigate('/signUp')}>Sign Up</button>
            </div>
     
    </div>
  );
}

export default HomePage;