import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import Sidebar from '../components/Sidebar';

interface LeadListItem {
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
    is_converted: boolean;
    assigned_to_details: { id: number; email: string; name: string } | null;
    created_at: string;
}

interface AgentListItem {
    id: number;
    email: string;
    name: string;
    role: string;
}

const LeadsList = () => {
    const { user } = useAuth();
    
    // Data lists & query states
    const [leads, setLeads] = useState<LeadListItem[]>([]);
    const [agents, setAgents] = useState<AgentListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [sourceFilter, setSourceFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [assignedFilter, setAssignedFilter] = useState('');
    const [ordering, setOrdering] = useState('-created_at');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newLead, setNewLead] = useState({
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
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchLeads();
    }, [search, statusFilter, sourceFilter, priorityFilter, assignedFilter, ordering, currentPage]);

    useEffect(() => {
        if (user && (user.role === 'Admin' || user.role === 'Manager')) {
            fetchAgents();
        }
    }, [user]);

    const fetchLeads = async () => {
        setIsLoading(true);
        try {
            const endpoint = `/leads/?search=${encodeURIComponent(search)}` +
                             `&status=${statusFilter}` +
                             `&source=${sourceFilter}` +
                             `&priority=${priorityFilter}` +
                             `&assigned_to=${assignedFilter}` +
                             `&ordering=${ordering}` +
                             `&page=${currentPage}`;
            
            const data = await apiRequest(endpoint);
            setLeads(data.results);
            setTotalCount(data.count);
            setTotalPages(Math.ceil(data.count / 10) || 1);
        } catch (err) {
            console.error('Failed to fetch leads:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAgents = async () => {
        try {
            const data = await apiRequest('/users/');
            const staffList = data.filter((u: any) => u.role !== 'Customer');
            setAgents(staffList);
        } catch (err) {
            console.error('Failed to load agents list:', err);
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setCurrentPage(1);
    };

    const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLSelectElement>) => {
        setter(e.target.value);
        setCurrentPage(1);
    };

    const handleOrderingChange = (column: string) => {
        const newOrdering = ordering === column ? `-${column}` : column;
        setOrdering(newOrdering);
        setCurrentPage(1);
    };

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setNewLead({
            ...newLead,
            [e.target.id]: e.target.value
        });
        if (formErrors[e.target.id]) {
            setFormErrors({ ...formErrors, [e.target.id]: '' });
        }
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!newLead.first_name) errors.first_name = 'First name is required';
        if (!newLead.last_name) errors.last_name = 'Last name is required';
        
        if (!newLead.email) {
            errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(newLead.email)) {
            errors.email = 'Please enter a valid email address';
        }

        if (newLead.phone) {
            const digits = newLead.phone.replace(/[^0-9]/g, '');
            if (digits.length < 7) {
                errors.phone = 'Please enter a valid phone number (min 7 digits)';
            }
        }

        if (newLead.follow_up_date) {
            const selectedDate = new Date(newLead.follow_up_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selectedDate < today) {
                errors.follow_up_date = 'Follow-up date cannot be in the past';
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormErrorMsg(null);
        setFormSuccessMsg(null);

        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            const payload = {
                ...newLead,
                assigned_to: newLead.assigned_to ? parseInt(newLead.assigned_to) : null,
                follow_up_date: newLead.follow_up_date || null
            };

            await apiRequest('/leads/', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            setFormSuccessMsg('Lead registered successfully!');
            setNewLead({
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
            
            fetchLeads();
            
            setTimeout(() => {
                setShowAddModal(false);
                setFormSuccessMsg(null);
            }, 1500);
        } catch (err: any) {
            console.error('Failed to create lead:', err);
            const detail = err.data?.detail || err.data?.email?.[0] || 'An error occurred. Check inputs.';
            setFormErrorMsg(detail);
        } finally {
            setIsSubmitting(false);
        }
    };

    // UI Status & Priority badge helpers
    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Converted': return 'badge-sales';
            case 'New': return 'badge-support';
            case 'Contacted': return 'badge-manager';
            case 'Qualified': return 'badge-customer';
            case 'Proposal Sent': return 'badge-sales';
            default: return 'badge-admin'; // Lost
        }
    };

    const getPriorityBadgeClass = (priority: string) => {
        switch (priority) {
            case 'High': return 'badge-admin';
            case 'Medium': return 'badge-manager';
            default: return 'badge-support'; // Low
        }
    };

    const isSupportAgent = user?.role === 'Support Agent';

    return (
        <div className="layout-container">
            <Sidebar />

            <main className="main-content">
                <header className="header">
                    <h2 className="gradient-text">Leads Directory</h2>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        Active Leads: <strong style={{ color: 'var(--accent-secondary)' }}>{totalCount}</strong>
                    </div>
                </header>

                <div className="content-body">
                    {/* Action Bar with search and multiple filter dropdowns */}
                    <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="🔍 Search name, company..."
                                    value={search}
                                    onChange={handleSearchChange}
                                    style={{ paddingLeft: '40px' }}
                                />
                            </div>
                            
                            <select
                                className="form-input"
                                style={{ width: '120px', appearance: 'none', background: 'var(--bg-primary)' }}
                                value={statusFilter}
                                onChange={handleFilterChange(setStatusFilter)}
                            >
                                <option value="">All Statuses</option>
                                <option value="New">New</option>
                                <option value="Contacted">Contacted</option>
                                <option value="Qualified">Qualified</option>
                                <option value="Proposal Sent">Proposal Sent</option>
                                <option value="Converted">Converted</option>
                                <option value="Lost">Lost</option>
                            </select>

                            <select
                                className="form-input"
                                style={{ width: '120px', appearance: 'none', background: 'var(--bg-primary)' }}
                                value={priorityFilter}
                                onChange={handleFilterChange(setPriorityFilter)}
                            >
                                <option value="">All Priorities</option>
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>

                            <select
                                className="form-input"
                                style={{ width: '120px', appearance: 'none', background: 'var(--bg-primary)' }}
                                value={sourceFilter}
                                onChange={handleFilterChange(setSourceFilter)}
                            >
                                <option value="">All Sources</option>
                                <option value="Website">Website</option>
                                <option value="Referral">Referral</option>
                                <option value="Cold Reach">Cold Reach</option>
                                <option value="Advertisement">Advertisement</option>
                                <option value="Partner">Partner</option>
                                <option value="Other">Other</option>
                            </select>

                            {(user?.role === 'Admin' || user?.role === 'Manager') && (
                                <select
                                    className="form-input"
                                    style={{ width: '160px', appearance: 'none', background: 'var(--bg-primary)' }}
                                    value={assignedFilter}
                                    onChange={handleFilterChange(setAssignedFilter)}
                                >
                                    <option value="">All Assigned Agents</option>
                                    {agents.map((ag) => (
                                        <option key={ag.id} value={ag.id}>{ag.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {!isSupportAgent && (
                            <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ height: '44px' }}>
                                ➕ Register Lead
                            </button>
                        )}
                    </div>

                    {/* Table View */}
                    <div className="glass-panel" style={{ padding: '24px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                                <div className="spinner"></div>
                            </div>
                        ) : leads.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                <span style={{ fontSize: '32px' }}>📭</span>
                                <h4 style={{ marginTop: '12px' }}>No Leads Found</h4>
                                <p style={{ fontSize: '13px', marginTop: '4px' }}>Try adjusting your search criteria or register a new lead contact.</p>
                            </div>
                        ) : (
                            <>
                                <div className="table-container">
                                    <table className="crm-table">
                                        <thead>
                                            <tr>
                                                <th style={{ cursor: 'pointer' }} onClick={() => handleOrderingChange('last_name')}>
                                                    Lead Name {ordering.includes('last_name') ? (ordering.startsWith('-') ? '▼' : '▲') : ''}
                                                </th>
                                                <th>Company</th>
                                                <th>Source</th>
                                                <th>Priority</th>
                                                <th>Status</th>
                                                <th style={{ cursor: 'pointer' }} onClick={() => handleOrderingChange('follow_up_date')}>
                                                    Follow-up {ordering.includes('follow_up_date') ? (ordering.startsWith('-') ? '▼' : '▲') : ''}
                                                </th>
                                                <th>Assigned Sales Agent</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {leads.map((l) => (
                                                <tr key={l.id} style={{ opacity: l.is_converted ? 0.6 : 1 }}>
                                                    <td style={{ fontWeight: 600 }}>
                                                        <Link to={`/leads/${l.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                                                            {l.first_name} {l.last_name}
                                                        </Link>
                                                    </td>
                                                    <td>{l.company_name || '—'}</td>
                                                    <td style={{ fontSize: '14px' }}>{l.source}</td>
                                                    <td>
                                                        <span className={`badge ${getPriorityBadgeClass(l.priority)}`}>
                                                            {l.priority}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${getStatusBadgeClass(l.status)}`}>
                                                            {l.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontSize: '13px', fontWeight: 500 }}>
                                                        {l.follow_up_date ? (
                                                            <span>📅 {new Date(l.follow_up_date).toLocaleDateString()}</span>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-muted)' }}>Not Scheduled</span>
                                                        )}
                                                    </td>
                                                    <td style={{ fontSize: '14px' }}>
                                                        {l.assigned_to_details ? (
                                                            <span>👤 {l.assigned_to_details.name}</span>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <Link to={`/leads/${l.id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>
                                                            Details
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination controls */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', flexWrap: 'wrap', gap: '12px' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        Showing Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalCount} active leads)
                                    </span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            className="btn btn-secondary"
                                            style={{ padding: '8px 16px', fontSize: '13px' }}
                                            disabled={currentPage === 1}
                                        >
                                            ◀ Previous
                                        </button>
                                        <button
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            className="btn btn-secondary"
                                            style={{ padding: '8px 16px', fontSize: '13px' }}
                                            disabled={currentPage === totalPages}
                                        >
                                            Next ▶
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>

            {/* Add Lead Modal */}
            {showAddModal && (
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
                            <h3>Register Lead Profile</h3>
                            <button 
                                onClick={() => setShowAddModal(false)}
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

                        <form onSubmit={handleSubmit}>
                            <h4 style={{ marginBottom: '12px', color: 'var(--accent-secondary)' }}>Contact Info</h4>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="first_name">First Name</label>
                                    <input
                                        type="text"
                                        id="first_name"
                                        className="form-input"
                                        placeholder="Luke"
                                        value={newLead.first_name}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                    />
                                    {formErrors.first_name && <div className="form-error">⚠️ {formErrors.first_name}</div>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="last_name">Last Name</label>
                                    <input
                                        type="text"
                                        id="last_name"
                                        className="form-input"
                                        placeholder="Skywalker"
                                        value={newLead.last_name}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
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
                                        placeholder="luke@jedi.org"
                                        value={newLead.email}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                    />
                                    {formErrors.email && <div className="form-error">⚠️ {formErrors.email}</div>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="phone">Phone Number</label>
                                    <input
                                        type="text"
                                        id="phone"
                                        className="form-input"
                                        placeholder="+1 555-9001"
                                        value={newLead.phone}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
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
                                        placeholder="Jedi Academy"
                                        value={newLead.company_name}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="source">Lead Source</label>
                                    <select
                                        id="source"
                                        className="form-input"
                                        value={newLead.source}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
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
                                        value={newLead.status}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
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
                                        value={newLead.priority}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
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
                                        value={newLead.follow_up_date}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                    />
                                    {formErrors.follow_up_date && <div className="form-error">⚠️ {formErrors.follow_up_date}</div>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="assigned_to">Assigned Sales Agent</label>
                                    <select
                                        id="assigned_to"
                                        className="form-input"
                                        value={newLead.assigned_to}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting || !(user?.role === 'Admin' || user?.role === 'Manager')}
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
                                    placeholder="Enter initial context..."
                                    style={{ height: '70px', resize: 'vertical' }}
                                    value={newLead.notes}
                                    onChange={handleInputChange}
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setShowAddModal(false)} 
                                    className="btn btn-secondary" 
                                    style={{ flex: 1 }}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn btn-primary" 
                                    style={{ flex: 1 }}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Registering...' : 'Register Lead'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeadsList;
