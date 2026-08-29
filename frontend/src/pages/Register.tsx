import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
    const [formData, setFormData] = useState({
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        password_confirm: ''
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.id]: e.target.value
        });
        // Clear field errors on change
        if (fieldErrors[e.target.id]) {
            setFieldErrors({
                ...fieldErrors,
                [e.target.id]: ''
            });
        }
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        
        if (!formData.email) {
            errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            errors.email = 'Please enter a valid email address';
        }
        
        if (!formData.first_name) {
            errors.first_name = 'First name is required';
        }
        
        if (!formData.password) {
            errors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            errors.password = 'Password must be at least 8 characters long';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(formData.password)) {
            errors.password = 'Password must contain at least one uppercase, one lowercase letter, and one number';
        }
        
        if (formData.password !== formData.password_confirm) {
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

        setIsSubmitting(true);
        try {
            await register(formData);
            setSuccessMsg('Registration successful! Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 2500);
        } catch (err: any) {
            setIsSubmitting(false);
            console.error('Registration failed:', err);
            
            if (err.data) {
                // Map API errors to field errors
                const apiErrors: Record<string, string> = {};
                Object.keys(err.data).forEach((key) => {
                    const message = err.data[key];
                    apiErrors[key] = Array.isArray(message) ? message[0] : message;
                });
                
                if (apiErrors.non_field_errors) {
                    setSubmitError(apiErrors.non_field_errors);
                } else if (Object.keys(apiErrors).length > 0) {
                    setFieldErrors(apiErrors);
                } else {
                    setSubmitError('Failed to register. Please check your network and try again.');
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
            
            <div className="glass-card auth-container" style={{ maxWidth: '500px' }}>
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                    <h2 style={{ fontSize: '28px', marginBottom: '8px' }} className="gradient-text">Create Account</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Register to join ServiceFlow CRM (Registered as Customer by default)</p>
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="first_name">First Name</label>
                            <input
                                type="text"
                                id="first_name"
                                className="form-input"
                                placeholder="Alice"
                                value={formData.first_name}
                                onChange={handleChange}
                                disabled={isSubmitting}
                            />
                            {fieldErrors.first_name && <div className="form-error">⚠️ {fieldErrors.first_name}</div>}
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="last_name">Last Name</label>
                            <input
                                type="text"
                                id="last_name"
                                className="form-input"
                                placeholder="Smith"
                                value={formData.last_name}
                                onChange={handleChange}
                                disabled={isSubmitting}
                            />
                            {fieldErrors.last_name && <div className="form-error">⚠️ {fieldErrors.last_name}</div>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            className="form-input"
                            placeholder="alice@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            disabled={isSubmitting}
                        />
                        {fieldErrors.email && <div className="form-error">⚠️ {fieldErrors.email}</div>}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="form-input"
                            placeholder="••••••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            disabled={isSubmitting}
                        />
                        {fieldErrors.password && <div className="form-error">⚠️ {fieldErrors.password}</div>}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password_confirm">Confirm Password</label>
                        <input
                            type="password"
                            id="password_confirm"
                            className="form-input"
                            placeholder="••••••••••••"
                            value={formData.password_confirm}
                            onChange={handleChange}
                            disabled={isSubmitting}
                        />
                        {fieldErrors.password_confirm && <div className="form-error">⚠️ {fieldErrors.password_confirm}</div>}
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '10px', height: '48px' }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div> : 'Sign Up'}
                    </button>
                </form>

                <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Already have an account?{' '}
                    <Link to="/login" style={{ color: 'var(--accent-secondary)', textDecoration: 'none', fontWeight: 600 }}>
                        Login here
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
