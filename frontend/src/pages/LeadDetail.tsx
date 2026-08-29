import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import Sidebar from '../components/Sidebar';

interface LeadDetailData {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    company_name: string;
    source: string;
    status: string;
    priority: string;
    follow_up_date: string | null;
    notes: string;
    is_converted: boolean;
    converted_customer: number | null;
    converted_customer_details: { id: number; name: string } | null;
    assigned_to: number | null;
    assigned_to_details: { id: number; email: string; name: string } | null;
    created_by_details: { id: number; email: string; name: string } | null;
    created_at: string;
    updated_at: string;
}

interface AgentListItem {
    id: number;
    email: string;
    name: string;
    role: string;
}

const LeadDetail = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const isSupportAgent = user?.role === 'Support Agent';

    // Data States
    const [lead, setLead] = useState<LeadDetailData | null>(null);
    const [agents, setAgents] = useState<AgentListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editData, setEditData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company_name: '',
        source: 'Website',
        status: 'New',
        priority: 'Medium',
        follow_up_date: '',
        notes: '',
        assigned_to: ''
    });

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [formErrorMsg, setFormErrorMsg] = useState<string | null>(null);
    const [formSuccessMsg, setFormSuccessMsg] = useState<string | null>(null);
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

    // Delete Confirmation State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Conversion Confirmation State
    const [showConvertConfirm, setShowConvertConfirm] = useState(false);
    const [isConverting, setIsConverting] = useState(false);

    useEffect(() => {
        if (id) {
            loadLeadData();
        }
    }, [id]);

    useEffect(() => {
        if (user && (user.role === 'Admin' || user.role === 'Manager')) {
            loadAgents();
        }
    }, [user]);

    const loadLeadData = async () => {
        setIsLoading(true);
        try {
            const data = await apiRequest(`/leads/${id}/`);
            setLead(data);
            
            setEditData({
                first_name: data.first_name,
                last_name: data.last_name,
                email: data.email,
                phone: data.phone,
                company_name: data.company_name,
                source: data.source,
                status: data.status,
                priority: data.priority,
                follow_up_date: data.follow_up_date || '',
                notes: data.notes,
                assigned_to: data.assigned_to ? data.assigned_to.toString() : ''
            });
        } catch (err) {
            console.error('Failed to load lead details:', err);
            navigate('/leads');
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

        if (editData.follow_up_date) {
            const selectedDate = new Date(editData.follow_up_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selectedDate < today) {
                errors.follow_up_date = 'Follow-up date cannot be in the past';
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
                assigned_to: editData.assigned_to ? parseInt(editData.assigned_to) : null,
                follow_up_date: editData.follow_up_date || null
            };

            const updatedData = await apiRequest(`/leads/${id}/`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            setLead(updatedData);
            setFormSuccessMsg('Lead updated successfully!');
            setTimeout(() => {
                setShowEditModal(false);
                setFormSuccessMsg(null);
            }, 1500);
        } catch (err: any) {
            console.error('Failed to edit lead:', err);
            const detail = err.data?.detail || err.data?.email?.[0] || 'Failed to save changes.';
            setFormErrorMsg(detail);
        } finally {
            setIsSubmittingEdit(false);
        }
    };

    const handleDeleteLead = async () => {
        setIsDeleting(true);
        try {
            await apiRequest(`/leads/${id}/`, { method: 'DELETE' });
            navigate('/leads');
        } catch (err: any) {
            console.error('Deletion failed:', err);
            setIsDeleting(false);
            setShowDeleteConfirm(false);
            alert(err.data?.detail || 'Failed to delete lead.');
        }
    };

    const handleConvertLead = async () => {
        setIsConverting(true);
        try {
            const res = await apiRequest(`/leads/${id}/convert/`, { method: 'POST' });
            setIsConverting(false);
            setShowConvertConfirm(false);
            
            // Redirect user directly to the new Customer detail page!
            navigate(`/customers/${res.customer_id}`);
        } catch (err: any) {
            console.error('Lead conversion failed:', err);
            setIsConverting(false);
            setShowConvertConfirm(false);
            alert(err.data?.detail || 'Failed to convert lead.');
        }
    };

    const canModify = () => {
        if (!user || !lead) return false;
        if (user.role === 'Admin' || user.role === 'Manager') return true;
        if (user.role === 'Support Agent') return false;
        return lead.created_by_details?.id === user.id || lead.assigned_to_details?.id === user.id;
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Converted': return 'badge-sales';
            case 'New': return 'badge-support';
            case 'Contacted': return 'badge-manager';
            case 'Qualified': return 'badge-customer';
            case 'Proposal Sent': return 'badge-sales';
            default: return 'badge-admin';
        }
    };

    const getPriorityBadgeClass = (priority: string) => {
        switch (priority) {
            case 'High': return 'badge-admin';
            case 'Medium': return 'badge-manager';
            default: return 'badge-support';
        }
    };

    if (isLoading || !lead) {
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
                        <Link to="/leads" className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>
                            ◀ Directory
                        </Link>
                        <h2 className="gradient-text">{lead.first_name} {lead.last_name}</h2>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <span className={`badge ${getPriorityBadgeClass(lead.priority)}`} style={{ padding: '6px 14px', fontSize: '13px' }}>
                            {lead.priority} Priority
                        </span>
                        <span className={`badge ${getStatusBadgeClass(lead.status)}`} style={{ padding: '6px 14px', fontSize: '13px' }}>
                            {lead.status} Lead
                        </span>
                    </div>
                </header>

                <div className="content-body" style={{ maxWidth: '900px' }}>
                    
                    {/* Lead Converted Announcement Alert */}
                    {lead.is_converted && lead.converted_customer_details && (
                        <div className="glass-panel" style={{ padding: '20px', marginBottom: '32px', borderLeft: '4px solid var(--role-sales)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                                <h4 style={{ color: 'var(--role-sales)' }}>🎉 Converted Lead</h4>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    This prospect has been converted into a Customer profile.
                                </p>
                            </div>
                            <Link to={`/customers/${lead.converted_customer}`} className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '13px' }}>
                                View Customer Profile →
                            </Link>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', alignItems: 'start' }}>
                        
                        {/* LEFT PANEL: Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="glass-panel" style={{ padding: '28px' }}>
                                <h3 style={{ marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                                    Lead Contact & Company
                                </h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Email Address</div>
                                        <div style={{ fontSize: '15px', fontWeight: 600, wordBreak: 'break-all' }}>{lead.email}</div>
                                    </div>

                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Phone Number</div>
                                        <div style={{ fontSize: '15px', fontWeight: 600 }}>{lead.phone || '—'}</div>
                                    </div>

                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Company Name</div>
                                        <div style={{ fontSize: '15px', fontWeight: 600 }}>{lead.company_name || '—'}</div>
                                    </div>

                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Marketing Lead Source</div>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-secondary)' }}>📍 {lead.source}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions panel */}
                            {!lead.is_converted && (
                                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <h4 style={{ color: 'var(--accent-secondary)' }}>Pipeline Conversion Action</h4>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        Once this lead is qualified and ready, click the conversion button below to instantly migrate their details to the Customers directory.
                                    </p>
                                    <button 
                                        onClick={() => setShowConvertConfirm(true)} 
                                        className="btn btn-primary" 
                                        style={{ width: '100%', background: 'linear-gradient(135deg, var(--role-sales) 0%, var(--accent-primary) 100%)', boxShadow: '0 4px 15px rgba(0, 230, 118, 0.2)' }}
                                        disabled={isSupportAgent}
                                    >
                                        💼 Convert to Customer
                                    </button>
                                </div>
                            )}

                            {canModify() ? (
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <button onClick={() => setShowEditModal(true)} className="btn btn-primary" style={{ flex: 1 }}>
                                        📝 Edit Lead
                                    </button>
                                    <button onClick={() => setShowDeleteConfirm(true)} className="btn btn-danger" style={{ flex: 1 }}>
                                        🗑️ Delete Lead
                                    </button>
                                </div>
                            ) : !isSupportAgent && (
                                <div className="badge badge-admin" style={{ padding: '10px', display: 'block', textAlign: 'center', fontSize: '12px' }}>
                                    Editing restricted to assigned Sales Agent or Manager.
                                </div>
                            )}
                        </div>

                        {/* RIGHT PANEL: Pipeline Schedule & Notes */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            
                            {/* Follow up card */}
                            <div className="glass-panel" style={{ padding: '28px' }}>
                                <h3 style={{ marginBottom: '16px' }}>📅 Follow-up Schedule</h3>
                                <div style={{ background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '24px' }}>📅</span>
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>SCHEDULED DATE</div>
                                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                                            {lead.follow_up_date ? new Date(lead.follow_up_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'No follow-up scheduled.'}
                                        </div>
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px', fontSize: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Assigned Sales Agent:</span>
                                        <strong>{lead.assigned_to_details ? lead.assigned_to_details.name : 'Unassigned'}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Created:</span>
                                        <span style={{ fontSize: '13px' }}>{new Date(lead.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Context notes card */}
                            <div className="glass-panel" style={{ padding: '28px' }}>
                                <h3 style={{ marginBottom: '16px' }}>📝 Notes & Description</h3>
                                <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', minHeight: '120px', borderLeft: '2px solid var(--accent-primary)' }}>
                                    {lead.notes || 'No description notes available.'}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </main>

            {/* Edit Lead Modal */}
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
                            <h3>Edit Lead Profile</h3>
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

                            <h4 style={{ margin: '16px 0 12px', color: 'var(--accent-secondary)' }}>Marketing & Pipeline Info</h4>
                            
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
                                    <label className="form-label" htmlFor="source">Lead Source</label>
                                    <select
                                        id="source"
                                        className="form-input"
                                        value={editData.source}
                                        onChange={handleEditChange}
                                        disabled={isSubmittingEdit}
                                        style={{ appearance: 'none', background: 'var(--bg-primary)' }}
                                    >
                                        <option value="Website">Website</option>
                                        <option value="Referral">Referral</option>
                                        <option value="Cold Reach">Cold Reach</option>
                                        <option value="Advertisement">Advertisement</option>
                                        <option value="Partner">Partner</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="status">Lead Status</label>
                                    <select
                                        id="status"
                                        className="form-input"
                                        value={editData.status}
                                        onChange={handleEditChange}
                                        disabled={isSubmittingEdit}
                                        style={{ appearance: 'none', background: 'var(--bg-primary)' }}
                                    >
                                        <option value="New">New</option>
                                        <option value="Contacted">Contacted</option>
                                        <option value="Qualified">Qualified</option>
                                        <option value="Proposal Sent">Proposal Sent</option>
                                        <option value="Converted">Converted</option>
                                        <option value="Lost">Lost</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="priority">Pipeline Priority</label>
                                    <select
                                        id="priority"
                                        className="form-input"
                                        value={editData.priority}
                                        onChange={handleEditChange}
                                        disabled={isSubmittingEdit}
                                        style={{ appearance: 'none', background: 'var(--bg-primary)' }}
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="follow_up_date">Follow-up Date</label>
                                    <input
                                        type="date"
                                        id="follow_up_date"
                                        className="form-input"
                                        value={editData.follow_up_date}
                                        onChange={handleEditChange}
                                        disabled={isSubmittingEdit}
                                    />
                                    {formErrors.follow_up_date && <div className="form-error">⚠️ {formErrors.follow_up_date}</div>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="assigned_to">Assigned Sales Agent</label>
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
                                <label className="form-label" htmlFor="notes">Lead Notes & Context</label>
                                <textarea
                                    id="notes"
                                    className="form-input"
                                    style={{ height: '70px', resize: 'vertical' }}
                                    value={editData.notes}
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
                        <h3 style={{ marginBottom: '12px' }}>Delete Lead Profile?</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                            Are you sure you want to permanently delete lead contact <strong>{lead.first_name} {lead.last_name}</strong>?
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
                                onClick={handleDeleteLead} 
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

            {/* Convert Confirmation Overlay */}
            {showConvertConfirm && (
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
                    <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '32px', textAlign: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '16px' }}>💼</div>
                        <h3 style={{ marginBottom: '12px' }}>Convert Lead to Customer?</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                            Are you ready to convert <strong>{lead.first_name} {lead.last_name}</strong>? This will create an active Customer account profile and link all records.
                        </p>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <button 
                                onClick={() => setShowConvertConfirm(false)} 
                                className="btn btn-secondary" 
                                style={{ flex: 1 }}
                                disabled={isConverting}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleConvertLead} 
                                className="btn btn-primary" 
                                style={{ flex: 1, background: 'var(--role-sales)' }}
                                disabled={isConverting}
                            >
                                {isConverting ? 'Converting...' : 'Convert Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeadDetail;
