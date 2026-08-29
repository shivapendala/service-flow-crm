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

interface ServiceRequestDetailData {
    id: number;
    customer: number;
    customer_details: CustomerSummary;
    category: string;
    priority: string;
    status: string;
    due_date: string | null;
    description: string;
    resolution_details: string;
    assigned_to: number | null;
    assigned_to_details: { id: number; email: string; name: string } | null;
    created_by_details: { id: number; email: string; name: string } | null;
    created_at: string;
    updated_at: string;
}

interface CommentItem {
    id: number;
    author_details: { id: number; email: string; name: string };
    text: string;
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

const ServiceRequestDetail = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();

    // Data states
    const [request, setRequest] = useState<ServiceRequestDetailData | null>(null);
    const [comments, setComments] = useState<CommentItem[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [agents, setAgents] = useState<AgentListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Comment State
    const [commentText, setCommentText] = useState('');
    const [commentError, setCommentError] = useState<string | null>(null);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);

    // Resolution Details Edit State
    const [resolutionText, setResolutionText] = useState('');
    const [savingResolution, setSavingResolution] = useState(false);
    const [resSuccessMsg, setResSuccessMsg] = useState(false);

    // Staff modifiers
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [updatingPriority, setUpdatingPriority] = useState(false);
    const [updatingAgent, setUpdatingAgent] = useState(false);
    const [updatingDueDate, setUpdatingDueDate] = useState(false);

    useEffect(() => {
        if (id) {
            loadRequestAndThread();
        }
    }, [id]);

    useEffect(() => {
        if (user && user.role !== 'Customer') {
            loadAgents();
        }
    }, [user]);

    const loadRequestAndThread = async () => {
        setIsLoading(true);
        try {
            const reqData = await apiRequest(`/service-requests/${id}/`);
            setRequest(reqData);
            setResolutionText(reqData.resolution_details || '');

            const commentsData = await apiRequest(`/service-requests/${id}/comments/`);
            setComments(commentsData);

            const historyData = await apiRequest(`/service-requests/${id}/history/`);
            setHistory(historyData);
        } catch (err) {
            console.error('Failed to load service request detail:', err);
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
            const newComment = await apiRequest(`/service-requests/${id}/comments/`, {
                method: 'POST',
                body: JSON.stringify({ text: commentText })
            });

            setComments([...comments, newComment]);
            setCommentText('');
        } catch (err: any) {
            console.error('Failed to post comment:', err);
            setCommentError(err.data?.detail || 'Failed to submit comment thread post.');
        } finally {
            setIsSubmittingComment(false);
        }
    };

