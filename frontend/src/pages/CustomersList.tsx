import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import Sidebar from '../components/Sidebar';

interface CustomerListItem {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    company_name: string;
    company_website: string;
    status: string;
    assigned_to_details: { id: number; email: string; name: string } | null;
    created_at: string;
}

interface AgentListItem {
    id: number;
    email: string;
    name: string;
    role: string;
}

const CustomersList = () => {
    const { user } = useAuth();
    
    // List & Query States
    const [customers, setCustomers] = useState<CustomerListItem[]>([]);
    const [agents, setAgents] = useState<AgentListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [assignedFilter, setAssignedFilter] = useState('');
    const [ordering, setOrdering] = useState('-created_at');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
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
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load directory
    useEffect(() => {
        fetchCustomers();
    }, [search, statusFilter, assignedFilter, ordering, currentPage]);

    // Load agents for assignment dropdowns (restricted to Admin/Manager)
    useEffect(() => {
        if (user && (user.role === 'Admin' || user.role === 'Manager')) {
            fetchAgents();
        }
    }, [user]);

    const fetchCustomers = async () => {
        setIsLoading(true);
        try {
            const endpoint = `/customers/?search=${encodeURIComponent(search)}` +
                             `&status=${statusFilter}` +
                             `&assigned_to=${assignedFilter}` +
                             `&ordering=${ordering}` +
                             `&page=${currentPage}`;
            
            const data = await apiRequest(endpoint);
            setCustomers(data.results);
            setTotalCount(data.count);
            setTotalPages(Math.ceil(data.count / 10) || 1);
        } catch (err) {
            console.error('Failed to fetch customers:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAgents = async () => {
        try {
            const data = await apiRequest('/users/');
            // Filter list to show only Admin, Manager, Support Agent, Sales Agent (staff)
            const staffList = data.filter((u: any) => u.role !== 'Customer');
            setAgents(staffList);
        } catch (err) {
            console.error('Failed to load agents list (likely unauthorized):', err);
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setCurrentPage(1); // Reset page to 1
    };

    const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setStatusFilter(e.target.value);
        setCurrentPage(1);
    };

    const handleAssignedFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setAssignedFilter(e.target.value);
        setCurrentPage(1);
    };

    const handleOrderingChange = (column: string) => {
        // Toggle ascending/descending
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
        setNewCustomer({
            ...newCustomer,
            [e.target.id]: e.target.value
        });
        if (formErrors[e.target.id]) {
            setFormErrors({ ...formErrors, [e.target.id]: '' });
        }
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!newCustomer.first_name) errors.first_name = 'First name is required';
        if (!newCustomer.last_name) errors.last_name = 'Last name is required';
        
        if (!newCustomer.email) {
            errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(newCustomer.email)) {
            errors.email = 'Please enter a valid email address';
        }

        if (newCustomer.phone) {
            const digits = newCustomer.phone.replace(/[^0-9]/g, '');
            if (digits.length < 7) {
                errors.phone = 'Please enter a valid phone number (min 7 digits)';
            }
        }

        if (newCustomer.company_website) {
            if (!/^https?:\/\/\S+\.\S+/.test(newCustomer.company_website)) {
                errors.company_website = 'Please enter a valid website URL (must start with http:// or https://)';
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
            // DRF PK related field needs an integer or empty string mapping to null
            const payload = {
                ...newCustomer,
                assigned_to: newCustomer.assigned_to ? parseInt(newCustomer.assigned_to) : null
            };

            await apiRequest('/customers/', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            setFormSuccessMsg('Customer created successfully!');
            setNewCustomer({
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
            
            // Refresh directory list
            fetchCustomers();
            
            setTimeout(() => {
                setShowAddModal(false);
                setFormSuccessMsg(null);
            }, 1500);
        } catch (err: any) {
            console.error('Failed to create customer:', err);
            const detail = err.data?.detail || err.data?.email?.[0] || err.data?.company_website?.[0] || 'An error occurred. Check inputs.';
            setFormErrorMsg(detail);
        } finally {
            setIsSubmitting(false);
        }
    };

    // UI status badge helper
    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Active': return 'badge-sales';
            case 'Lead': return 'badge-support';
            case 'Inactive': return 'badge-manager';
            default: return 'badge-admin'; // Churned
        }
    };

    const isSupportAgent = user?.role === 'Support Agent';

    return (
        <div className="layout-container">
            <Sidebar />

            <main className="main-content">
                <header className="header">
                    <h2 className="gradient-text">Customer Directory</h2>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        Total Contacts: <strong style={{ color: 'var(--accent-secondary)' }}>{totalCount}</strong>
                    </div>
                </header>

                <div className="content-body">
                    {/* Action Bar (Search, Filters, Create Button) */}
                    <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="🔍 Search name, email, company..."
                                    value={search}
                                    onChange={handleSearchChange}
                                    style={{ paddingLeft: '40px' }}
                                />
                            </div>
                            
                            <select
                                className="form-input"
                                style={{ width: '140px', appearance: 'none', background: 'var(--bg-primary)' }}
                                value={statusFilter}
                                onChange={handleStatusFilterChange}
                            >
                                <option value="">All Statuses</option>
                                <option value="Lead">Lead</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Churned">Churned</option>
                            </select>

                            {(user?.role === 'Admin' || user?.role === 'Manager') && (
                                <select
                                    className="form-input"
                                    style={{ width: '180px', appearance: 'none', background: 'var(--bg-primary)' }}
                                    value={assignedFilter}
                                    onChange={handleAssignedFilterChange}
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
                                ➕ Register Customer
                            </button>
                        )}
                    </div>

                    {/* Table View */}
                    <div className="glass-panel" style={{ padding: '24px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                                <div className="spinner"></div>
                            </div>
                        ) : customers.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                <span style={{ fontSize: '32px' }}>📭</span>
                                <h4 style={{ marginTop: '12px' }}>No Customers Found</h4>
                                <p style={{ fontSize: '13px', marginTop: '4px' }}>Try adjusting your search criteria or register a new customer profile.</p>
                            </div>
                        ) : (
                            <>
                                <div className="table-container">
                                    <table className="crm-table">
                                        <thead>
                                            <tr>
                                                <th style={{ cursor: 'pointer' }} onClick={() => handleOrderingChange('last_name')}>
                                                    Customer Name {ordering.includes('last_name') ? (ordering.startsWith('-') ? '▼' : '▲') : ''}
                                                </th>
                                                <th>Email Address</th>
                                                <th>Phone</th>
                                                <th style={{ cursor: 'pointer' }} onClick={() => handleOrderingChange('company_name')}>
                                                    Company {ordering.includes('company_name') ? (ordering.startsWith('-') ? '▼' : '▲') : ''}
                                                </th>
                                                <th>Customer Status</th>
                                                <th>Assigned Manager / Agent</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {customers.map((c) => (
                                                <tr key={c.id}>
                                                    <td style={{ fontWeight: 600 }}>
                                                        <Link to={`/customers/${c.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                                                            {c.first_name} {c.last_name}
                                                        </Link>
                                                    </td>
                                                    <td>{c.email}</td>
                                                    <td>{c.phone || '—'}</td>
                                                    <td>
                                                        {c.company_website ? (
                                                            <a href={c.company_website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-secondary)', textDecoration: 'none' }}>
                                                                {c.company_name}
                                                            </a>
                                                        ) : (
                                                            c.company_name || '—'
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${getStatusBadgeClass(c.status)}`}>
                                                            {c.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontSize: '14px' }}>
                                                        {c.assigned_to_details ? (
                                                            <span>👤 {c.assigned_to_details.name}</span>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <Link to={`/customers/${c.id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>
                                                            Manage
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
                                        Showing Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalCount} contacts)
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

            {/* Add Customer Modal */}
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
                            <h3>Register Customer Profile</h3>
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
                                        placeholder="Thomas"
                                        value={newCustomer.first_name}
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
                                        placeholder="Anderson"
                                        value={newCustomer.last_name}
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
                                        placeholder="neo@example.com"
                                        value={newCustomer.email}
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
                                        placeholder="+1 555-0101"
                                        value={newCustomer.phone}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
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
                                        placeholder="Metacortex"
                                        value={newCustomer.company_name}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="company_website">Company Website</label>
                                    <input
                                        type="url"
                                        id="company_website"
                                        className="form-input"
                                        placeholder="https://www.metacortex.com"
                                        value={newCustomer.company_website}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
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
                                        value={newCustomer.status}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
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
                                        value={newCustomer.assigned_to}
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
                                <label className="form-label" htmlFor="address">Billing Address</label>
                                <textarea
                                    id="address"
                                    className="form-input"
                                    placeholder="Office address details..."
                                    style={{ height: '70px', resize: 'vertical' }}
                                    value={newCustomer.address}
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
                                    {isSubmitting ? 'Registering...' : 'Register Contact'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomersList;
