import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    
    const { login, error, setError, isLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Check if redirected due to session expiration
    const queryParams = new URLSearchParams(location.search);
    const sessionExpired = queryParams.get('expired') === 'true';

    useEffect(() => {
        // Clear global errors on mount
        setError(null);
    }, [setError]);

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!email) {
            errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            errors.email = 'Please enter a valid email address';
        }
        if (!password) {
            errors.password = 'Password is required';
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            await login(email, password);
            // Redirect to dashboard (or from whence they came)
            const from = (location.state as any)?.from?.pathname || '/dashboard';
            navigate(from, { replace: true });
        } catch (err) {
            console.error('Login error in view:', err);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="glow-orb orb-purple"></div>
            <div className="glow-orb orb-cyan"></div>
            
            <div className="glass-card auth-container">
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '28px', marginBottom: '8px' }} className="gradient-text">Welcome Back</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Log in to access your CRM workspace</p>
                </div>

                {sessionExpired && (
                    <div className="badge badge-admin" style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '6px', display: 'block', textAlign: 'center' }}>
                        Session expired. Please log in again.
                    </div>
                )}

                {error && (
                    <div className="badge badge-admin" style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '6px', display: 'block', textAlign: 'center' }}>
                        {error}
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
                        {fieldErrors.email && <div className="form-error">⚠️ {fieldErrors.email}</div>}
                    </div>

                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label className="form-label" htmlFor="password" style={{ margin: 0 }}>Password</label>
                            <Link to="/forgot-password" style={{ fontSize: '13px', color: 'var(--accent-secondary)', textDecoration: 'none' }}>
                                Forgot Password?
                            </Link>
                        </div>
                        <input
                            type="password"
                            id="password"
                            className="form-input"
                            placeholder="••••••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                        />
                        {fieldErrors.password && <div className="form-error">⚠️ {fieldErrors.password}</div>}
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '10px', height: '48px' }}
                        disabled={isLoading}
                    >
                        {isLoading ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div> : 'Sign In'}
                    </button>
                </form>

                <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Don't have an account?{' '}
                    <Link to="/register" style={{ color: 'var(--accent-secondary)', textDecoration: 'none', fontWeight: 600 }}>
                        Register here
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
