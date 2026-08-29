import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import Sidebar from '../components/Sidebar';

interface CustomerSummary {
    id: number;
    name: string;
    company_name: string;
    email: string;
}

interface TicketDetailData {
    id: number;
    ticket_number: string;
    customer: number;
    customer_details: CustomerSummary;
    subject: string;
    description: string;
    category: string;
    priority: string;
    status: string;
    assigned_to: number | null;
    assigned_to_details: { id: number; email: string; name: string } | null;
    created_by_details: { id: number; email: string; name: string } | null;
    attachment: string | null;
    created_at: string;
    updated_at: string;
}

interface CommentItem {
    id: number;
    author_details: { id: number; email: string; name: string };
    text: string;
    is_internal: boolean;
    created_at: string;
}

interface HistoryItem {
    id: number;
    changed_by_details: { id: number; email: string; name: string } | null;
    status_from: string;
    status_to: string;
    notes: string;
    changed_at: string;
}

interface AgentListItem {
    id: number;
    email: string;
    name: string;
}

const TicketDetail = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();

    // Data states
    const [ticket, setTicket] = useState<TicketDetailData | null>(null);
    const [comments, setComments] = useState<CommentItem[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [agents, setAgents] = useState<AgentListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Comment submission state
    const [commentText, setCommentText] = useState('');
    const [isInternalComment, setIsInternalComment] = useState(false);
    const [commentError, setCommentError] = useState<string | null>(null);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);

    // Settings update state (Staff only)
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [updatingPriority, setUpdatingPriority] = useState(false);
    const [updatingAgent, setUpdatingAgent] = useState(false);

    useEffect(() => {
        if (id) {
            loadTicketAndThread();
        }
    }, [id]);

    useEffect(() => {
        if (user && user.role !== 'Customer') {
            loadAgents();
        }
    }, [user]);

    const loadTicketAndThread = async () => {
        setIsLoading(true);
        try {
            const ticketData = await apiRequest(`/tickets/${id}/`);
            setTicket(ticketData);

            const commentsData = await apiRequest(`/tickets/${id}/comments/`);
            setComments(commentsData);

            const historyData = await apiRequest(`/tickets/${id}/history/`);
            setHistory(historyData);
        } catch (err) {
            console.error('Failed to load support ticket detailed thread:', err);
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
            console.error('Failed to load agents list:', err);
        }
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCommentError(null);
        if (!commentText.trim()) return;

        setIsSubmittingComment(true);
        try {
            const payload = {
                text: commentText,
                is_internal: isInternalComment
            };

            const newComment = await apiRequest(`/tickets/${id}/comments/`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            setComments([...comments, newComment]);
            setCommentText('');
            setIsInternalComment(false);

            // Re-fetch history since a new status trigger might occur or logs added
            const historyData = await apiRequest(`/tickets/${id}/history/`);
            setHistory(historyData);
        } catch (err: any) {
            console.error('Comment posting failed:', err);
            setCommentError(err.data?.detail || 'Failed to submit comment thread post.');
        } finally {
            setIsSubmittingComment(false);
        }
    };

    // Staff modifier updates
    const handleStatusUpdate = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!ticket) return;
        const newStatus = e.target.value;
        setUpdatingStatus(true);
        try {
            const updated = await apiRequest(`/tickets/${id}/`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus })
            });
            setTicket(updated);
            
            // Reload history logs
            const historyData = await apiRequest(`/tickets/${id}/history/`);
            setHistory(historyData);
        } catch (err) {
            console.error('Status update failed:', err);
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handlePriorityUpdate = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!ticket) return;
        const newPriority = e.target.value;
        setUpdatingPriority(true);
        try {
            const updated = await apiRequest(`/tickets/${id}/`, {
                method: 'PATCH',
                body: JSON.stringify({ priority: newPriority })
            });
            setTicket(updated);
        } catch (err) {
            console.error('Priority update failed:', err);
        } finally {
            setUpdatingPriority(false);
        }
    };

    const handleAgentUpdate = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!ticket) return;
        const newAgent = e.target.value ? parseInt(e.target.value) : null;
        setUpdatingAgent(true);
        try {
            const updated = await apiRequest(`/tickets/${id}/`, {
                method: 'PATCH',
                body: JSON.stringify({ assigned_to: newAgent })
            });
            setTicket(updated);
        } catch (err) {
            console.error('Agent assignment update failed:', err);
        } finally {
            setUpdatingAgent(false);
        }
    };

    const isStaff = user && user.role !== 'Customer';

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

    if (isLoading || !ticket) {
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
                        <Link to="/tickets" className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>
                            ◀ Queue
                        </Link>
                        <h2 className="gradient-text">{ticket.ticket_number} Details</h2>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <span className={`badge ${getPriorityBadgeClass(ticket.priority)}`} style={{ padding: '6px 14px', fontSize: '13px' }}>
                            {ticket.priority} Priority
                        </span>
                        <span className={`badge ${getStatusBadgeClass(ticket.status)}`} style={{ padding: '6px 14px', fontSize: '13px' }}>
                            {ticket.status} Status
                        </span>
                    </div>
                </header>

                <div className="content-body" style={{ maxWidth: '950px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '32px', alignItems: 'start' }}>
                        
                        {/* LEFT PANEL: Ticket description & comments threads */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Core description */}
                            <div className="glass-panel" style={{ padding: '28px' }}>
                                <h3 style={{ marginBottom: '12px' }}>{ticket.subject}</h3>
                                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                                    <span>Category: <strong>{ticket.category}</strong></span>
                                    <span>·</span>
                                    <span>Opened: <strong>{new Date(ticket.created_at).toLocaleString()}</strong></span>
                                    <span>·</span>
                                    <span>By: <strong>{ticket.created_by_details ? ticket.created_by_details.name : 'System'}</strong></span>
                                </div>
                                <div style={{ fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
                                    {ticket.description}
                                </div>

                                {ticket.attachment && (
                                    <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                        <a 
                                            href={ticket.attachment} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="btn btn-secondary" 
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px' }}
                                        >
                                            📎 Download Attachment
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Comments thread list */}
                            <div className="glass-panel" style={{ padding: '28px' }}>
                                <h3 style={{ marginBottom: '20px' }}>💬 Support Thread Comments</h3>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '400px', overflowY: 'auto', paddingRight: '6px' }}>
                                    {comments.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                            No messages posted in this thread yet.
                                        </div>
                                    ) : (
                                        comments.map((c) => (
                                            <div 
                                                key={c.id} 
                                                style={{
                                                    background: c.is_internal ? 'rgba(138, 43, 226, 0.08)' : 'rgba(25,21,53,0.3)',
                                                    border: c.is_internal ? '1px solid rgba(138, 43, 226, 0.3)' : '1px solid rgba(255,255,255,0.03)',
                                                    boxShadow: c.is_internal ? '0 0 10px rgba(138, 43, 226, 0.1)' : 'none',
                                                    borderRadius: '8px',
                                                    padding: '14px 18px',
                                                    marginLeft: c.is_internal ? '24px' : '0'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                                                    <span style={{ fontWeight: 'bold', fontSize: '13px', color: c.is_internal ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                                                        👤 {c.author_details.name} {c.is_internal && <span className="badge badge-manager" style={{ fontSize: '10px', padding: '1px 6px', marginLeft: '6px' }}>🔐 Internal Staff Note</span>}
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                        {new Date(c.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                                    {c.text}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Post new comment form */}
                                <form onSubmit={handleCommentSubmit} style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
                                    {commentError && (
                                        <div className="form-error" style={{ marginBottom: '10px' }}>⚠️ {commentError}</div>
                                    )}
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="commentText">Post Response / Reply</label>
                                        <textarea
                                            id="commentText"
                                            className="form-input"
                                            placeholder="Write your response message here..."
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            style={{ height: '70px', resize: 'vertical' }}
                                            disabled={isSubmittingComment}
                                        />
                                    </div>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                        {isStaff ? (
                                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isInternalComment}
                                                    onChange={(e) => setIsInternalComment(e.target.checked)}
                                                    disabled={isSubmittingComment}
                                                />
                                                🔐 Post as Internal Note (Staff only)
                                            </label>
                                        ) : <div />}

                                        <button 
                                            type="submit" 
                                            className="btn btn-primary" 
                                            style={{ padding: '0 24px', height: '38px', fontSize: '13px' }}
                                            disabled={isSubmittingComment || !commentText.trim()}
                                        >
                                            {isSubmittingComment ? 'Posting...' : 'Send Reply'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* RIGHT PANEL: Settings & Assignment modifiers + History timeline */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Helpdesk queue settings */}
                            <div className="glass-panel" style={{ padding: '28px' }}>
                                <h3 style={{ marginBottom: '20px' }}>🎫 Ticket Operations</h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Client Contact</div>
                                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                                            {ticket.customer_details ? (
                                                <Link to={`/customers/${ticket.customer}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                                                    {ticket.customer_details.name} ({ticket.customer_details.company_name})
                                                </Link>
                                            ) : '—'}
                                        </div>
                                    </div>

                                    {isStaff ? (
                                        <>
                                            <div className="form-group">
                                                <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase' }} htmlFor="ticket-status">Ticket Status</label>
                                                <select
                                                    id="ticket-status"
                                                    className="form-input"
                                                    value={ticket.status}
                                                    onChange={handleStatusUpdate}
                                                    disabled={updatingStatus}
                                                    style={{ appearance: 'none', background: 'var(--bg-primary)', height: '36px', padding: '0 12px' }}
                                                >
                                                    <option value="Open">Open</option>
                                                    <option value="In Progress">In Progress</option>
                                                    <option value="Resolved">Resolved</option>
                                                    <option value="Closed">Closed</option>
                                                </select>
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase' }} htmlFor="ticket-priority">Priority</label>
                                                <select
                                                    id="ticket-priority"
                                                    className="form-input"
                                                    value={ticket.priority}
                                                    onChange={handlePriorityUpdate}
                                                    disabled={updatingPriority}
                                                    style={{ appearance: 'none', background: 'var(--bg-primary)', height: '36px', padding: '0 12px' }}
                                                >
                                                    <option value="Low">Low</option>
                                                    <option value="Medium">Medium</option>
                                                    <option value="High">High</option>
                                                    <option value="Urgent">Urgent</option>
                                                </select>
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase' }} htmlFor="ticket-assigned">Assigned Support Agent</label>
                                                <select
                                                    id="ticket-assigned"
                                                    className="form-input"
                                                    value={ticket.assigned_to ? ticket.assigned_to.toString() : ''}
                                                    onChange={handleAgentUpdate}
                                                    disabled={updatingAgent || !(user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'Support Agent')}
                                                    style={{ appearance: 'none', background: 'var(--bg-primary)', height: '36px', padding: '0 12px' }}
                                                >
                                                    <option value="">Unassigned</option>
                                                    {agents.map((ag) => (
                                                        <option key={ag.id} value={ag.id}>{ag.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Assigned Agent</div>
                                                <div style={{ fontSize: '14px', fontWeight: 600 }}>
                                                    {ticket.assigned_to_details ? ticket.assigned_to_details.name : 'Unassigned'}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Status transitions logs history timeline */}
                            <div className="glass-panel" style={{ padding: '28px' }}>
                                <h3 style={{ marginBottom: '16px' }}>📅 Status History Timeline</h3>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: '16px' }}>
                                    {history.length === 0 ? (
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            No status adjustments tracked yet.
                                        </div>
                                    ) : (
                                        history.map((h) => (
                                            <div key={h.id} style={{ position: 'relative', fontSize: '12.5px' }}>
                                                {/* timeline dot indicator */}
                                                <span style={{
                                                    position: 'absolute',
                                                    left: '-21px',
                                                    top: '4px',
                                                    width: '9px',
                                                    height: '9px',
                                                    borderRadius: '50%',
                                                    background: 'var(--accent-secondary)'
                                                }}></span>
                                                
                                                <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                                    {h.status_from} ➔ {h.status_to}
                                                </div>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '11.5px', marginTop: '2px' }}>
                                                    {h.notes}
                                                </div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                    By {h.changed_by_details ? h.changed_by_details.name : 'System'} · {new Date(h.changed_at).toLocaleString()}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
};

export default TicketDetail;
