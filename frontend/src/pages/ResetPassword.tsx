import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { apiRequest } from '../utils/api';

const ResetPassword = () => {
    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Prefill token from URL parameters if available
        const queryParams = new URLSearchParams(location.search);
        const urlToken = queryParams.get('token');
        if (urlToken) {
            setToken(urlToken);
        }
    }, [location]);

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!token) {
            errors.token = 'Reset token is required';
        }
        if (!password) {
            errors.password = 'Password is required';
        } else if (password.length < 8) {
            errors.password = 'Password must be at least 8 characters long';
        }
        if (password !== passwordConfirm) {
            errors.password_confirm = 'Passwords do not match';
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);
        setSuccessMsg(null);
        
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            await apiRequest('/auth/password-reset/confirm/', {
                method: 'POST',
                body: JSON.stringify({
                    token,
                    password,
                    password_confirm: passwordConfirm
                })
            });
            
            setSuccessMsg('Password has been reset successfully! Redirecting to login...');
            setIsLoading(false);
            
            setTimeout(() => {
                navigate('/login');
            }, 2500);
        } catch (err: any) {
            setIsLoading(false);
            console.error('Password reset confirm error:', err);
            
            if (err.data) {
                const apiErrors: Record<string, string> = {};
                Object.keys(err.data).forEach((key) => {
                    const msg = err.data[key];
                    apiErrors[key] = Array.isArray(msg) ? msg[0] : msg;
                });
                
                if (apiErrors.token) {
                    setSubmitError(apiErrors.token);
                } else if (apiErrors.password) {
                    setFieldErrors({ password: apiErrors.password });
                } else if (apiErrors.non_field_errors) {
                    setSubmitError(apiErrors.non_field_errors);
                } else {
                    setSubmitError('Failed to reset password. Please check your token and try again.');
                }
            } else {
                setSubmitError('An unexpected error occurred. Please try again.');
            }
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="glow-orb orb-purple"></div>
            <div className="glow-orb orb-cyan"></div>
            
            <div className="glass-card auth-container">
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '28px', marginBottom: '8px' }} className="gradient-text">Choose New Password</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Enter the token received and set your new account password
                    </p>
                </div>

                {submitError && (
                    <div className="badge badge-admin" style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '6px', display: 'block', textAlign: 'center' }}>
                        {submitError}
                    </div>
                )}

                {successMsg && (
                    <div className="badge badge-sales" style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '6px', display: 'block', textAlign: 'center' }}>
                        {successMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="token">Reset Token</label>
                        <input
                            type="text"
                            id="token"
                            className="form-input"
                            placeholder="Paste token here"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            disabled={isLoading}
                        />
                        {fieldErrors.token && <div className="form-error">⚠️ {fieldErrors.token}</div>}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">New Password</label>
                        <input
                            type="password"
                            id="password"
                            className="form-input"
                            placeholder="Min. 8 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                        />
                        {fieldErrors.password && <div className="form-error">⚠️ {fieldErrors.password}</div>}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password_confirm">Confirm New Password</label>
                        <input
                            type="password"
                            id="password_confirm"
                            className="form-input"
                            placeholder="Re-enter password"
                            value={passwordConfirm}
                            onChange={(e) => setPasswordConfirm(e.target.value)}
                            disabled={isLoading}
                        />
                        {fieldErrors.password_confirm && <div className="form-error">⚠️ {fieldErrors.password_confirm}</div>}
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '10px', height: '48px' }}
                        disabled={isLoading}
                    >
                        {isLoading ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div> : 'Save Password'}
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

export default ResetPassword;
