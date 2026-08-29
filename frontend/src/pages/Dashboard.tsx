import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import Sidebar from '../components/Sidebar';

interface DashboardData {
    message: string;
    role: string;
    stats: Record<string, any>;
    system_status?: Record<string, any>;
    recent_actions?: Array<any>;
    queue?: Array<any>;
    leads?: Array<any>;
    my_tickets?: Array<any>;
}

interface UserListItem {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    created_at: string;
}

const Dashboard = () => {
    const { user } = useAuth();
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [usersList, setUsersList] = useState<UserListItem[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [loadingUsers, setLoadingUsers] = useState(false);
    
    // User Creation Form Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUserData, setNewUserData] = useState({
        email: '',
        first_name: '',
        last_name: '',
        role: 'Customer',
        password: ''
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [formErrorMsg, setFormErrorMsg] = useState<string | null>(null);
    const [formSuccessMsg, setFormSuccessMsg] = useState<string | null>(null);
    const [isCreatingUser, setIsCreatingUser] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const data = await apiRequest('/auth/dashboard-data/');
                setDashboardData(data);
            } catch (err) {
                console.error('Failed to load dashboard data:', err);
            } finally {
                setLoadingData(false);
            }
        };

        fetchDashboardData();
    }, []);

    // Load users list if Admin or Manager
    useEffect(() => {
        if (user && (user.role === 'Admin' || user.role === 'Manager')) {
            fetchUsers();
        }
    }, [user]);

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const data = await apiRequest('/users/');
            // DRF router list returns an array directly or a paginated object. 
            // In our simple DRF ViewSet it returns an array because we haven't set up pagination.
            setUsersList(data);
        } catch (err) {
            console.error('Failed to fetch users list:', err);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleCreateUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setNewUserData({
            ...newUserData,
            [e.target.id]: e.target.value
        });
        if (formErrors[e.target.id]) {
            setFormErrors({ ...formErrors, [e.target.id]: '' });
        }
    };

    const validateCreateForm = () => {
        const errors: Record<string, string> = {};
        if (!newUserData.email) errors.email = 'Email is required';
        if (!newUserData.first_name) errors.first_name = 'First name is required';
        if (!newUserData.password) errors.password = 'Password is required';
        else if (newUserData.password.length < 8) errors.password = 'Password must be at least 8 characters';
        
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreateUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormErrorMsg(null);
        setFormSuccessMsg(null);
        
        if (!validateCreateForm()) return;

        setIsCreatingUser(true);
        try {
            await apiRequest('/users/', {
                method: 'POST',
                body: JSON.stringify(newUserData)
            });
            
            setFormSuccessMsg('User created successfully!');
            setNewUserData({
                email: '',
                first_name: '',
                last_name: '',
                role: 'Customer',
                password: ''
            });
            
            // Refresh list
            fetchUsers();
            
            setTimeout(() => {
                setShowCreateModal(false);
                setFormSuccessMsg(null);
            }, 1500);
        } catch (err: any) {
            console.error('User creation failed:', err);
            const detail = err.data?.detail || err.data?.email?.[0] || 'Failed to create user.';
            setFormErrorMsg(detail);
        } finally {
            setIsCreatingUser(false);
        }
    };

    if (loadingData || !dashboardData) {
        return (
            <div className="layout-container">
                <Sidebar />
                <main className="main-content" style={{ justifyContent: 'center', alignItems: 'center' }}>
                    <div className="spinner"></div>
                </main>
            </div>
        );
    }

    return (
        <div className="layout-container">
            <Sidebar />
            
            <main className="main-content">
                <header className="header">
                    <h2 className="gradient-text">{user?.role} Dashboard</h2>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        Workspace ID: <code style={{ color: 'var(--accent-secondary)' }}>SF-CRM-2026</code>
                    </div>
                </header>

                <div className="content-body">
                    {/* Welcome message banner */}
                    <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px', borderLeft: '4px solid var(--accent-secondary)' }}>
                        <h3 style={{ marginBottom: '8px' }}>{dashboardData.message}</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                            You are logged in with role access: <strong style={{ color: 'var(--accent-secondary)' }}>{dashboardData.role}</strong>. Below is your live workspace metrics summary.
                        </p>
                    </div>

                    {/* Stats Widget Grid */}
                    <div className="dashboard-grid">
                        {Object.keys(dashboardData.stats).map((key) => (
                            <div key={key} className="glass-card stat-widget">
                                <div className="stat-header">
                                    <span>{key.replace(/_/g, ' ').toUpperCase()}</span>
                                    <span>📈</span>
                                </div>
                                <div className="stat-value">
                                    {typeof dashboardData.stats[key] === 'object' 
                                        ? dashboardData.stats[key].length 
                                        : dashboardData.stats[key]}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Role-Specific Views */}
                    {user?.role === 'Admin' && dashboardData.system_status && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
                            {/* System status panel */}
                            <div className="glass-panel" style={{ padding: '24px' }}>
                                <h3 style={{ marginBottom: '16px' }}>💻 Platform Infrastructure Status</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>DATABASE SYSTEM</div>
                                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--role-sales)' }}>{dashboardData.system_status.database}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>LOCAL SERVER TIME</div>
                                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{dashboardData.system_status.server_time}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>DEBUG ENVIRONMENT</div>
                                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--role-manager)' }}>
                                            {dashboardData.system_status.debug_mode ? 'ENABLED (Development)' : 'DISABLED'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {user?.role === 'Manager' && dashboardData.recent_actions && (
                        <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
                            <h3 style={{ marginBottom: '16px' }}>📝 Operations Audit Log</h3>
                            <ul style={{ listStyle: 'none' }}>
                                {dashboardData.recent_actions.map((act, idx) => (
                                    <li key={idx} style={{ display: 'flex', gap: '16px', padding: '12px 0', borderBottom: idx < dashboardData.recent_actions!.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                        <span className="badge badge-manager" style={{ fontSize: '10px' }}>{act.time}</span>
                                        <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{act.action}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {user?.role === 'Support Agent' && dashboardData.queue && (
                        <div className="glass-panel" style={{ padding: '24px' }}>
                            <h3 style={{ marginBottom: '8px' }}>🎫 Ticket Helpdesk Inbound Queue</h3>
                            <div className="table-container">
                                <table className="crm-table">
                                    <thead>
                                        <tr>
                                            <th>Ticket ID</th>
                                            <th>Subject</th>
                                            <th>Priority</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dashboardData.queue.map((tkt, idx) => (
                                            <tr key={idx}>
                                                <td style={{ fontWeight: 'bold', color: 'var(--accent-secondary)' }}>{tkt.id}</td>
                                                <td>{tkt.subject}</td>
                                                <td>
                                                    <span className={`badge ${tkt.priority === 'High' ? 'badge-admin' : 'badge-support'}`}>
                                                        {tkt.priority}
                                                    </span>
                                                </td>
                                                <td><span className="badge badge-sales">Open</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {user?.role === 'Sales Agent' && dashboardData.leads && (
                        <div className="glass-panel" style={{ padding: '24px' }}>
                            <h3 style={{ marginBottom: '8px' }}>💰 Active Sales Pipeline Leads</h3>
                            <div className="table-container">
                                <table className="crm-table">
                                    <thead>
                                        <tr>
                                            <th>Lead Name</th>
                                            <th>Deal Value</th>
                                            <th>Pipeline Stage</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dashboardData.leads.map((ld, idx) => (
                                            <tr key={idx}>
                                                <td style={{ fontWeight: 'bold' }}>{ld.name}</td>
                                                <td style={{ color: 'var(--role-sales)', fontWeight: 600 }}>{ld.value}</td>
                                                <td>
                                                    <span className="badge badge-manager">{ld.stage}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {user?.role === 'Customer' && dashboardData.my_tickets && (
                        <div className="glass-panel" style={{ padding: '24px' }}>
                            <h3 style={{ marginBottom: '8px' }}>✉️ My Active Support Requests</h3>
                            <div className="table-container">
                                <table className="crm-table">
                                    <thead>
                                        <tr>
                                            <th>Ticket ID</th>
                                            <th>Subject</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dashboardData.my_tickets.map((tkt, idx) => (
                                            <tr key={idx}>
                                                <td style={{ fontWeight: 'bold', color: 'var(--accent-secondary)' }}>{tkt.id}</td>
                                                <td>{tkt.subject}</td>
                                                <td>
                                                    <span className={`badge ${tkt.status === 'Resolved' ? 'badge-sales' : 'badge-manager'}`}>
                                                        {tkt.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Shared User Management Table for Admins & Managers */}
                    {(user?.role === 'Admin' || user?.role === 'Manager') && (
                        <div className="glass-panel" style={{ padding: '24px', marginTop: '32px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <h3 style={{ marginBottom: '4px' }}>👥 User Account Directory</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>View, manage, and create users across roles.</p>
                                </div>
                                <button 
                                    onClick={() => setShowCreateModal(true)} 
                                    className="btn btn-primary" 
                                    style={{ padding: '10px 20px', fontSize: '14px' }}
                                >
                                    ➕ Create CRM User
                                </button>
                            </div>

                            {loadingUsers ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                                    <div className="spinner" style={{ width: '30px', height: '30px' }}></div>
                                </div>
                            ) : (
                                <div className="table-container">
                                    <table className="crm-table">
                                        <thead>
                                            <tr>
                                                <th>Email</th>
                                                <th>Name</th>
                                                <th>System Role</th>
                                                <th>Date Joined</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {usersList.map((usr) => (
                                                <tr key={usr.id}>
                                                    <td style={{ fontWeight: 600 }}>{usr.email}</td>
                                                    <td>{usr.first_name} {usr.last_name}</td>
                                                    <td>
                                                        <span className={`badge ${
                                                            usr.role === 'Admin' ? 'badge-admin' :
                                                            usr.role === 'Manager' ? 'badge-manager' :
                                                            usr.role === 'Support Agent' ? 'badge-support' :
                                                            usr.role === 'Sales Agent' ? 'badge-sales' : 'badge-customer'
                                                        }`}>
                                                            {usr.role}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                        {new Date(usr.created_at).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Create User Modal Dialog */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3>Create New CRM Account</h3>
                            <button 
                                onClick={() => setShowCreateModal(false)}
                                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                ✕
                            </button>
                        </div>

                        {formErrorMsg && (
                            <div className="badge badge-admin" style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '6px', display: 'block', textAlign: 'center' }}>
                                {formErrorMsg}
                            </div>
                        )}

                        {formSuccessMsg && (
                            <div className="badge badge-sales" style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '6px', display: 'block', textAlign: 'center' }}>
                                {formSuccessMsg}
                            </div>
                        )}

                        <form onSubmit={handleCreateUserSubmit}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="email">Email Address</label>
                                <input
                                    type="email"
                                    id="email"
                                    className="form-input"
                                    placeholder="agent@serviceflow.com"
                                    value={newUserData.email}
                                    onChange={handleCreateUserChange}
                                    disabled={isCreatingUser}
                                />
                                {formErrors.email && <div className="form-error">⚠️ {formErrors.email}</div>}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="first_name">First Name</label>
                                    <input
                                        type="text"
                                        id="first_name"
                                        className="form-input"
                                        placeholder="Emma"
                                        value={newUserData.first_name}
                                        onChange={handleCreateUserChange}
                                        disabled={isCreatingUser}
                                    />
                                    {formErrors.first_name && <div className="form-error">⚠️ {formErrors.first_name}</div>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="last_name">Last Name</label>
                                    <input
                                        type="text"
                                        id="last_name"
                                        className="form-input"
                                        placeholder="Watson"
                                        value={newUserData.last_name}
                                        onChange={handleCreateUserChange}
                                        disabled={isCreatingUser}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="role">System Role Access</label>
                                <select
                                    id="role"
                                    className="form-input"
                                    value={newUserData.role}
                                    onChange={handleCreateUserChange}
                                    disabled={isCreatingUser}
                                    style={{ appearance: 'none', background: 'var(--bg-primary)' }}
                                >
                                    <option value="Admin">Admin</option>
                                    <option value="Manager">Manager</option>
                                    <option value="Support Agent">Support Agent</option>
                                    <option value="Sales Agent">Sales Agent</option>
                                    <option value="Customer">Customer</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="password">Initial Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    className="form-input"
                                    placeholder="Min. 8 characters"
                                    value={newUserData.password}
                                    onChange={handleCreateUserChange}
                                    disabled={isCreatingUser}
                                />
                                {formErrors.password && <div className="form-error">⚠️ {formErrors.password}</div>}
                            </div>

                            <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setShowCreateModal(false)} 
                                    className="btn btn-secondary" 
                                    style={{ flex: 1 }}
                                    disabled={isCreatingUser}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn btn-primary" 
                                    style={{ flex: 1 }}
                                    disabled={isCreatingUser}
                                >
                                    {isCreatingUser ? 'Creating...' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
