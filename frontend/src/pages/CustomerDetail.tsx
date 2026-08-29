import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import Sidebar from '../components/Sidebar';

interface CustomerDetailData {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    company_name: string;
    company_website: string;
    status: string;
    address: string;
    assigned_to: number | null;
    assigned_to_details: { id: number; email: string; name: string } | null;
    created_by_details: { id: number; email: string; name: string } | null;
    created_at: string;
    updated_at: string;
}

interface HistoryItem {
    id: number;
    action: string;
    note: string;
    timestamp: string;
    action_by_details: { id: number; email: string; name: string; role: string } | null;
}

interface AgentListItem {
    id: number;
    email: string;
    name: string;
    role: string;
}

const CustomerDetail = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();

    // Data states
    const [customer, setCustomer] = useState<CustomerDetailData | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [agents, setAgents] = useState<AgentListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Activity note state
    const [noteText, setNoteText] = useState('');
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);
    
    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editData, setEditData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company_name: '',
        company_website: '',
        status: 'Lead',
        address: '',
        assigned_to: ''
    });
    
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [formErrorMsg, setFormErrorMsg] = useState<string | null>(null);
    const [formSuccessMsg, setFormSuccessMsg] = useState<string | null>(null);
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

    // Delete Confirmation State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (id) {
            loadCustomerData();
        }
    }, [id]);

    useEffect(() => {
        if (user && (user.role === 'Admin' || user.role === 'Manager')) {
            loadAgents();
        }
    }, [user]);

    const loadCustomerData = async () => {
        setIsLoading(true);
        try {
            const customerData = await apiRequest(`/customers/${id}/`);
            setCustomer(customerData);
            
            // Populate edit form fields
            setEditData({
                first_name: customerData.first_name,
                last_name: customerData.last_name,
                email: customerData.email,
                phone: customerData.phone,
                company_name: customerData.company_name,
                company_website: customerData.company_website,
                status: customerData.status,
                address: customerData.address,
                assigned_to: customerData.assigned_to ? customerData.assigned_to.toString() : ''
            });

            // Fetch history
            const historyData = await apiRequest(`/customers/${id}/history/`);
            setHistory(historyData);
        } catch (err) {
            console.error('Failed to load customer details:', err);
            // Redirect back to directory if not found or unauthorized
            navigate('/customers');
        } finally {
            setIsLoading(false);
        }
    };

    const loadAgents = async () => {
        try {
            const data = await apiRequest('/users/');
            const staffList = data.filter((u: any) => u.role !== 'Customer');
            setAgents(staffList);
        } catch (err) {
            console.error('Failed to load agents list:', err);
        }
    };

    const handleNoteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const note = noteText.trim();
        if (!note) return;

        setIsSubmittingNote(true);
        try {
            await apiRequest(`/customers/${id}/add-note/`, {
                method: 'POST',
                body: JSON.stringify({ note })
            });
            
            setNoteText('');
            
            // Reload history timeline logs
            const historyData = await apiRequest(`/customers/${id}/history/`);
            setHistory(historyData);
        } catch (err) {
            console.error('Failed to append note:', err);
        } finally {
            setIsSubmittingNote(false);
        }
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setEditData({
            ...editData,
            [e.target.id]: e.target.value
        });
        if (formErrors[e.target.id]) {
            setFormErrors({ ...formErrors, [e.target.id]: '' });
        }
    };

    const validateEditForm = () => {
        const errors: Record<string, string> = {};
        if (!editData.first_name) errors.first_name = 'First name is required';
        if (!editData.last_name) errors.last_name = 'Last name is required';
        
        if (!editData.email) {
            errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(editData.email)) {
            errors.email = 'Please enter a valid email address';
        }

        if (editData.phone) {
            const digits = editData.phone.replace(/[^0-9]/g, '');
            if (digits.length < 7) {
                errors.phone = 'Please enter a valid phone number (min 7 digits)';
            }
        }

        if (editData.company_website) {
            if (!/^https?:\/\/\S+\.\S+/.test(editData.company_website)) {
                errors.company_website = 'Please enter a valid website URL (must start with http:// or https://)';
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormErrorMsg(null);
        setFormSuccessMsg(null);

        if (!validateEditForm()) return;

        setIsSubmittingEdit(true);
        try {
            const payload = {
                ...editData,
                assigned_to: editData.assigned_to ? parseInt(editData.assigned_to) : null
            };

            const updatedData = await apiRequest(`/customers/${id}/`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            setCustomer(updatedData);
            setFormSuccessMsg('Profile updated successfully!');
            
            // Reload history
            const historyData = await apiRequest(`/customers/${id}/history/`);
            setHistory(historyData);

            setTimeout(() => {
                setShowEditModal(false);
                setFormSuccessMsg(null);
            }, 1500);
        } catch (err: any) {
            console.error('Failed to edit customer:', err);
            const detail = err.data?.detail || err.data?.email?.[0] || err.data?.company_website?.[0] || 'Failed to save edits.';
            setFormErrorMsg(detail);
        } finally {
            setIsSubmittingEdit(false);
        }
    };

    const handleDeleteCustomer = async () => {
        setIsDeleting(true);
        try {
            await apiRequest(`/customers/${id}/`, {
                method: 'DELETE'
            });
            navigate('/customers');
        } catch (err: any) {
            console.error('Deletion failed:', err);
            setIsDeleting(false);
            setShowDeleteConfirm(false);
            alert(err.data?.detail || 'Failed to delete customer profile.');
        }
    };

    // Role verification checkers
    const canModify = () => {
        if (!user || !customer) return false;
        if (user.role === 'Admin' || user.role === 'Manager') return true;
        if (user.role === 'Support Agent') return false;
        // Sales Agent: checks ownership
        return customer.created_by_details?.id === user.id || customer.assigned_to_details?.id === user.id;
    };

    const isSupportAgent = user?.role === 'Support Agent';

    // Status Badge Helpers
    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Active': return 'badge-sales';
            case 'Lead': return 'badge-support';
            case 'Inactive': return 'badge-manager';
            default: return 'badge-admin';
        }
    };

    const getActionEmoji = (action: string) => {
        if (action.includes('created')) return '🌱';
        if (action.includes('note')) return '📝';
        if (action.includes('Status')) return '⚙️';
        if (action.includes('Agent') || action.includes('Assigned')) return '👥';
        return '🛠️';
    };

    if (isLoading || !customer) {
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <Link to="/customers" className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>
                            ◀ Directory
                        </Link>
                        <h2 className="gradient-text">{customer.first_name} {customer.last_name}</h2>
                    </div>
                    <div>
                        <span className={`badge ${getStatusBadgeClass(customer.status)}`} style={{ padding: '6px 14px', fontSize: '13px' }}>
                            {customer.status} Account
                        </span>
                    </div>
                </header>

                <div className="content-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1.2fr) minmax(320px, 1.8fr)', gap: '32px', alignItems: 'start' }}>
                        
                        {/* LEFT COLUMN: Customer profile details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            
                            {/* Details Panel */}
                            <div className="glass-panel" style={{ padding: '28px' }}>
                                <h3 style={{ marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                                    Contact & Company Info
                                </h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</div>
                                        <div style={{ fontSize: '15px', fontWeight: 600, wordBreak: 'break-all' }}>{customer.email}</div>
                                    </div>

                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone Number</div>
                                        <div style={{ fontSize: '15px', fontWeight: 600 }}>{customer.phone || '—'}</div>
                                    </div>

                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Company</div>
                                        <div style={{ fontSize: '15px', fontWeight: 600 }}>
                                            {customer.company_website ? (
                                                <a href={customer.company_website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-secondary)', textDecoration: 'none' }}>
                                                    {customer.company_name} ↗
                                                </a>
                                            ) : (
                                                customer.company_name || '—'
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Billing Address</div>
                                        <div style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '6px', marginTop: '4px' }}>
                                            {customer.address || 'No address logged.'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Ownership Panel */}
                            <div className="glass-panel" style={{ padding: '24px' }}>
                                <h4 style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>CRM Assignments</h4>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Assigned Manager:</span>
                                        <strong style={{ color: 'var(--accent-secondary)' }}>
                                            {customer.assigned_to_details ? customer.assigned_to_details.name : 'Unassigned'}
                                        </strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Registered By:</span>
                                        <strong>
                                            {customer.created_by_details ? customer.created_by_details.name : 'System Seed'}
                                        </strong>
                                    </div>
                                </div>
                            </div>

                            {/* Profile action controls */}
                            {canModify() ? (
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <button onClick={() => setShowEditModal(true)} className="btn btn-primary" style={{ flex: 1 }}>
                                        📝 Edit Profile
                                    </button>
                                    <button onClick={() => setShowDeleteConfirm(true)} className="btn btn-danger" style={{ flex: 1 }}>
                                        🗑️ Delete Contact
                                    </button>
                                </div>
                            ) : isSupportAgent ? (
                                <div className="badge badge-manager" style={{ padding: '10px', display: 'block', textAlign: 'center', fontSize: '12px' }}>
                                    Support role is limited to view and logging timeline activity notes.
                                </div>
                            ) : (
                                <div className="badge badge-admin" style={{ padding: '10px', display: 'block', textAlign: 'center', fontSize: '12px' }}>
                                    Access Restricted: Edits allowed only for assigned Sales agent.
                                </div>
                            )}

                        </div>

                        {/* RIGHT COLUMN: History timelines and note posts */}
                        <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            
                            {/* Notes Input Area */}
                            <div>
                                <h3 style={{ marginBottom: '16px' }}>Log Activity Note</h3>
                                <form onSubmit={handleNoteSubmit}>
                                    <div className="form-group" style={{ marginBottom: '12px' }}>
                                        <textarea
                                            className="form-input"
                                            placeholder="Write note here (e.g. Contacted client for pricing review...)"
                                            style={{ height: '90px', resize: 'vertical' }}
                                            value={noteText}
                                            onChange={(e) => setNoteText(e.target.value)}
                                            disabled={isSubmittingNote}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <button 
                                            type="submit" 
                                            className="btn btn-primary" 
                                            style={{ padding: '10px 24px', fontSize: '14px' }}
                                            disabled={isSubmittingNote || !noteText.trim()}
                                        >
                                            {isSubmittingNote ? 'Logging...' : 'Post Activity Note'}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Timeline Activity history logs */}
                            <div>
                                <h3 style={{ marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                                    Customer Activity History Timeline
                                </h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', paddingLeft: '8px' }}>
                                    {/* Vertical Timeline bar */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        bottom: '12px',
                                        left: '20px',
                                        width: '2px',
                                        background: 'rgba(138, 43, 226, 0.15)',
                                        zIndex: 0
                                    }}></div>

                                    {history.map((item) => (
                                        <div key={item.id} style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}>
                                            {/* Action Emoji Node */}
                                            <div style={{
                                                width: '26px',
                                                height: '26px',
                                                borderRadius: '50%',
                                                background: 'var(--bg-tertiary)',
                                                border: '1.5px solid var(--accent-primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '12px',
                                                flexShrink: 0
                                            }}>
                                                {getActionEmoji(item.action)}
                                            </div>

                                            {/* Timeline content bubble */}
                                            <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: 600 }}>{item.action}</span>
                                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                        {new Date(item.timestamp).toLocaleString()}
                                                    </span>
                                                </div>
                                                
                                                {item.action_by_details && (
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: item.note ? '8px' : 0 }}>
                                                        Performed by: <strong>{item.action_by_details.name}</strong> ({item.action_by_details.role})
                                                    </div>
                                                )}

                                                {item.note && (
                                                    <div style={{
                                                        fontSize: '13px',
                                                        color: 'var(--text-primary)',
                                                        whiteSpace: 'pre-wrap',
                                                        background: 'rgba(0,0,0,0.2)',
                                                        padding: '10px',
                                                        borderRadius: '6px',
                                                        borderLeft: '2px solid var(--accent-secondary)'
                                                    }}>
                                                        {item.note}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </main>

            {/* Edit Customer Modal */}
            {showEditModal && (
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
                    <div className="glass-card" style={{ width: '100%', maxWidth: '600px', padding: '32px', overflowY: 'auto', maxHeight: '90vh' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3>Edit Customer Profile</h3>
                            <button 
                                onClick={() => setShowEditModal(false)}
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

                        <form onSubmit={handleEditSubmit}>
                            <h4 style={{ marginBottom: '12px', color: 'var(--accent-secondary)' }}>Contact Info</h4>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="first_name">First Name</label>
                                    <input
                                        type="text"
                                        id="first_name"
                                        className="form-input"
                                        value={editData.first_name}
                                        onChange={handleEditChange}
                                        disabled={isSubmittingEdit}
                                    />
                                    {formErrors.first_name && <div className="form-error">⚠️ {formErrors.first_name}</div>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="last_name">Last Name</label>
                                    <input
                                        type="text"
                                        id="last_name"
                                        className="form-input"
                                        value={editData.last_name}
                                        onChange={handleEditChange}
                                        disabled={isSubmittingEdit}
                                    />
                                    {formErrors.last_name && <div className="form-error">⚠️ {formErrors.last_name}</div>}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="email">Email Address</label>
                                    <input
                                        type="email"
                                        id="email"
                                        className="form-input"
                                        value={editData.email}
                                        onChange={handleEditChange}
                                        disabled={isSubmittingEdit}
                                    />
                                    {formErrors.email && <div className="form-error">⚠️ {formErrors.email}</div>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="phone">Phone Number</label>
                                    <input
                                        type="text"
                                        id="phone"
                                        className="form-input"
                                        value={editData.phone}
                                        onChange={handleEditChange}
                                        disabled={isSubmittingEdit}
                                    />
                                    {formErrors.phone && <div className="form-error">⚠️ {formErrors.phone}</div>}
                                </div>
                            </div>

                            <h4 style={{ margin: '16px 0 12px', color: 'var(--accent-secondary)' }}>Company Info</h4>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="company_name">Company Name</label>
                                    <input
                                        type="text"
                                        id="company_name"
                                        className="form-input"
                                        value={editData.company_name}
                                        onChange={handleEditChange}
                                        disabled={isSubmittingEdit}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="company_website">Company Website</label>
                                    <input
                                        type="url"
                                        id="company_website"
                                        className="form-input"
                                        value={editData.company_website}
                                        onChange={handleEditChange}
                                        disabled={isSubmittingEdit}
                                    />
                                    {formErrors.company_website && <div className="form-error">⚠️ {formErrors.company_website}</div>}
                                </div>
                            </div>

                            <h4 style={{ margin: '16px 0 12px', color: 'var(--accent-secondary)' }}>CRM Administration</h4>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="status">Customer Status</label>
                                    <select
                                        id="status"
                                        className="form-input"
                                        value={editData.status}
                                        onChange={handleEditChange}
                                        disabled={isSubmittingEdit}
                                        style={{ appearance: 'none', background: 'var(--bg-primary)' }}
                                    >
                                        <option value="Lead">Lead</option>
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Churned">Churned</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="assigned_to">Assigned Agent</label>
                                    <select
                                        id="assigned_to"
                                        className="form-input"
                                        value={editData.assigned_to}
                                        onChange={handleEditChange}
                                        disabled={isSubmittingEdit || !(user?.role === 'Admin' || user?.role === 'Manager')}
                                        style={{ appearance: 'none', background: 'var(--bg-primary)' }}
                                    >
                                        <option value="">Unassigned</option>
                                        {agents.map((ag) => (
                                            <option key={ag.id} value={ag.id}>{ag.name} ({ag.role})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="address">Billing Address</label>
                                <textarea
                                    id="address"
                                    className="form-input"
                                    style={{ height: '70px', resize: 'vertical' }}
                                    value={editData.address}
                                    onChange={handleEditChange}
                                    disabled={isSubmittingEdit}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setShowEditModal(false)} 
                                    className="btn btn-secondary" 
                                    style={{ flex: 1 }}
                                    disabled={isSubmittingEdit}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn btn-primary" 
                                    style={{ flex: 1 }}
                                    disabled={isSubmittingEdit}
                                >
                                    {isSubmittingEdit ? 'Saving...' : 'Save Profile Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Overlay */}
            {showDeleteConfirm && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 110,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '32px', textAlign: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
                        <h3 style={{ marginBottom: '12px' }}>Delete Customer Profile?</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                            Are you sure you want to permanently delete <strong>{customer.first_name} {customer.last_name}</strong>? This action will destroy all billing info and timeline history.
                        </p>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <button 
                                onClick={() => setShowDeleteConfirm(false)} 
                                className="btn btn-secondary" 
                                style={{ flex: 1 }}
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDeleteCustomer} 
                                className="btn btn-danger" 
                                style={{ flex: 1 }}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerDetail;
