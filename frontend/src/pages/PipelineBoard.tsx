import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import Sidebar from '../components/Sidebar';

interface CustomerMinimal {
    id: number;
    name: string;
    company_name: string;
}

interface DealItem {
    id: number;
    title: string;
    deal_value: string;
    stage: string;
    expected_close_date: string | null;
    customer: number;
    customer_details: CustomerMinimal;
    assigned_to: number | null;
    assigned_to_details: { id: number; email: string; name: string } | null;
    created_by_details?: { id: number; email: string; name: string } | null;
    created_at: string;
}

interface PipelineStats {
    total_pipeline_value: number;
    average_deal_size: number;
    win_rate: number;
    active_deals_count: number;
    stage_breakdown: Record<string, { count: number; value: number }>;
}

interface AgentListItem {
    id: number;
    email: string;
    name: string;
}

const STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'] as const;
type StageType = typeof STAGES[number];

const PipelineBoard = () => {
    const { user } = useAuth();

    // Data States
    const [deals, setDeals] = useState<DealItem[]>([]);
    const [stats, setStats] = useState<PipelineStats | null>(null);
    const [customers, setCustomers] = useState<CustomerMinimal[]>([]);
    const [agents, setAgents] = useState<AgentListItem[]>([]);
    
    // Page control states
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [agentFilter, setAgentFilter] = useState('');
    const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);

    // Modal States
    const [showAddModal, setShowAddModal] = useState(false);
    const [newDeal, setNewDeal] = useState({
        title: '',
        deal_value: '',
        stage: 'New',
        expected_close_date: '',
        customer: '',
        assigned_to: ''
    });

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [formErrorMsg, setFormErrorMsg] = useState<string | null>(null);
    const [formSuccessMsg, setFormSuccessMsg] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadBoardData();
    }, [search, agentFilter]);

    useEffect(() => {
        if (showAddModal) {
            loadModalDependencies();
        }
    }, [showAddModal]);

    useEffect(() => {
        if (user && (user.role === 'Admin' || user.role === 'Manager')) {
            fetchAgents();
        }
    }, [user]);

    const fetchAgents = async () => {
        try {
            const usersRes = await apiRequest('/users/');
            const staffList = usersRes.filter((u: any) => u.role !== 'Customer').map((u: any) => ({
                id: u.id,
                email: u.email,
                name: `${u.first_name} ${u.last_name}`
            }));
            setAgents(staffList);
        } catch (err) {
            console.error('Failed to load agents for filtering:', err);
        }
    };

    const loadBoardData = async () => {
        setIsLoading(true);
        try {
            // Fetch deals list
            const endpoint = `/deals/?search=${encodeURIComponent(search)}&assigned_to=${agentFilter}`;
            const dealsData = await apiRequest(endpoint);
            setDeals(dealsData);

            // Fetch statistics
            const statsData = await apiRequest('/deals/stats/');
            setStats(statsData);
        } catch (err) {
            console.error('Failed to load sales pipeline board data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadModalDependencies = async () => {
        try {
            // Load customers (fetch up to 100 to populate dropdown)
            const customersRes = await apiRequest('/customers/?page_size=100');
            // Format customer list
            const mappedCustomers = customersRes.results.map((c: any) => ({
                id: c.id,
                name: `${c.first_name} ${c.last_name}`,
                company_name: c.company_name
            }));
            setCustomers(mappedCustomers);

            // Load staff agents (only Admins/Managers can query user list)
            if (user?.role === 'Admin' || user?.role === 'Manager') {
                const usersRes = await apiRequest('/users/');
                const staffList = usersRes.filter((u: any) => u.role !== 'Customer').map((u: any) => ({
                    id: u.id,
                    email: u.email,
                    name: `${u.first_name} ${u.last_name}`
                }));
                setAgents(staffList);
            }
        } catch (err) {
            console.error('Failed to load modal dependencies:', err);
        }
    };

    // Native Drag and Drop events
    const handleDragStart = (e: React.DragEvent, dealId: number) => {
        e.dataTransfer.setData('text/plain', dealId.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, stage: string) => {
        e.preventDefault();
        if (draggedOverColumn !== stage) {
            setDraggedOverColumn(stage);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Only reset if exiting the column area
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent, targetStage: StageType) => {
        e.preventDefault();
        setDraggedOverColumn(null);
        
        const dealIdStr = e.dataTransfer.getData('text/plain');
        if (!dealIdStr) return;
        
        const dealId = parseInt(dealIdStr);
        const draggedDeal = deals.find(d => d.id === dealId);
        
        if (!draggedDeal) return;
        if (draggedDeal.stage === targetStage) return; // Dropped in the same column

        // Sales Agent Role Check: can only edit deals assigned to them or created by them
        if (user?.role === 'Sales Agent') {
            const isOwner = (draggedDeal.created_by_details?.id === user.id || draggedDeal.assigned_to_details?.id === user.id);
            if (!isOwner) {
                alert("Permission Denied: You can only move deals assigned to you or created by you.");
                return;
            }
        }

        // Optimistically update UI local state instantly
        const updatedDeals = deals.map(d => d.id === dealId ? { ...d, stage: targetStage } : d);
        setDeals(updatedDeals);

        try {
            // PATCH API update to server
            await apiRequest(`/deals/${dealId}/`, {
                method: 'PATCH',
                body: JSON.stringify({ stage: targetStage })
            });
            
            // Reload stats and database values
            const statsData = await apiRequest('/deals/stats/');
            setStats(statsData);
        } catch (err: any) {
            console.error('Failed to update stage on drag drop:', err);
            // Revert optimistic state on server error
            loadBoardData();
            alert(err.data?.detail || 'An error occurred during stage update.');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setNewDeal({
            ...newDeal,
            [e.target.id]: e.target.value
        });
        if (formErrors[e.target.id]) {
            setFormErrors({ ...formErrors, [e.target.id]: '' });
        }
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!newDeal.title) errors.title = 'Deal title is required';
        if (!newDeal.customer) errors.customer = 'Associated customer is required';
        
        if (!newDeal.deal_value) {
            errors.deal_value = 'Deal value is required';
        } else if (parseFloat(newDeal.deal_value) < 0) {
            errors.deal_value = 'Deal value cannot be negative';
        }

        if (newDeal.expected_close_date) {
            const selectedDate = new Date(newDeal.expected_close_date);
            const today = new Date();
            today.setHours(0,0,0,0);
            if (selectedDate < today) {
                errors.expected_close_date = 'Expected close date cannot be in the past';
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
                ...newDeal,
                deal_value: parseFloat(newDeal.deal_value),
                customer: parseInt(newDeal.customer),
                assigned_to: newDeal.assigned_to ? parseInt(newDeal.assigned_to) : null,
                expected_close_date: newDeal.expected_close_date || null
            };

            await apiRequest('/deals/', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            setFormSuccessMsg('Deal added to pipeline!');
            setNewDeal({
                title: '',
                deal_value: '',
                stage: 'New',
                expected_close_date: '',
                customer: '',
                assigned_to: ''
            });

            loadBoardData();

            setTimeout(() => {
                setShowAddModal(false);
                setFormSuccessMsg(null);
            }, 1500);
        } catch (err: any) {
            console.error('Failed to create deal:', err);
            setFormErrorMsg(err.data?.detail || 'Failed to submit deal. Verify values.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isSupportAgent = user?.role === 'Support Agent';

    if (isLoading) {
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
                    <h2 className="gradient-text">Sales Pipeline Board</h2>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        Active Pipeline: <strong style={{ color: 'var(--accent-secondary)' }}>{stats ? `$${stats.total_pipeline_value.toLocaleString()}` : '$0'}</strong>
                    </div>
                </header>

                <div className="content-body" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
                    
                    {/* Pipeline aggregation statistics strip */}
                    {stats && (
                        <div className="dashboard-grid" style={{ marginBottom: '20px', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                            <div className="glass-panel stat-widget" style={{ padding: '16px 20px' }}>
                                <div className="stat-header"><span>Pipeline Value</span><span>💰</span></div>
                                <div className="stat-value" style={{ fontSize: '24px' }}>${stats.total_pipeline_value.toLocaleString()}</div>
                            </div>
                            <div className="glass-panel stat-widget" style={{ padding: '16px 20px' }}>
                                <div className="stat-header"><span>Active Deals</span><span>📊</span></div>
                                <div className="stat-value" style={{ fontSize: '24px' }}>{stats.active_deals_count}</div>
                            </div>
                            <div className="glass-panel stat-widget" style={{ padding: '16px 20px' }}>
                                <div className="stat-header"><span>Avg Deal Size</span><span>📈</span></div>
                                <div className="stat-value" style={{ fontSize: '24px' }}>${stats.average_deal_size.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                            </div>
                            <div className="glass-panel stat-widget" style={{ padding: '16px 20px' }}>
                                <div className="stat-header"><span>Win Rate</span><span>🎯</span></div>
                                <div className="stat-value" style={{ fontSize: '24px' }}>{stats.win_rate}%</div>
                            </div>
                        </div>
                    )}

                    {/* Filter bar */}
                    <div className="glass-panel" style={{ padding: '14px 20px', marginBottom: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px' }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="🔍 Search deal title, client, company..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ maxWidth: '350px' }}
                            />

                            {(user?.role === 'Admin' || user?.role === 'Manager') && (
                                <select
                                    className="form-input"
                                    style={{ width: '180px', appearance: 'none', background: 'var(--bg-primary)' }}
                                    value={agentFilter}
                                    onChange={(e) => setAgentFilter(e.target.value)}
                                >
                                    <option value="">All Assigned Agents</option>
                                    {agents.map((ag) => (
                                        <option key={ag.id} value={ag.id}>{ag.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {!isSupportAgent && (
                            <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ height: '38px', padding: '0 20px', fontSize: '13px' }}>
                                ➕ New Deal Card
                            </button>
                        )}
                    </div>

                    {/* Kanban Board columns wrapper */}
                    <div style={{ 
                        flex: 1, 
                        display: 'flex', 
                        gap: '16px', 
                        overflowX: 'auto', 
                        paddingBottom: '16px',
                        alignItems: 'stretch'
                    }}>
                        {STAGES.map((stage) => {
                            const stageDeals = deals.filter((d) => d.stage === stage);
                            const stageStats = stats?.stage_breakdown[stage] || { count: 0, value: 0 };
                            const isDraggedOver = draggedOverColumn === stage;

                            return (
                                <div
                                    key={stage}
                                    onDragOver={(e) => handleDragOver(e, stage)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, stage)}
                                    style={{
                                        flex: '0 0 290px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        background: isDraggedOver ? 'rgba(0, 242, 254, 0.05)' : 'rgba(25, 21, 53, 0.25)',
                                        border: isDraggedOver ? '2px solid var(--accent-secondary)' : '1px solid rgba(138, 43, 226, 0.1)',
                                        boxShadow: isDraggedOver ? '0 0 15px rgba(0, 242, 254, 0.2)' : 'none',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        transition: 'all 0.2s ease',
                                        maxHeight: '100%'
                                    }}
                                >
                                    {/* Column Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{stage}</span>
                                        <span className="badge badge-support" style={{ fontSize: '11px', padding: '2px 8px' }}>
                                            {stageDeals.length} · ${stageStats.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </span>
                                    </div>

                                    {/* Cards Container */}
                                    <div style={{ 
                                        flex: 1, 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        gap: '12px', 
                                        overflowY: 'auto',
                                        minHeight: '150px'
                                    }}>
                                        {stageDeals.map((deal) => (
                                            <div
                                                key={deal.id}
                                                draggable={!isSupportAgent}
                                                onDragStart={(e) => handleDragStart(e, deal.id)}
                                                style={{
                                                    background: 'rgba(25, 21, 53, 0.65)',
                                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                                    borderRadius: '8px',
                                                    padding: '14px',
                                                    cursor: isSupportAgent ? 'default' : 'grab',
                                                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                className="glass-card"
                                            >
                                                {/* Card title */}
                                                <h4 style={{ fontSize: '14px', marginBottom: '8px', fontWeight: 600 }}>{deal.title}</h4>
                                                
                                                {/* Customer linkage */}
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                                    👤 {deal.customer_details ? (
                                                        <Link to={`/customers/${deal.customer}`} style={{ color: 'var(--accent-secondary)', textDecoration: 'none' }}>
                                                            {deal.customer_details.name}
                                                        </Link>
                                                    ) : 'Unknown Contact'}
                                                </div>

                                                {/* Value and Expected closing Date */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px', fontSize: '12px' }}>
                                                    <strong style={{ color: 'var(--role-sales)', fontSize: '13px' }}>
                                                        ${parseFloat(deal.deal_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </strong>
                                                    
                                                    {deal.expected_close_date ? (
                                                        <span style={{ color: 'var(--text-muted)' }}>
                                                            📅 {new Date(deal.expected_close_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)' }}>No Date</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* Create Deal Modal */}
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
                    <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3>Add Deal to Pipeline</h3>
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
                                <label className="form-label" htmlFor="title">Deal Title / Product</label>
                                <input
                                    type="text"
                                    id="title"
                                    className="form-input"
                                    placeholder="e.g. Enterprise Cloud supply Package"
                                    value={newDeal.title}
                                    onChange={handleInputChange}
                                    disabled={isSubmitting}
                                />
                                {formErrors.title && <div className="form-error">⚠️ {formErrors.title}</div>}
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="customer">Customer Link</label>
                                <select
                                    id="customer"
                                    className="form-input"
                                    value={newDeal.customer}
                                    onChange={handleInputChange}
                                    disabled={isSubmitting}
                                    style={{ appearance: 'none', background: 'var(--bg-primary)' }}
                                >
                                    <option value="">Select Associated Customer</option>
                                    {customers.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.company_name})</option>
                                    ))}
                                </select>
                                {formErrors.customer && <div className="form-error">⚠️ {formErrors.customer}</div>}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="deal_value">Deal Value ($)</label>
                                    <input
                                        type="number"
                                        id="deal_value"
                                        className="form-input"
                                        placeholder="15000"
                                        step="0.01"
                                        value={newDeal.deal_value}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                    />
                                    {formErrors.deal_value && <div className="form-error">⚠️ {formErrors.deal_value}</div>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="stage">Initial Stage</label>
                                    <select
                                        id="stage"
                                        className="form-input"
                                        value={newDeal.stage}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                        style={{ appearance: 'none', background: 'var(--bg-primary)' }}
                                    >
                                        <option value="New">New</option>
                                        <option value="Contacted">Contacted</option>
                                        <option value="Qualified">Qualified</option>
                                        <option value="Proposal">Proposal</option>
                                        <option value="Negotiation">Negotiation</option>
                                        <option value="Won">Won</option>
                                        <option value="Lost">Lost</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="expected_close_date">Expected Closing Date</label>
                                    <input
                                        type="date"
                                        id="expected_close_date"
                                        className="form-input"
                                        value={newDeal.expected_close_date}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                    />
                                    {formErrors.expected_close_date && <div className="form-error">⚠️ {formErrors.expected_close_date}</div>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="assigned_to">Assigned Sales Agent</label>
                                    <select
                                        id="assigned_to"
                                        className="form-input"
                                        value={newDeal.assigned_to}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting || !(user?.role === 'Admin' || user?.role === 'Manager')}
                                        style={{ appearance: 'none', background: 'var(--bg-primary)' }}
                                    >
                                        <option value="">Unassigned</option>
                                        {agents.map((ag) => (
                                            <option key={ag.id} value={ag.id}>{ag.name}</option>
                                        ))}
                                    </select>
                                </div>
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
                                    {isSubmitting ? 'Submitting...' : 'Add Deal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PipelineBoard;
