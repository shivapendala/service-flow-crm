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

interface ServiceRequestListItem {
    id: number;
    customer_details: CustomerSummary;
    category: string;
    priority: string;
    status: string;
    due_date: string | null;
    description: string;
    assigned_to_details: { id: number; email: string; name: string } | null;
    created_at: string;
}

const ServiceRequestsList = () => {
    const { user } = useAuth();
    
    // Data list states
    const [requests, setRequests] = useState<ServiceRequestListItem[]>([]);
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
    const [newRequest, setNewRequest] = useState({
        customer: '',
        category: 'Maintenance',
        priority: 'Medium',
        due_date: '',
        description: ''
    });

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [formErrorMsg, setFormErrorMsg] = useState<string | null>(null);
    const [formSuccessMsg, setFormSuccessMsg] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, [search, statusFilter, priorityFilter, categoryFilter, ordering, currentPage]);

    useEffect(() => {
        if (showAddModal && user && user.role !== 'Customer') {
            fetchCustomers();
        }
    }, [showAddModal, user]);

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const endpoint = `/service-requests/?search=${encodeURIComponent(search)}` +
                             `&status=${statusFilter}` +
                             `&priority=${priorityFilter}` +
                             `&category=${categoryFilter}` +
                             `&ordering=${ordering}` +
                             `&page=${currentPage}`;
            const data = await apiRequest(endpoint);
            setRequests(data.results);
            setTotalCount(data.count);
            setTotalPages(Math.ceil(data.count / 10) || 1);
        } catch (err) {
            console.error('Failed to load service requests queue:', err);
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
        setNewRequest({
            ...newRequest,
            [e.target.id]: e.target.value
        });
        if (formErrors[e.target.id]) {
            setFormErrors({ ...formErrors, [e.target.id]: '' });
        }
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!newRequest.description) errors.description = 'Request details description is required';
        
        if (user && user.role !== 'Customer') {
            if (!newRequest.customer) errors.customer = 'Associated customer contact is required';
        }

        if (newRequest.due_date) {
            const selectedDate = new Date(newRequest.due_date);
            const today = new Date();
            today.setHours(0,0,0,0);
            if (selectedDate < today) {
                errors.due_date = 'Due date cannot be scheduled in the past';
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
            const payload: Record<string, any> = {
                category: newRequest.category,
                priority: newRequest.priority,
                due_date: newRequest.due_date || null,
                description: newRequest.description
            };

            if (user && user.role !== 'Customer') {
                payload.customer = parseInt(newRequest.customer);
            } else {
                // Preload customer ID for customer role
                if (user) {
                    const custRes = await apiRequest(`/customers/?search=${encodeURIComponent(user.email)}`);
                    if (custRes.results && custRes.results.length > 0) {
                        payload.customer = custRes.results[0].id;
                    }
                }
            }

            await apiRequest('/service-requests/', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            setFormSuccessMsg('Service request logged successfully!');
            setNewRequest({
                customer: '',
                category: 'Maintenance',
                priority: 'Medium',
                due_date: '',
                description: ''
            });

            fetchRequests();

            setTimeout(() => {
                setShowAddModal(false);
                setFormSuccessMsg(null);
            }, 1500);
        } catch (err: any) {
            console.error('Failed to create service request:', err);
            setFormErrorMsg(err.data?.detail || 'An error occurred. Check inputs.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Badge Helpers
    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Completed': return 'badge-sales';
            case 'Pending': return 'badge-admin';
            case 'Scheduled': return 'badge-manager';
            case 'In Progress': return 'badge-customer';
            default: return 'badge-support'; // Cancelled
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
                    <h2 className="gradient-text">Service Requests Directory</h2>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        Requests: <strong style={{ color: 'var(--accent-secondary)' }}>{totalCount}</strong>
                    </div>
                </header>

                <div className="content-body">
                    {/* Action Filters bar */}
                    <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="🔍 Search description, client name..."
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
                                <option value="Pending">Pending</option>
                                <option value="Scheduled">Scheduled</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
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
                                <option value="Maintenance">Maintenance</option>
                                <option value="Installation">Installation</option>
                                <option value="Repair">Repair</option>
                                <option value="Consultation">Consultation</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ height: '44px' }}>
                            🛠️ New Service Request
                        </button>
                    </div>

                    {/* Table View */}
                    <div className="glass-panel" style={{ padding: '24px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                                <div className="spinner"></div>
                            </div>
                        ) : requests.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                <span style={{ fontSize: '32px' }}>🛠️</span>
                                <h4 style={{ marginTop: '12px' }}>No Service Requests Found</h4>
                                <p style={{ fontSize: '13px', marginTop: '4px' }}>Submit a new service dispatch request.</p>
                            </div>
                        ) : (
                            <>
                                <div className="table-container">
                                    <table className="crm-table">
                                        <thead>
                                            <tr>
                                                <th style={{ cursor: 'pointer' }} onClick={() => handleOrderingChange('id')}>
                                                    ID {ordering.includes('id') ? (ordering.startsWith('-') ? '▼' : '▲') : ''}
                                                </th>
                                                <th>Category</th>
                                                <th>Client Contact</th>
                                                <th>Priority</th>
                                                <th>Status</th>
                                                <th style={{ cursor: 'pointer' }} onClick={() => handleOrderingChange('due_date')}>
                                                    Due Date {ordering.includes('due_date') ? (ordering.startsWith('-') ? '▼' : '▲') : ''}
                                                </th>
                                                <th>Assigned Agent</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {requests.map((r) => (
                                                <tr key={r.id}>
                                                    <td style={{ fontWeight: 'bold', color: 'var(--accent-secondary)' }}>REQ-{1000 + r.id}</td>
                                                    <td style={{ fontWeight: 600 }}>{r.category}</td>
                                                    <td>
                                                        {r.customer_details ? (
                                                            <div>
                                                                <div>{r.customer_details.name}</div>
                                                                <small style={{ color: 'var(--text-secondary)' }}>{r.customer_details.company_name}</small>
                                                            </div>
                                                        ) : '—'}
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${getPriorityBadgeClass(r.priority)}`}>
                                                            {r.priority}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${getStatusBadgeClass(r.status)}`}>
                                                            {r.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontSize: '13px', fontWeight: 500 }}>
                                                        {r.due_date ? (
                                                            <span>📅 {new Date(r.due_date).toLocaleDateString()}</span>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-muted)' }}>Not Scheduled</span>
                                                        )}
                                                    </td>
                                                    <td style={{ fontSize: '14px' }}>
                                                        {r.assigned_to_details ? (
                                                            <span>👤 {r.assigned_to_details.name}</span>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <Link to={`/service-requests/${r.id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>
                                                            Details
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
                                        Showing Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalCount} requests)
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

            {/* Create Service Request Modal */}
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
                            <h3>Log Service Dispatch Request</h3>
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
                            {user?.role !== 'Customer' && (
                                <div className="form-group">
                                    <label className="form-label" htmlFor="customer">Customer Contact</label>
                                    <select
                                        id="customer"
                                        className="form-input"
                                        value={newRequest.customer}
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
                                    <label className="form-label" htmlFor="category">Service Category</label>
                                    <select
                                        id="category"
                                        className="form-input"
                                        value={newRequest.category}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                        style={{ appearance: 'none', background: 'var(--bg-primary)' }}
                                    >
                                        <option value="Maintenance">Maintenance</option>
                                        <option value="Installation">Installation</option>
                                        <option value="Repair">Repair</option>
                                        <option value="Consultation">Consultation</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="priority">Dispatch Priority</label>
                                    <select
                                        id="priority"
                                        className="form-input"
                                        value={newRequest.priority}
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
                                <label className="form-label" htmlFor="due_date">Scheduled Due Date</label>
                                <input
                                    type="date"
                                    id="due_date"
                                    className="form-input"
                                    value={newRequest.due_date}
                                    onChange={handleInputChange}
                                    disabled={isSubmitting}
                                />
                                {formErrors.due_date && <div className="form-error">⚠️ {formErrors.due_date}</div>}
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="description">Service Request Details</label>
                                <textarea
                                    id="description"
                                    className="form-input"
                                    placeholder="Enter dispatch notes, diagnostic needs, or consultation goals..."
                                    style={{ height: '110px', resize: 'vertical' }}
                                    value={newRequest.description}
                                    onChange={handleInputChange}
                                    disabled={isSubmitting}
                                />
                                {formErrors.description && <div className="form-error">⚠️ {formErrors.description}</div>}
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
                                    {isSubmitting ? 'Logging Dispatch...' : 'Log Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceRequestsList;
