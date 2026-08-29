import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    if (!user) return null;

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    // Helper to get correct role badge class
    const getRoleBadgeClass = (role: string) => {
        switch (role) {
            case 'Admin': return 'badge-admin';
            case 'Manager': return 'badge-manager';
            case 'Support Agent': return 'badge-support';
            case 'Sales Agent': return 'badge-sales';
            default: return 'badge-customer';
        }
    };

    const isActive = (path: string) => {
        return location.pathname === path ? 'active' : '';
    };

    return (
        <aside className="sidebar glass-panel">
            <div className="sidebar-logo">
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, var(--accent-secondary) 0%, var(--accent-primary) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    color: '#000'
                }}>S</div>
                <span>Service<span style={{ color: 'var(--accent-secondary)' }}>Flow</span></span>
            </div>

            <ul className="sidebar-menu">
                <li className="sidebar-item">
                    <Link to="/dashboard" className={`sidebar-link ${isActive('/dashboard')}`}>
                        <span style={{ fontSize: '18px' }}>📊</span> Dashboard
                    </Link>
                </li>
                <li className="sidebar-item">
                    <Link to="/profile" className={`sidebar-link ${isActive('/profile')}`}>
                        <span style={{ fontSize: '18px' }}>👤</span> My Profile
                    </Link>
                </li>
                {user.role !== 'Customer' && (
                    <li className="sidebar-item">
                        <Link to="/customers" className={`sidebar-link ${isActive('/customers') || location.pathname.startsWith('/customers/') ? 'active' : ''}`}>
                            <span style={{ fontSize: '18px' }}>👥</span> Customers
                        </Link>
                    </li>
                )}
                {user.role !== 'Customer' && (
                    <li className="sidebar-item">
                        <Link to="/leads" className={`sidebar-link ${isActive('/leads') || location.pathname.startsWith('/leads/') ? 'active' : ''}`}>
                            <span style={{ fontSize: '18px' }}>🎯</span> Leads
                        </Link>
                    </li>
                )}
                {user.role !== 'Customer' && (
                    <li className="sidebar-item">
                        <Link to="/pipeline" className={`sidebar-link ${isActive('/pipeline') || location.pathname.startsWith('/pipeline/') ? 'active' : ''}`}>
                            <span style={{ fontSize: '18px' }}>📈</span> Pipeline
                        </Link>
                    </li>
                )}
                <li className="sidebar-item">
                    <Link to="/tickets" className={`sidebar-link ${isActive('/tickets') || location.pathname.startsWith('/tickets/') ? 'active' : ''}`}>
                        <span style={{ fontSize: '18px' }}>🎫</span> Support Tickets
                    </Link>
                </li>
                <li className="sidebar-item">
                    <Link to="/service-requests" className={`sidebar-link ${isActive('/service-requests') || location.pathname.startsWith('/service-requests/') ? 'active' : ''}`}>
                        <span style={{ fontSize: '18px' }}>🛠️</span> Service Requests
                    </Link>
                </li>
                {user.role !== 'Customer' && (
                    <li className="sidebar-item">
                        <Link to="/tasks" className={`sidebar-link ${isActive('/tasks') || location.pathname.startsWith('/tasks/') ? 'active' : ''}`}>
                            <span style={{ fontSize: '18px' }}>📅</span> Tasks & Calendar
                        </Link>
                    </li>
                )}
                <li className="sidebar-item">
                    <Link to="/appointments" className={`sidebar-link ${isActive('/appointments') || location.pathname.startsWith('/appointments/') ? 'active' : ''}`}>
                        <span style={{ fontSize: '18px' }}>🤝</span> Appointments
                    </Link>
                </li>
                {user.role !== 'Customer' && (
                    <li className="sidebar-item">
                        <Link to="/communications" className={`sidebar-link ${isActive('/communications') || location.pathname.startsWith('/communications/') ? 'active' : ''}`}>
                            <span style={{ fontSize: '18px' }}>✍️</span> Communication Logs
                        </Link>
                    </li>
                )}
                {/* Admin/Manager specific options */}
                {(user.role === 'Admin' || user.role === 'Manager') && (
                    <li className="sidebar-item" style={{ marginTop: '24px', padding: '0 16px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        Administration
                    </li>
                )}
                {(user.role === 'Admin' || user.role === 'Manager') && (
                    <li className="sidebar-item">
                        <Link to="/dashboard" className="sidebar-link" style={{ pointerEvents: 'none', opacity: 0.6 }}>
                            <span style={{ fontSize: '18px' }}>⚙️</span> Settings
                        </Link>
                    </li>
                )}
            </ul>

            <div style={{ padding: '0 16px 16px' }}>
                <button 
                    onClick={handleLogout} 
                    className="btn btn-secondary" 
                    style={{ width: '100%', display: 'flex', gap: '8px', padding: '10px' }}
                >
                    <span>🚪</span> Log Out
                </button>
            </div>

            <div className="sidebar-user">
                <div className="user-avatar">
                    {user.profile.avatar_url ? (
                        <img src={user.profile.avatar_url} alt="User Avatar" />
                    ) : (
                        <span style={{ fontWeight: 'bold', color: 'var(--accent-secondary)' }}>
                            {user.first_name[0] || user.email[0].toUpperCase()}
                        </span>
                    )}
                </div>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {user.first_name} {user.last_name}
                    </div>
                    <div style={{ display: 'inline-block', marginTop: '4px' }}>
                        <span className={`badge ${getRoleBadgeClass(user.role)}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                            {user.role}
                        </span>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
