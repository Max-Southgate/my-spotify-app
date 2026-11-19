import React from 'react';
import { redirectToLogin } from './authService';
import { BrandMark, CaseStack } from './ui';

function Login() {
    return (
        <main className="login">
            <div>
                <p className="eyebrow"><BrandMark size={18} /> Wavelength</p>
                <h1>See how you <span className="ramp-text">really</span> listen.</h1>
                <p className="lede">Your top tracks, artists and genres, and when and how much you listen, from your Spotify account.</p>
                <button type="button" className="cta" onClick={redirectToLogin}>
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 4v16l13-8z" fill="currentColor" /></svg>
                    Connect with Spotify
                </button>
                <p className="fine">Reads your listening. Only writes when you choose to save a playlist.</p>
            </div>
            <CaseStack size={250} />
        </main>
    );
}

export default Login;