    // Staff Updates
    const handleStatusUpdate = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!request) return;
        const newStatus = e.target.value;
        setUpdatingStatus(true);
        try {
            const updated = await apiRequest(`/service-requests/${id}/`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus })
            });
            setRequest(updated);

            // Reload history
            const historyData = await apiRequest(`/service-requests/${id}/history/`);
            setHistory(historyData);
        } catch (err) {
            console.error('Failed to update status:', err);
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handlePriorityUpdate = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!request) return;
        const newPriority = e.target.value;
        setUpdatingPriority(true);
        try {
            const updated = await apiRequest(`/service-requests/${id}/`, {
                method: 'PATCH',
                body: JSON.stringify({ priority: newPriority })
            });
            setRequest(updated);
        } catch (err) {
            console.error('Failed to update priority:', err);
        } finally {
            setUpdatingPriority(false);
        }
    };

    const handleAgentUpdate = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!request) return;
        const newAgent = e.target.value ? parseInt(e.target.value) : null;
        setUpdatingAgent(true);
        try {
            const updated = await apiRequest(`/service-requests/${id}/`, {
                method: 'PATCH',
                body: JSON.stringify({ assigned_to: newAgent })
            });
            setRequest(updated);
        } catch (err) {
            console.error('Failed to update agent assignment:', err);
        } finally {
            setUpdatingAgent(false);
        }
    };

    const handleDueDateUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!request) return;
        const newDate = e.target.value || null;
        setUpdatingDueDate(true);
        try {
            const updated = await apiRequest(`/service-requests/${id}/`, {
                method: 'PATCH',
                body: JSON.stringify({ due_date: newDate })
            });
            setRequest(updated);
        } catch (err) {
            console.error('Failed to update due date:', err);
        } finally {
            setUpdatingDueDate(false);
        }
    };

    const handleSaveResolution = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingResolution(true);
        setResSuccessMsg(false);
        try {
            const updated = await apiRequest(`/service-requests/${id}/`, {
                method: 'PATCH',
                body: JSON.stringify({ resolution_details: resolutionText })
            });
            setRequest(updated);
            setResSuccessMsg(true);
            
            // Reload history
            const historyData = await apiRequest(`/service-requests/${id}/history/`);
            setHistory(historyData);

            setTimeout(() => setResSuccessMsg(false), 2000);
        } catch (err) {
            console.error('Failed to save resolution details:', err);
        } finally {
            setSavingResolution(false);
        }
    };

    const handleCancelRequest = async () => {
        if (!window.confirm("Are you sure you want to cancel this service request?")) return;
        try {
            const updated = await apiRequest(`/service-requests/${id}/`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'Cancelled' })
            });
            setRequest(updated);

            const historyData = await apiRequest(`/service-requests/${id}/history/`);
            setHistory(historyData);
        } catch (err) {
            console.error('Failed to cancel request:', err);
        }
    };

    const isStaff = user && user.role !== 'Customer';

    // Badge Styles
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

    if (isLoading || !request) {
        return (
            <div className="layout-container">
                <Sidebar />
                <main className="main-content" style={{ justifyContent: 'center', alignItems: 'center' }}>
                    <div className="spinner"></div>
                </main>
            </div>
        );
    }

    const showResolutionWarning = isStaff && 
        (request.status === 'Completed' || request.status === 'Cancelled') && 
        !request.resolution_details;

    return (
        <div className="layout-container">
            <Sidebar />

            <main className="main-content">
                <header className="header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <Link to="/service-requests" className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>
                            ◀ Directory
                        </Link>
                        <h2 className="gradient-text">REQ-{1000 + request.id} Thread</h2>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <span className={`badge ${getPriorityBadgeClass(request.priority)}`} style={{ padding: '6px 14px', fontSize: '13px' }}>
                            {request.priority} Priority
                        </span>
                        <span className={`badge ${getStatusBadgeClass(request.status)}`} style={{ padding: '6px 14px', fontSize: '13px' }}>
                            {request.status} Status
                        </span>
                    </div>
                </header>

                <div className="content-body" style={{ maxWidth: '950px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '32px', alignItems: 'start' }}>
                        
                        {/* LEFT PANEL: Core details & comment feeds */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            
                            {/* Warning notification */}
                            {showResolutionWarning && (
                                <div className="badge badge-admin" style={{ padding: '14px', borderRadius: '8px', display: 'block', textAlign: 'center', fontSize: '13px', borderLeft: '4px solid var(--role-admin)', fontWeight: 'bold' }}>
                                    ⚠️ Diagnostic Resolution Details are required for completed or cancelled service requests.
                                </div>
                            )}

                            {/* Core description details */}
                            <div className="glass-panel" style={{ padding: '28px' }}>
                                <h3 style={{ marginBottom: '12px' }}>{request.category} Dispatch Details</h3>
                                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                                    <span>Opened: <strong>{new Date(request.created_at).toLocaleString()}</strong></span>
                                    <span>·</span>
                                    <span>By: <strong>{request.created_by_details ? request.created_by_details.name : 'System'}</strong></span>
                                </div>
                                <div style={{ fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
                                    {request.description}
                                </div>
                            </div>

                            {/* Resolution Details Card */}
                            {isStaff ? (
                                <div className="glass-panel" style={{ padding: '28px' }}>
                                    <h3 style={{ marginBottom: '16px' }}>🛠️ Resolution details</h3>
                                    
                                    <form onSubmit={handleSaveResolution}>
                                        <div className="form-group">
                                            <textarea
                                                className="form-input"
                                                placeholder="Provide resolution logs, diagnostic outcomes, or reasons for dispatch cancellation..."
                                                style={{ height: '90px', resize: 'vertical' }}
                                                value={resolutionText}
                                                onChange={(e) => setResolutionText(e.target.value)}
                                                disabled={savingResolution}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                                                {resSuccessMsg ? '✅ Resolution details saved!' : ''}
                                            </span>
                                            <button 
                                                type="submit" 
                                                className="btn btn-primary"
                                                style={{ padding: '0 24px', height: '36px', fontSize: '13px' }}
                                                disabled={savingResolution || !resolutionText.trim()}
                                            >
                                                {savingResolution ? 'Saving...' : 'Save Resolution'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            ) : request.resolution_details && (
                                <div className="glass-panel" style={{ padding: '28px', borderLeft: '4px solid var(--role-sales)' }}>
                                    <h3 style={{ marginBottom: '12px', color: 'var(--role-sales)' }}>✅ Dispatch Resolution</h3>
                                    <div style={{ fontSize: '14px', lineHeight: 1.5, background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                                        {request.resolution_details}
                                    </div>
                                </div>
                            )}

                            {/* Comments thread list */}
                            <div className="glass-panel" style={{ padding: '28px' }}>
                                <h3 style={{ marginBottom: '20px' }}>💬 Support Comments Thread</h3>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '350px', overflowY: 'auto', paddingRight: '6px' }}>
                                    {comments.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                            No messages posted in this thread yet.
                                        </div>
                                    ) : (
                                        comments.map((c) => (
                                            <div 
                                                key={c.id} 
                                                style={{
                                                    background: 'rgba(25,21,53,0.3)',
                                                    border: '1px solid rgba(255,255,255,0.03)',
                                                    borderRadius: '8px',
                                                    padding: '14px 18px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                                                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>
                                                        👤 {c.author_details.name}
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

                                {/* Comment Form */}
                                <form onSubmit={handleCommentSubmit} style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
                                    {commentError && (
                                        <div className="form-error" style={{ marginBottom: '10px' }}>⚠️ {commentError}</div>
                                    )}
                                    <div className="form-group" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Write comments or updates on the dispatch..."
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            disabled={isSubmittingComment}
                                            style={{ height: '40px' }}
                                        />
                                        <button 
                                            type="submit" 
                                            className="btn btn-primary" 
                                            style={{ padding: '0 20px', height: '40px', fontSize: '13px' }}
                                            disabled={isSubmittingComment || !commentText.trim()}
                                        >
                                            {isSubmittingComment ? 'Sending...' : 'Send'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* RIGHT PANEL: Settings & Assignment modifiers + History timeline */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Settings Operations */}
                            <div className="glass-panel" style={{ padding: '28px' }}>
                                <h3 style={{ marginBottom: '20px' }}>🛠️ Request Operations</h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Client Contact</div>
                                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                                            {request.customer_details ? (
                                                <Link to={`/customers/${request.customer}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                                                    {request.customer_details.name} ({request.customer_details.company_name})
                                                </Link>
                                            ) : '—'}
                                        </div>
                                    </div>

                                    {isStaff ? (
                                        <>
                                            <div className="form-group">
                                                <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase' }} htmlFor="req-status">Request Status</label>
                                                <select
                                                    id="req-status"
                                                    className="form-input"
                                                    value={request.status}
                                                    onChange={handleStatusUpdate}
                                                    disabled={updatingStatus}
                                                    style={{ appearance: 'none', background: 'var(--bg-primary)', height: '36px', padding: '0 12px' }}
                                                >
                                                    <option value="Pending">Pending</option>
                                                    <option value="Scheduled">Scheduled</option>
                                                    <option value="In Progress">In Progress</option>
                                                    <option value="Completed">Completed</option>
                                                    <option value="Cancelled">Cancelled</option>
                                                </select>
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase' }} htmlFor="req-priority">Priority</label>
                                                <select
                                                    id="req-priority"
                                                    className="form-input"
                                                    value={request.priority}
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
                                                <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase' }} htmlFor="req-assigned">Assigned Agent</label>
                                                <select
                                                    id="req-assigned"
                                                    className="form-input"
                                                    value={request.assigned_to ? request.assigned_to.toString() : ''}
                                                    onChange={handleAgentUpdate}
                                                    disabled={updatingAgent}
                                                    style={{ appearance: 'none', background: 'var(--bg-primary)', height: '36px', padding: '0 12px' }}
                                                >
                                                    <option value="">Unassigned</option>
                                                    {agents.map((ag) => (
                                                        <option key={ag.id} value={ag.id}>{ag.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase' }} htmlFor="req-due">Scheduled Due Date</label>
                                                <input
                                                    type="date"
                                                    id="req-due"
                                                    className="form-input"
                                                    value={request.due_date || ''}
                                                    onChange={handleDueDateUpdate}
                                                    disabled={updatingDueDate}
                                                    style={{ height: '36px', padding: '0 12px' }}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Assigned Agent</div>
                                                <div style={{ fontSize: '14px', fontWeight: 600 }}>
                                                    {request.assigned_to_details ? request.assigned_to_details.name : 'Unassigned'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Due Date</div>
                                                <div style={{ fontSize: '14px', fontWeight: 600 }}>
                                                    {request.due_date ? new Date(request.due_date).toLocaleDateString() : 'Not Scheduled'}
                                                </div>
                                            </div>

                                            {request.status !== 'Completed' && request.status !== 'Cancelled' && (
                                                <button 
                                                    onClick={handleCancelRequest} 
                                                    className="btn btn-danger" 
                                                    style={{ width: '100%', marginTop: '10px' }}
                                                >
                                                    ❌ Cancel Service Request
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Status transitions logs timeline */}
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

export default ServiceRequestDetail;
