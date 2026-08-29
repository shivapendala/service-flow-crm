import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../utils/api';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [fieldError, setFieldError] = useState('');
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [devToken, setDevToken] = useState<string | null>(null);
    

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFieldError('');
        setSuccessMsg(null);
        setDevToken(null);

        if (!email) {
            setFieldError('Email is required');
            return;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            setFieldError('Please enter a valid email address');
            return;
        }

        setIsLoading(true);
        try {
            const data = await apiRequest('/auth/password-reset/', {
                method: 'POST',
                body: JSON.stringify({ email })
            });
            
            setSuccessMsg('Reset request processed. If the email is registered, you will receive a token.');
            
            // Display dev token if available
            if (data.token) {
                setDevToken(data.token);
            }
            
            setIsLoading(false);
        } catch (err: any) {
            setIsLoading(false);
            console.error('Password reset request error:', err);
            setFieldError(err.data?.detail || 'An error occurred. Please try again.');
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="glow-orb orb-purple"></div>
            <div className="glow-orb orb-cyan"></div>
            
            <div className="glass-card auth-container">
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '28px', marginBottom: '8px' }} className="gradient-text">Reset Password</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Enter your email to request a password reset token
                    </p>
                </div>

                {fieldError && (
                    <div className="badge badge-admin" style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '6px', display: 'block', textAlign: 'center' }}>
                        {fieldError}
                    </div>
                )}

                {successMsg && (
                    <div className="badge badge-sales" style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '6px', display: 'block', textAlign: 'center' }}>
                        {successMsg}
                    </div>
                )}

                {devToken && (
                    <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px', borderColor: 'var(--accent-secondary)' }}>
                        <span className="badge badge-support" style={{ marginBottom: '8px' }}>🔧 Developer Mode Token</span>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                            We intercepted the token for you to test local password resets:
                        </p>
                        <code style={{ display: 'block', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', margin: '8px 0', color: 'var(--accent-secondary)', fontWeight: 'bold', fontSize: '12px' }}>
                            {devToken}
                        </code>
                        <Link 
                            to={`/reset-password?token=${devToken}`} 
                            className="btn btn-secondary" 
                            style={{ display: 'block', width: '100%', padding: '8px', fontSize: '13px', textAlign: 'center', textDecoration: 'none' }}
                        >
                            Go to Reset Page with Token
                        </Link>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            className="form-input"
                            placeholder="e.g. admin@serviceflow.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '10px', height: '48px' }}
                        disabled={isLoading}
                    >
                        {isLoading ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div> : 'Send Reset Token'}
                    </button>
                </form>

                <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Remember your password?{' '}
                    <Link to="/login" style={{ color: 'var(--accent-secondary)', textDecoration: 'none', fontWeight: 600 }}>
                        Login here
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
