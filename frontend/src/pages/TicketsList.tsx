import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import Sidebar from '../components/Sidebar';

interface CustomerSummary {
    id: number;
    name: string;
    company_name: string;
    email: string;
}

interface TicketListItem {
    id: number;
    ticket_number: string;
    customer: number;
    customer_details: CustomerSummary;
    subject: string;
    description: string;
    category: string;
    priority: string;
    status: string;
    assigned_to_details: { id: number; email: string; name: string } | null;
    created_at: string;
}

const TicketsList = () => {
    const { user } = useAuth();
    
    // Data list states
    const [tickets, setTickets] = useState<TicketListItem[]>([]);
    const [customers, setCustomers] = useState<CustomerSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter & Search queries
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [ordering, setOrdering] = useState('-created_at');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTicket, setNewTicket] = useState({
        subject: '',
        description: '',
        category: 'General',
        priority: 'Medium',
        customer: ''
    });

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [formErrorMsg, setFormErrorMsg] = useState<string | null>(null);
    const [formSuccessMsg, setFormSuccessMsg] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        fetchTickets();
    }, [search, statusFilter, priorityFilter, categoryFilter, ordering, currentPage]);

    useEffect(() => {
        if (showAddModal && user && user.role !== 'Customer') {
            fetchCustomers();
        }
    }, [showAddModal, user]);

    const fetchTickets = async () => {
        setIsLoading(true);
        try {
            const endpoint = `/tickets/?search=${encodeURIComponent(search)}` +
                             `&status=${statusFilter}` +
                             `&priority=${priorityFilter}` +
                             `&category=${categoryFilter}` +
                             `&ordering=${ordering}` +
                             `&page=${currentPage}`;
            const data = await apiRequest(endpoint);
            setTickets(data.results);
            setTotalCount(data.count);
            setTotalPages(Math.ceil(data.count / 10) || 1);
        } catch (err) {
            console.error('Failed to load tickets queue:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCustomers = async () => {
        try {
            const res = await apiRequest('/customers/?page_size=100');
            const list = res.results.map((c: any) => ({
                id: c.id,
                name: `${c.first_name} ${c.last_name}`,
                company_name: c.company_name,
                email: c.email
            }));
            setCustomers(list);
        } catch (err) {
            console.error('Failed to fetch customers list:', err);
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
        setNewTicket({
            ...newTicket,
            [e.target.id]: e.target.value
        });
        if (formErrors[e.target.id]) {
            setFormErrors({ ...formErrors, [e.target.id]: '' });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!newTicket.subject) errors.subject = 'Subject is required';
        if (!newTicket.description) errors.description = 'Description notes are required';
        
        if (user && user.role !== 'Customer') {
            if (!newTicket.customer) errors.customer = 'Please select a customer contact';
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
            // Using FormData because we may have file uploads!
            const formData = new FormData();
            formData.append('subject', newTicket.subject);
            formData.append('description', newTicket.description);
            formData.append('category', newTicket.category);
            formData.append('priority', newTicket.priority);

            if (user && user.role !== 'Customer') {
                formData.append('customer', newTicket.customer);
            } else {
                // Customer is resolved automatically on the backend using user's email,
                // but let's query backend for customer first or pass empty which viewset perform_create resolves!
                // To bypass DRF field requirement, we can pass dummy 0 or get it if preloaded.
                // Actually, the serializer expects customer PrimaryKeyRelatedField. Let's pre-load customer ID for customer role!
                if (user) {
                    try {
                        const custRes = await apiRequest(`/customers/?search=${encodeURIComponent(user.email)}`);
                        if (custRes.results && custRes.results.length > 0) {
                            formData.append('customer', custRes.results[0].id.toString());
                        }
                    } catch (lookupErr) {
                        console.error("Lookup customer id failed:", lookupErr);
                    }
                }
            }

            if (selectedFile) {
                formData.append('attachment', selectedFile);
            }

            // Fetch wrapper that handles FormData upload
            const token = localStorage.getItem('accessToken');
            const headers: Record<string, string> = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/api/tickets/', {
                method: 'POST',
                headers: headers,
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json();
                throw { data: errData };
            }

            setFormSuccessMsg('Support ticket opened successfully!');
            setNewTicket({
                subject: '',
                description: '',
                category: 'General',
                priority: 'Medium',
                customer: ''
            });
            setSelectedFile(null);
            
            fetchTickets();

            setTimeout(() => {
                setShowAddModal(false);
                setFormSuccessMsg(null);
            }, 1500);
        } catch (err: any) {
            console.error('Failed to create ticket:', err);
            setFormErrorMsg(err.data?.detail || 'An error occurred. Check inputs.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Style Helpers
    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Resolved': return 'badge-sales';
            case 'Open': return 'badge-admin';
            case 'In Progress': return 'badge-manager';
            case 'Closed': return 'badge-support';
            default: return 'badge-support';
        }
    };

    const getPriorityBadgeClass = (priority: string) => {
        switch (priority) {
            case 'Urgent': return 'badge-admin';
            case 'High': return 'badge-manager';
            case 'Medium': return 'badge-customer';
            default: return 'badge-support';
        }
    };

    return (
        <div className="layout-container">
            <Sidebar />

            <main className="main-content">
                <header className="header">
                    <h2 className="gradient-text">Support Helpdesk Queue</h2>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        Tickets: <strong style={{ color: 'var(--accent-secondary)' }}>{totalCount}</strong>
                    </div>
                </header>

                <div className="content-body">
                    {/* Filter bar */}
                    <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="🔍 Search Ticket #, subject, client..."
                                value={search}
                                onChange={handleSearchChange}
                                style={{ maxWidth: '300px' }}
                            />

                            <select
                                className="form-input"
                                style={{ width: '120px', appearance: 'none', background: 'var(--bg-primary)' }}
                                value={statusFilter}
                                onChange={handleFilterChange(setStatusFilter)}
                            >
                                <option value="">All Statuses</option>
                                <option value="Open">Open</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Resolved">Resolved</option>
                                <option value="Closed">Closed</option>
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
                                <option value="Urgent">Urgent</option>
                            </select>

                            <select
                                className="form-input"
                                style={{ width: '140px', appearance: 'none', background: 'var(--bg-primary)' }}
                                value={categoryFilter}
                                onChange={handleFilterChange(setCategoryFilter)}
                            >
                                <option value="">All Categories</option>
                                <option value="Technical">Technical</option>
                                <option value="Billing">Billing</option>
                                <option value="General">General</option>
                                <option value="Feature Request">Feature Request</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ height: '44px' }}>
                            🎫 Open Ticket
                        </button>
                    </div>

                    {/* Table listing */}
                    <div className="glass-panel" style={{ padding: '24px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                                <div className="spinner"></div>
                            </div>
                        ) : tickets.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                <span style={{ fontSize: '32px' }}>🎫</span>
                                <h4 style={{ marginTop: '12px' }}>No Support Tickets Found</h4>
                                <p style={{ fontSize: '13px', marginTop: '4px' }}>Try adjusting your search filters or submit a new helpdesk ticket.</p>
                            </div>
                        ) : (
                            <>
                                <div className="table-container">
                                    <table className="crm-table">
                                        <thead>
                                            <tr>
                                                <th style={{ cursor: 'pointer' }} onClick={() => handleOrderingChange('ticket_number')}>
                                                    Ticket # {ordering.includes('ticket_number') ? (ordering.startsWith('-') ? '▼' : '▲') : ''}
                                                </th>
                                                <th>Subject</th>
                                                <th>Client Contact</th>
                                                <th>Category</th>
                                                <th>Priority</th>
                                                <th>Status</th>
                                                <th style={{ cursor: 'pointer' }} onClick={() => handleOrderingChange('created_at')}>
                                                    Opened {ordering.includes('created_at') ? (ordering.startsWith('-') ? '▼' : '▲') : ''}
                                                </th>
                                                <th>Assigned Agent</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tickets.map((t) => (
                                                <tr key={t.id}>
                                                    <td style={{ fontWeight: 'bold', color: 'var(--accent-secondary)' }}>{t.ticket_number}</td>
                                                    <td style={{ fontWeight: 600, maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        <Link to={`/tickets/${t.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                                                            {t.subject}
                                                        </Link>
                                                    </td>
                                                    <td>
                                                        {t.customer_details ? (
                                                            <div style={{ fontSize: '14px' }}>
                                                                <div>{t.customer_details.name}</div>
                                                                <small style={{ color: 'var(--text-secondary)' }}>{t.customer_details.company_name}</small>
                                                            </div>
                                                        ) : '—'}
                                                    </td>
                                                    <td style={{ fontSize: '14px' }}>{t.category}</td>
                                                    <td>
                                                        <span className={`badge ${getPriorityBadgeClass(t.priority)}`}>
                                                            {t.priority}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${getStatusBadgeClass(t.status)}`}>
                                                            {t.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontSize: '13px' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                                                    <td style={{ fontSize: '14px' }}>
                                                        {t.assigned_to_details ? (
                                                            <span>👤 {t.assigned_to_details.name}</span>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <Link to={`/tickets/${t.id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>
                                                            View Thread
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', flexWrap: 'wrap', gap: '12px' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        Showing Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalCount} tickets)
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

            {/* Create Ticket Modal */}
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
                    <div className="glass-card" style={{ width: '100%', maxWidth: '540px', padding: '32px', overflowY: 'auto', maxHeight: '90vh' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3>Open Support Ticket</h3>
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
                            <div className="form-group">
                                <label className="form-label" htmlFor="subject">Issue Subject</label>
                                <input
                                    type="text"
                                    id="subject"
                                    className="form-input"
                                    placeholder="Brief description of the problem..."
                                    value={newTicket.subject}
                                    onChange={handleInputChange}
                                    disabled={isSubmitting}
                                />
                                {formErrors.subject && <div className="form-error">⚠️ {formErrors.subject}</div>}
                            </div>

                            {user?.role !== 'Customer' && (
                                <div className="form-group">
                                    <label className="form-label" htmlFor="customer">Customer Contact (Directory)</label>
                                    <select
                                        id="customer"
                                        className="form-input"
                                        value={newTicket.customer}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                        style={{ appearance: 'none', background: 'var(--bg-primary)' }}
                                    >
                                        <option value="">Select Customer Link</option>
                                        {customers.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.company_name})</option>
                                        ))}
                                    </select>
                                    {formErrors.customer && <div className="form-error">⚠️ {formErrors.customer}</div>}
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="category">Category</label>
                                    <select
                                        id="category"
                                        className="form-input"
                                        value={newTicket.category}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                        style={{ appearance: 'none', background: 'var(--bg-primary)' }}
                                    >
                                        <option value="Technical">Technical</option>
                                        <option value="Billing">Billing</option>
                                        <option value="General">General</option>
                                        <option value="Feature Request">Feature Request</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="priority">Priority</label>
                                    <select
                                        id="priority"
                                        className="form-input"
                                        value={newTicket.priority}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                        style={{ appearance: 'none', background: 'var(--bg-primary)' }}
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="description">Problem Description & Details</label>
                                <textarea
                                    id="description"
                                    className="form-input"
                                    placeholder="Provide detailed logs or contexts of the issue..."
                                    style={{ height: '110px', resize: 'vertical' }}
                                    value={newTicket.description}
                                    onChange={handleInputChange}
                                    disabled={isSubmitting}
                                />
                                {formErrors.description && <div className="form-error">⚠️ {formErrors.description}</div>}
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="attachment">Upload Attachment (Logs, screenshots)</label>
                                <input
                                    type="file"
                                    id="attachment"
                                    className="form-input"
                                    onChange={handleFileChange}
                                    disabled={isSubmitting}
                                    style={{ padding: '8px' }}
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
                                    {isSubmitting ? 'Opening Ticket...' : 'Open Ticket'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TicketsList;
