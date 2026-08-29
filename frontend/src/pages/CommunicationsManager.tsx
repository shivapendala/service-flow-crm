import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import Sidebar from '../components/Sidebar';

interface CustomerMinimal {
    id: number;
    name: string;
    company_name: string;
}

interface LeadMinimal {
    id: number;
    name: string;
    company_name: string;
}

interface DealMinimal {
    id: number;
    title: string;
    deal_value: string;
}

interface TicketMinimal {
    id: number;
    ticket_number: string;
    subject: string;
}

interface CommunicationLogItem {
    id: number;
    contact_type: string;
    subject: string;
    content: string;
    interaction_date: string;
    logged_by_details: { id: number; email: string; name: string } | null;
    customer_details: CustomerMinimal | null;
    lead_details: LeadMinimal | null;
    deal_details: DealMinimal | null;
    ticket_details: TicketMinimal | null;
    created_at: string;
}

interface AgentListItem {
    id: number;
    email: string;
    name: string;
}

const CommunicationsManager = () => {
    const { user } = useAuth();

    // Data lists
    const [logs, setLogs] = useState<CommunicationLogItem[]>([]);
    const [agents, setAgents] = useState<AgentListItem[]>([]);
    
    // Modal dependencies lists
    const [customers, setCustomers] = useState<CustomerMinimal[]>([]);
    const [leads, setLeads] = useState<LeadMinimal[]>([]);
    const [deals, setDeals] = useState<DealMinimal[]>([]);
    const [tickets, setTickets] = useState<TicketMinimal[]>([]);

    const [isLoading, setIsLoading] = useState(true);

    // Search and Filters
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [agentFilter, setAgentFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Modal States
    const [showAddModal, setShowAddModal] = useState(false);
    const [newLog, setNewLog] = useState({
        contact_type: 'Call',
        subject: '',
        content: '',
        interaction_date: '',
        customer: '',
        lead: '',
        deal: '',
        ticket: ''
    });

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [formErrorMsg, setFormErrorMsg] = useState<string | null>(null);
    const [formSuccessMsg, setFormSuccessMsg] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadLogs();
    }, [search, typeFilter, agentFilter, currentPage]);

    useEffect(() => {
        if (showAddModal) {
            loadModalDependencies();
            loadAgents();
        }
    }, [showAddModal]);

    const loadLogs = async () => {
        setIsLoading(true);
        try {
            const endpoint = `/communications/?search=${encodeURIComponent(search)}` +
                             `&contact_type=${typeFilter}` +
                             `&logged_by=${agentFilter}` +
                             `&page=${currentPage}`;
            const data = await apiRequest(endpoint);
            setLogs(data.results);
            setTotalCount(data.count);
            setTotalPages(Math.ceil(data.count / 10) || 1);
        } catch (err) {
            console.error('Failed to load communication logs:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadAgents = async () => {
        try {
            const data = await apiRequest('/users/');
            const staffList = data.filter((u: any) => u.role !== 'Customer').map((u: any) => ({
                id: u.id,
                email: u.email,
                name: `${u.first_name} ${u.last_name}`
            }));
            setAgents(staffList);
        } catch (err) {
            console.error('Failed to load agents:', err);
        }
    };

    const loadModalDependencies = async () => {
        try {
            // Load Customers
            const custRes = await apiRequest('/customers/?page_size=100');
            setCustomers(custRes.results.map((c: any) => ({
                id: c.id,
                name: `${c.first_name} ${c.last_name}`,
                company_name: c.company_name
            })));

            // Load Leads
            const leadsRes = await apiRequest('/leads/?page_size=100');
            setLeads(leadsRes.results.map((l: any) => ({
                id: l.id,
                name: `${l.first_name} ${l.last_name}`,
                company_name: l.company_name
            })));

            // Load Deals
            const dealsRes = await apiRequest('/deals/');
            setDeals(dealsRes.map((d: any) => ({
                id: d.id,
                title: d.title,
                deal_value: d.deal_value
            })));

            // Load Tickets
            const ticketsRes = await apiRequest('/tickets/?page_size=100');
            setTickets(ticketsRes.results.map((t: any) => ({
                id: t.id,
                ticket_number: t.ticket_number,
                subject: t.subject
            })));
        } catch (err) {
            console.error('Failed to load dependency dropdowns:', err);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setNewLog({
            ...newLog,
            [e.target.id]: e.target.value
        });
        if (formErrors[e.target.id]) {
            setFormErrors({ ...formErrors, [e.target.id]: '' });
        }
    };

    const handleDeleteLog = async (logId: number) => {
        if (!window.confirm("Permanently delete this communication history log?")) return;
        try {
            await apiRequest(`/communications/${logId}/`, { method: 'DELETE' });
            loadLogs();
        } catch (err) {
            console.error('Deletion failed:', err);
        }
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!newLog.subject) errors.subject = 'Subject heading is required';
        if (!newLog.content) errors.content = 'Interaction description notes are required';
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormErrorMsg(null);
        setFormSuccessMsg(null);

        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            // Set interaction date to now if left empty
            const dateVal = newLog.interaction_date ? new Date(newLog.interaction_date).toISOString() : new Date().toISOString();
            
            const payload = {
                contact_type: newLog.contact_type,
                subject: newLog.subject,
                content: newLog.content,
                interaction_date: dateVal,
                customer: newLog.customer ? parseInt(newLog.customer) : null,
                lead: newLog.lead ? parseInt(newLog.lead) : null,
                deal: newLog.deal ? parseInt(newLog.deal) : null,
                ticket: newLog.ticket ? parseInt(newLog.ticket) : null
            };

            await apiRequest('/communications/', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            setFormSuccessMsg('Communication logged successfully!');
            setNewLog({
                contact_type: 'Call',
                subject: '',
                content: '',
                interaction_date: '',
                customer: '',
                lead: '',
                deal: '',
                ticket: ''
            });

            setCurrentPage(1);
            loadLogs();

            setTimeout(() => {
                setShowAddModal(false);
                setFormSuccessMsg(null);
            }, 1500);
        } catch (err: any) {
            console.error('Failed to log communication:', err);
            setFormErrorMsg(err.data?.detail || 'An error occurred. Check inputs.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // Styling Indicators Helpers
    const getContactTypeIcon = (type: string) => {
        switch (type) {
            case 'Call': return '📞';
            case 'Email': return '✉️';
            case 'Meeting': return '🤝';
            case 'Message': return '💬';
            case 'Note': return '📝';
            default: return '📅'; // Follow-up
        }
    };

    const getContactTypeBadgeClass = (type: string) => {
        switch (type) {
            case 'Call': return 'badge-manager';
            case 'Email': return 'badge-customer';
            case 'Meeting': return 'badge-sales';
            case 'Message': return 'badge-support';
            default: return 'badge-admin'; // Note / Follow-up
        }
    };

    return (
        <div className="layout-container">
            <Sidebar />

            <main className="main-content">
                <header className="header">
                    <h2 className="gradient-text">Customer Communication History</h2>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        Logs: <strong style={{ color: 'var(--accent-secondary)' }}>{totalCount}</strong>
                    </div>
                </header>

                <div className="content-body" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', maxWidth: '900px' }}>
                    {/* Filters bar */}
                    <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="🔍 Search subject, content..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                                style={{ maxWidth: '280px' }}
                            />

                            <select
                                className="form-input"
                                style={{ width: '140px', appearance: 'none', background: 'var(--bg-primary)' }}
                                value={typeFilter}
                                onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                            >
                                <option value="">All Contact Types</option>
                                <option value="Call">Call</option>
                                <option value="Email">Email</option>
                                <option value="Meeting">Meeting</option>
                                <option value="Message">Message</option>
                                <option value="Note">Note</option>
                                <option value="Follow-up">Follow-up</option>
                            </select>

                            <select
                                className="form-input"
                                style={{ width: '160px', appearance: 'none', background: 'var(--bg-primary)' }}
                                value={agentFilter}
                                onChange={(e) => { setAgentFilter(e.target.value); setCurrentPage(1); }}
                            >
                                <option value="">All Logged Agents</option>
                                {agents.map((ag) => (
                                    <option key={ag.id} value={ag.id}>{ag.name}</option>
                                ))}
                            </select>
                        </div>

                        <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ height: '40px', padding: '0 20px', fontSize: '13px' }}>
                            ✍️ Log Interaction
                        </button>
                    </div>

                    {/* Timeline Feed */}
                    <div className="glass-panel" style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                                <div className="spinner"></div>
                            </div>
                        ) : logs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                <span style={{ fontSize: '32px' }}>✍️</span>
                                <h4 style={{ marginTop: '12px' }}>No Communication Records Logged</h4>
                                <p style={{ fontSize: '13px', marginTop: '4px' }}>Log phone calls, emails, and notes to compile history.</p>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', borderLeft: '2px solid rgba(255,255,255,0.06)', paddingLeft: '24px', marginLeft: '12px' }}>
                                    {logs.map((log) => (
                                        <div 
                                            key={log.id} 
                                            style={{ 
                                                position: 'relative',
                                                background: 'rgba(25,21,53,0.3)',
                                                border: '1px solid rgba(255,255,255,0.03)',
                                                borderRadius: '12px',
                                                padding: '20px 24px'
                                            }}
                                        >
                                            {/* Left icon timeline indicator */}
                                            <span style={{
                                                position: 'absolute',
                                                left: '-40px',
                                                top: '18px',
                                                width: '30px',
                                                height: '30px',
                                                borderRadius: '50%',
                                                background: 'var(--bg-secondary)',
                                                border: '2px solid var(--accent-secondary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '14px',
                                                boxShadow: '0 0 10px rgba(138,43,226,0.3)'
                                            }}>
                                                {getContactTypeIcon(log.contact_type)}
                                            </span>

                                            {/* Header */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
                                                <div>
                                                    <span className={`badge ${getContactTypeBadgeClass(log.contact_type)}`} style={{ marginRight: '8px', fontSize: '11px' }}>
                                                        {log.contact_type}
                                                    </span>
                                                    <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{log.subject}</strong>
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                    📅 {new Date(log.interaction_date).toLocaleString()}
                                                </div>
                                            </div>

                                            {/* Content details */}
                                            <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '14px' }}>
                                                {log.content}
                                            </div>

                                            {/* Footer metadata & entity badges */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '12px' }}>
                                                    {log.customer_details && <span className="badge badge-manager">👤 Customer: {log.customer_details.name}</span>}
                                                    {log.lead_details && <span className="badge badge-support">🎯 Lead: {log.lead_details.name}</span>}
                                                    {log.deal_details && <span className="badge badge-sales">💼 Deal: {log.deal_details.title}</span>}
                                                    {log.ticket_details && <span className="badge badge-admin">🎫 Ticket: {log.ticket_details.ticket_number}</span>}
                                                    {!log.customer_details && !log.lead_details && !log.deal_details && !log.ticket_details && <span style={{ color: 'var(--text-muted)' }}>General log note</span>}
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                                        Logged by: <strong>{log.logged_by_details ? log.logged_by_details.name : 'System'}</strong>
                                                    </span>
                                                    {user?.role === 'Admin' && (
                                                        <button 
                                                            onClick={() => handleDeleteLog(log.id)}
                                                            style={{ background: 'none', border: 'none', color: 'var(--role-admin)', cursor: 'pointer', fontSize: '13px' }}
                                                        >
                                                            ✕ Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', flexWrap: 'wrap', gap: '12px' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        Showing Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalCount} logs)
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

            {/* Log Interaction Modal */}
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
                            <h3>Log Client Interaction</h3>
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
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="contact_type">Contact Type</label>
                                    <select
                                        id="contact_type"
                                        className="form-input"
                                        value={newLog.contact_type}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                        style={{ appearance: 'none', background: 'var(--bg-primary)' }}
                                    >
                                        <option value="Call">Call</option>
                                        <option value="Email">Email</option>
                                        <option value="Meeting">Meeting</option>
                                        <option value="Message">Message</option>
                                        <option value="Note">Note</option>
                                        <option value="Follow-up">Follow-up</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="interaction_date">Interaction Date / Time</label>
                                    <input
                                        type="datetime-local"
                                        id="interaction_date"
                                        className="form-input"
                                        value={newLog.interaction_date}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="subject">Subject</label>
                                <input
                                    type="text"
                                    id="subject"
                                    className="form-input"
                                    placeholder="e.g. Call regarding scan errors..."
                                    value={newLog.subject}
                                    onChange={handleInputChange}
                                    disabled={isSubmitting}
                                />
                                {formErrors.subject && <div className="form-error">⚠️ {formErrors.subject}</div>}
                            </div>

                            <h4 style={{ margin: '14px 0 8px', color: 'var(--accent-secondary)', fontSize: '13px' }}>Optional Associated Records</h4>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '11px' }} htmlFor="customer">Customer Link</label>
                                    <select
                                        id="customer"
                                        className="form-input"
                                        value={newLog.customer}
                                        onChange={handleInputChange}
                                        style={{ appearance: 'none', background: 'var(--bg-primary)' }}
                                    >
                                        <option value="">None</option>
                                        {customers.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '11px' }} htmlFor="lead">Lead Link</label>
                                    <select
                                        id="lead"
                                        className="form-input"
                                        value={newLog.lead}
                                        onChange={handleInputChange}
                                        style={{ appearance: 'none', background: 'var(--bg-primary)' }}
                                    >
                                        <option value="">None</option>
                                        {leads.map((l) => (
                                            <option key={l.id} value={l.id}>{l.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '11px' }} htmlFor="deal">Deal Link</label>
                                    <select
                                        id="deal"
                                        className="form-input"
                                        value={newLog.deal}
                                        onChange={handleInputChange}
                                        style={{ appearance: 'none', background: 'var(--bg-primary)' }}
                                    >
                                        <option value="">None</option>
                                        {deals.map((d) => (
                                            <option key={d.id} value={d.id}>{d.title}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '11px' }} htmlFor="ticket">Ticket Link</label>
                                    <select
                                        id="ticket"
                                        className="form-input"
                                        value={newLog.ticket}
                                        onChange={handleInputChange}
                                        style={{ appearance: 'none', background: 'var(--bg-primary)' }}
                                    >
                                        <option value="">None</option>
                                        {tickets.map((t) => (
                                            <option key={t.id} value={t.id}>{t.ticket_number}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="content">Interaction Description Notes</label>
                                <textarea
                                    id="content"
                                    className="form-input"
                                    placeholder="Provide detailed description of what was discussed, outcomes, or internal notes..."
                                    style={{ height: '110px', resize: 'vertical' }}
                                    value={newLog.content}
                                    onChange={handleInputChange}
                                    disabled={isSubmitting}
                                />
                                {formErrors.content && <div className="form-error">⚠️ {formErrors.content}</div>}
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
                                    {isSubmitting ? 'Logging...' : 'Log Record'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommunicationsManager;
