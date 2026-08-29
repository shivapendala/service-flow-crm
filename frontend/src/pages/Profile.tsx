import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

const Profile = () => {
    const { user, updateProfile } = useAuth();
    
    const [firstName, setFirstName] = useState(user?.first_name || '');
    const [lastName, setLastName] = useState(user?.last_name || '');
    const [phone, setPhone] = useState(user?.profile.phone_number || '');
    const [bio, setBio] = useState(user?.profile.bio || '');
    const [department, setDepartment] = useState(user?.profile.department || '');
    const [address, setAddress] = useState(user?.profile.address || '');
    const [avatarUrl, setAvatarUrl] = useState(user?.profile.avatar_url || '');

    const [isUpdating, setIsUpdating] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);
        setIsUpdating(true);

        try {
            await updateProfile({
                phone_number: phone,
                bio,
                department,
                address,
                avatar_url: avatarUrl
            }, firstName, lastName);
            
            setSuccessMsg('Profile updated successfully!');
            setIsUpdating(false);
            
            setTimeout(() => {
                setSuccessMsg(null);
            }, 3000);
        } catch (err: any) {
            console.error('Failed to update profile:', err);
            setErrorMsg(err.data?.detail || 'Failed to update profile. Please verify your details.');
            setIsUpdating(false);
        }
    };

    if (!user) return null;

    return (
        <div className="layout-container">
            <Sidebar />
            
            <main className="main-content">
                <header className="header">
                    <h2 className="gradient-text">Account Profile</h2>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        Last Updated: {new Date(user.updated_at).toLocaleString()}
                    </span>
                </header>

                <div className="content-body" style={{ maxWidth: '800px' }}>
                    {/* Status Feedback */}
                    {errorMsg && (
                        <div className="badge badge-admin" style={{ width: '100%', padding: '12px', marginBottom: '24px', borderRadius: '6px', display: 'block', textAlign: 'center' }}>
                            {errorMsg}
                        </div>
                    )}

                    {successMsg && (
                        <div className="badge badge-sales" style={{ width: '100%', padding: '12px', marginBottom: '24px', borderRadius: '6px', display: 'block', textAlign: 'center' }}>
                            {successMsg}
                        </div>
                    )}

                    <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
                        {/* Profile Header Visual Card */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
                            <div className="user-avatar" style={{ width: '80px', height: '80px', fontSize: '32px', border: '2px solid var(--accent-secondary)' }}>
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar Preview" />
                                ) : (
                                    <span>{firstName[0] || user.email[0].toUpperCase()}</span>
                                )}
                            </div>
                            <div>
                                <h3 style={{ fontSize: '22px' }}>{firstName} {lastName}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '2px 0 6px' }}>{user.email}</p>
                                <span className={`badge ${
                                    user.role === 'Admin' ? 'badge-admin' :
                                    user.role === 'Manager' ? 'badge-manager' :
                                    user.role === 'Support Agent' ? 'badge-support' :
                                    user.role === 'Sales Agent' ? 'badge-sales' : 'badge-customer'
                                }`}>
                                    {user.role} Authorization
                                </span>
                            </div>
                        </div>

                        <form onSubmit={handleProfileSubmit}>
                            <h4 style={{ marginBottom: '16px', color: 'var(--accent-secondary)' }}>Personal Details</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="first_name">First Name</label>
                                    <input
                                        type="text"
                                        id="first_name"
                                        className="form-input"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        disabled={isUpdating}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="last_name">Last Name</label>
                                    <input
                                        type="text"
                                        id="last_name"
                                        className="form-input"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        disabled={isUpdating}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="phone">Phone Number</label>
                                    <input
                                        type="text"
                                        id="phone"
                                        className="form-input"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        disabled={isUpdating}
                                        placeholder="e.g. +1 555-0100"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="avatarUrl">Avatar URL</label>
                                    <input
                                        type="url"
                                        id="avatarUrl"
                                        className="form-input"
                                        value={avatarUrl}
                                        onChange={(e) => setAvatarUrl(e.target.value)}
                                        disabled={isUpdating}
                                        placeholder="DiceBear or custom SVG link"
                                    />
                                </div>
                            </div>

                            <h4 style={{ margin: '24px 0 16px', color: 'var(--accent-secondary)' }}>Organization Details</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="department">Department / Company</label>
                                    <input
                                        type="text"
                                        id="department"
                                        className="form-input"
                                        value={department}
                                        onChange={(e) => setDepartment(e.target.value)}
                                        disabled={isUpdating}
                                        placeholder="e.g. Helpdesk Administration"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="bio">Professional Biography</label>
                                    <textarea
                                        id="bio"
                                        className="form-input"
                                        style={{ height: '100px', resize: 'vertical' }}
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        disabled={isUpdating}
                                        placeholder="Describe your role or company relations..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="address">Work Address</label>
                                    <textarea
                                        id="address"
                                        className="form-input"
                                        style={{ height: '80px', resize: 'vertical' }}
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        disabled={isUpdating}
                                        placeholder="Street address, Office suite, City, Country"
                                    />
                                </div>
                            </div>

                            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ padding: '14px 40px' }}
                                    disabled={isUpdating}
                                >
                                    {isUpdating ? 'Saving...' : 'Save Profile Settings'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Profile;
