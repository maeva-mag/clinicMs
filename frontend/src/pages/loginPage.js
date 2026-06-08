import React from "react";
import { useNavigate } from "react-router-dom";
import './Auth.css';
import '../App.css';

function LoginPage() {
    const navigate = useNavigate();

    return(
        <div className="login-container">
            <h2 className="login-title">Login  as </h2>
            <button className="homeButton" onClick={() => navigate('/staffLogin')}>Staff </button>
            <button className="homeButton" onClick={() => navigate('/Pauth')}>Patient </button>
              
        </div>
    )
}

 export default LoginPage;