import { Link } from 'react-router-dom';

const Landing = () => {
    return (
        <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
            {/* Background glowing particles */}
            <div className="glow-orb orb-purple"></div>
            <div className="glow-orb orb-cyan"></div>

            {/* Navbar */}
            <header className="header glass-panel" style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'rgba(10, 8, 19, 0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.5px' }}>Service<span style={{ color: 'var(--accent-secondary)' }}>Flow</span> CRM</span>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <Link to="/login" className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: '14px' }}>Login</Link>
                    <Link to="/register" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '14px' }}>Get Started</Link>
                </div>
            </header>

            {/* Hero Section */}
            <main style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '140px 24px 80px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                zIndex: 2,
                position: 'relative'
            }}>
                <div className="badge badge-support" style={{ marginBottom: '24px', fontSize: '13px', padding: '6px 14px' }}>
                    ✨ Secure Auth & RBAC Enabled
                </div>
                
                <h1 style={{ fontSize: 'calc(24px + 3vw)', lineHeight: 1.1, marginBottom: '20px', maxWidth: '850px' }}>
                    Optimize Customer Success with <span className="brand-gradient-text">ServiceFlow CRM</span>
                </h1>
                
                <p style={{ color: 'var(--text-secondary)', fontSize: '18px', maxWidth: '650px', marginBottom: '40px' }}>
                    A secure, role-based client relationships manager designed to unify Admins, Operations Managers, Sales Pipelines, Helpdesk Support, and Customers.
                </p>

                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '60px' }}>
                    <Link to="/register" className="btn btn-primary" style={{ fontSize: '16px', padding: '14px 32px' }}>
                        Register Free Account
                    </Link>
                    <Link to="/login" className="btn btn-secondary" style={{ fontSize: '16px', padding: '14px 32px' }}>
                        Access CRM Dashboard
                    </Link>
                </div>

                {/* Features Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '24px',
                    width: '100%',
                    marginTop: '40px'
                }}>
                    <div className="glass-card stat-widget" style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '24px', marginBottom: '16px' }}>🔐</div>
                        <h3 style={{ marginBottom: '10px' }}>JWT Secure Auth</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                            Advanced token rotation, blacklisting, and automatic refreshing mechanisms built on top of Django REST Framework SimpleJWT.
                        </p>
                    </div>

                    <div className="glass-card stat-widget" style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '24px', marginBottom: '16px' }}>👑</div>
                        <h3 style={{ marginBottom: '10px' }}>Granular Access Control</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                            Custom permission matrices built for Admin, Manager, Support Agent, Sales Agent, and Customer roles.
                        </p>
                    </div>

                    <div className="glass-card stat-widget" style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '24px', marginBottom: '16px' }}>⚡</div>
                        <h3 style={{ marginBottom: '10px' }}>Dynamic Dashboard</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                            A unified dashboard client interface that dynamically updates capabilities and components based on the user's role.
                        </p>
                    </div>
                </div>

                {/* System roles list */}
                <div className="glass-panel" style={{
                    marginTop: '80px',
                    padding: '32px',
                    width: '100%',
                    maxWidth: '800px',
                    textAlign: 'left'
                }}>
                    <h3 style={{ marginBottom: '16px', textAlign: 'center' }}>Test Accounts Available</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', marginBottom: '24px' }}>
                        You can log in to any of the 5 seeded roles using the password: <strong>CRMUserPass123!</strong>
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
                        <span className="badge badge-admin">Admin: admin@serviceflow.com</span>
                        <span className="badge badge-manager">Manager: manager@serviceflow.com</span>
                        <span className="badge badge-support">Support: support@serviceflow.com</span>
                        <span className="badge badge-sales">Sales: sales@serviceflow.com</span>
                        <span className="badge badge-customer">Customer: customer@serviceflow.com</span>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Landing;
