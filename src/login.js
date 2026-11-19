import React from 'react';
import { redirectToLogin } from './authService';

function Login() { // Login component to handle user authentication
    return (
        <div className="login">
            <h1>Spotify Analytics</h1>
            <button className="btn" onClick={redirectToLogin}>Login with Spotify</button>
        </div>
    );
}

export default Login;
