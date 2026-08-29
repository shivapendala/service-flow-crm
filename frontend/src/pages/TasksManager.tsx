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

interface TaskItem {
    id: number;
    title: string;
    description: string;
    priority: string;
    status: string;
    due_date: string;
    reminder_time: string | null;
    assigned_to: number | null;
    assigned_to_details: { id: number; email: string; name: string } | null;
    created_by_details: { id: number; email: string; name: string } | null;
    customer: number | null;
    customer_details: CustomerMinimal | null;
    lead: number | null;
    lead_details: LeadMinimal | null;
    deal: number | null;
    deal_details: DealMinimal | null;
    ticket: number | null;
    ticket_details: TicketMinimal | null;
    created_at: string;
}

interface AgentListItem {
    id: number;
    email: string;
    name: string;
}

const TasksManager = () => {
    const { user } = useAuth();

    // Data lists
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [agents, setAgents] = useState<AgentListItem[]>([]);
    
    // Modal dependencies lists
    const [customers, setCustomers] = useState<CustomerMinimal[]>([]);
    const [leads, setLeads] = useState<LeadMinimal[]>([]);
    const [deals, setDeals] = useState<DealMinimal[]>([]);
    const [tickets, setTickets] = useState<TicketMinimal[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('calendar');

    // Calendar Navigation States
    const [currentDate, setCurrentDate] = useState(new Date());

    // Search and Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [assignedFilter, setAssignedFilter] = useState('');

    // Modal States (Add / Edit / Detail)
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedDateStr, setSelectedDateStr] = useState('');
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        priority: 'Medium',
        status: 'Pending',
        due_date: '',
        reminder_time: '',
        assigned_to: '',
        customer: '',
        lead: '',
        deal: '',
        ticket: ''
    });

    const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [formErrorMsg, setFormErrorMsg] = useState<string | null>(null);
    const [formSuccessMsg, setFormSuccessMsg] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadTasks();
    }, [search, statusFilter, priorityFilter, assignedFilter]);

    useEffect(() => {
        if (user && (user.role === 'Admin' || user.role === 'Manager')) {
            loadAgents();
        }
    }, [user]);

    useEffect(() => {
        if (showAddModal) {
            loadModalDependencies();
        }
    }, [showAddModal]);

    const loadTasks = async () => {
        setIsLoading(true);
        try {
            const endpoint = `/tasks/?search=${encodeURIComponent(search)}` +
                             `&status=${statusFilter}` +
                             `&priority=${priorityFilter}` +
                             `&assigned_to=${assignedFilter}`;
            const data = await apiRequest(endpoint);
            setTasks(data);
        } catch (err) {
            console.error('Failed to load tasks:', err);
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
            console.error('Failed to load task dependencies:', err);
        }
    };

    // Checklist toggler PATCH request
    const handleToggleStatus = async (task: TaskItem) => {
        const nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
        
        // Optimistic UI updates
        const updated = tasks.map(t => t.id === task.id ? { ...t, status: nextStatus } : t);
        setTasks(updated);

        try {
            await apiRequest(`/tasks/${task.id}/`, {
                method: 'PATCH',
                body: JSON.stringify({ status: nextStatus })
            });
        } catch (err) {
            console.error('Failed to toggle task status:', err);
            loadTasks();
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        if (!window.confirm("Permanently delete this task?")) return;
        try {
            await apiRequest(`/tasks/${taskId}/`, { method: 'DELETE' });
            setTasks(tasks.filter(t => t.id !== taskId));
            setShowDetailModal(false);
            setSelectedTask(null);
        } catch (err) {
            console.error('Deletion failed:', err);
        }
    };

    // Calendar Month Grid Generation
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDayIndex = new Date(year, month, 1).getDay(); // Index of first day (0-6)
        const totalDays = new Date(year, month + 1, 0).getDate(); // Number of days in month
        
        const days = [];
        
        // Pad previous month days
        const prevMonthTotalDays = new Date(year, month, 0).getDate();
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            days.push({
                dayNumber: prevMonthTotalDays - i,
                isCurrentMonth: false,
                dateObj: new Date(year, month - 1, prevMonthTotalDays - i)
            });
        }

        // Current month days
        for (let i = 1; i <= totalDays; i++) {
            days.push({
                dayNumber: i,
                isCurrentMonth: true,
                dateObj: new Date(year, month, i)
            });
        }

        // Pad next month days to make multiple of 7 (full calendar grid rows)
        const gridTotalCells = Math.ceil(days.length / 7) * 7;
        const nextMonthPadding = gridTotalCells - days.length;
        for (let i = 1; i <= nextMonthPadding; i++) {
            days.push({
                dayNumber: i,
                isCurrentMonth: false,
                dateObj: new Date(year, month + 1, i)
            });
        }

        return days;
    };

    const handleMonthChange = (offset: number) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    // Modal forms handlers
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setNewTask({
            ...newTask,
            [e.target.id]: e.target.value
        });
        if (formErrors[e.target.id]) {
            setFormErrors({ ...formErrors, [e.target.id]: '' });
        }
    };

    const handleDayCellClick = (date: Date) => {
        // Format as YYYY-MM-DD local format
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        setSelectedDateStr(dateStr);
        setNewTask({
            ...newTask,
            due_date: dateStr
        });
        setShowAddModal(true);
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!newTask.title) errors.title = 'Task title is required';
        if (!newTask.due_date) errors.due_date = 'Due date is required';

        if (newTask.due_date && newTask.reminder_time) {
            const selectedDue = new Date(newTask.due_date);
            const selectedReminder = new Date(newTask.reminder_time);
            selectedDue.setHours(23,59,59,999); // Allow reminders anytime on the due date
            if (selectedReminder > selectedDue) {
                errors.reminder_time = 'Reminder time must be scheduled before or on the due date';
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
                ...newTask,
                assigned_to: newTask.assigned_to ? parseInt(newTask.assigned_to) : null,
                customer: newTask.customer ? parseInt(newTask.customer) : null,
                lead: newTask.lead ? parseInt(newTask.lead) : null,
                deal: newTask.deal ? parseInt(newTask.deal) : null,
                ticket: newTask.ticket ? parseInt(newTask.ticket) : null,
                reminder_time: newTask.reminder_time || null
            };

            await apiRequest('/tasks/', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            setFormSuccessMsg('Task scheduled successfully!');
            setNewTask({
                title: '',
                description: '',
                priority: 'Medium',
                status: 'Pending',
                due_date: '',
                reminder_time: '',
                assigned_to: '',
                customer: '',
                lead: '',
                deal: '',
                ticket: ''
            });

            loadTasks();

            setTimeout(() => {
                setShowAddModal(false);
                setFormSuccessMsg(null);
            }, 1500);
        } catch (err: any) {
            console.error('Failed to submit task:', err);
            setFormErrorMsg(err.data?.detail || 'An error occurred during task scheduling.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openTaskDetail = (task: TaskItem) => {
        setSelectedTask(task);
        setShowDetailModal(true);
    };

    // Styling Helpers
    const getPriorityBadgeClass = (priority: string) => {
        switch (priority) {
            case 'High': return 'badge-admin';
            case 'Medium': return 'badge-manager';
            default: return 'badge-support';
        }
    };

    const calendarCells = getDaysInMonth(currentDate);

    return (
        <div className="layout-container">
            <Sidebar />

            <main className="main-content">
                <header className="header">
                    <h2 className="gradient-text">Follow-up Tasks</h2>
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '4px' }}>
                        <button 
                            className={`btn ${activeTab === 'calendar' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveTab('calendar')}
                            style={{ height: '36px', fontSize: '13px', padding: '0 16px', border: 'none' }}
                        >
                            📅 Calendar View
                        </button>
                        <button 
                            className={`btn ${activeTab === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveTab('list')}
                            style={{ height: '36px', fontSize: '13px', padding: '0 16px', border: 'none' }}
                        >
                            📝 Checklist View
                        </button>
                    </div>
                </header>

                <div className="content-body" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
                    {/* Filters bar */}
                    <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="🔍 Search tasks..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ maxWidth: '280px' }}
                            />

                            <select
                                className="form-input"
                                style={{ width: '120px', appearance: 'none', background: 'var(--bg-primary)' }}
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                <option value="Pending">Pending</option>
                                <option value="Completed">Completed</option>
                            </select>

                            <select
                                className="form-input"
                                style={{ width: '120px', appearance: 'none', background: 'var(--bg-primary)' }}
                                value={priorityFilter}
                                onChange={(e) => setPriorityFilter(e.target.value)}
                            >
                                <option value="">All Priorities</option>
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>

                            {(user?.role === 'Admin' || user?.role === 'Manager') && (
                                <select
                                    className="form-input"
                                    style={{ width: '160px', appearance: 'none', background: 'var(--bg-primary)' }}
                                    value={assignedFilter}
                                    onChange={(e) => setAssignedFilter(e.target.value)}
                                >
                                    <option value="">All Assigned Agents</option>
                                    {agents.map((ag) => (
                                        <option key={ag.id} value={ag.id}>{ag.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <button onClick={() => { setSelectedDateStr(''); setShowAddModal(true); }} className="btn btn-primary" style={{ height: '40px', padding: '0 20px', fontSize: '13px' }}>
                            ➕ Schedule Task
                        </button>
                    </div>

                    {/* Views grid */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '80px', flex: 1, alignItems: 'center' }}>
                                <div className="spinner"></div>
                            </div>
                        ) : activeTab === 'list' ? (
                            
                            /* CHECKLIST LIST VIEW */
                            <div className="glass-panel" style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                                {tasks.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                        <span style={{ fontSize: '32px' }}>📝</span>
                                        <h4 style={{ marginTop: '12px' }}>No Tasks Scheduled</h4>
                                    </div>
                                ) : (
                                    <div className="table-container">
                                        <table className="crm-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '40px' }}>Status</th>
                                                    <th>Task Title</th>
                                                    <th>Priority</th>
                                                    <th>Due Date</th>
                                                    <th>Assigned Agent</th>
                                                    <th>Related Entity</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tasks.map((task) => (
                                                    <tr key={task.id} style={{ opacity: task.status === 'Completed' ? 0.6 : 1 }}>
                                                        <td>
                                                            <input
                                                                type="checkbox"
                                                                checked={task.status === 'Completed'}
                                                                onChange={() => handleToggleStatus(task)}
                                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                            />
                                                        </td>
                                                        <td style={{ fontWeight: 600 }}>
                                                            <span 
                                                                onClick={() => openTaskDetail(task)}
                                                                style={{ 
                                                                    cursor: 'pointer',
                                                                    textDecoration: task.status === 'Completed' ? 'line-through' : 'none',
                                                                    color: 'var(--text-primary)'
                                                                }}
                                                            >
                                                                {task.title}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${getPriorityBadgeClass(task.priority)}`}>
                                                                {task.priority}
                                                            </span>
                                                        </td>
                                                        <td style={{ fontSize: '13px' }}>📅 {new Date(task.due_date).toLocaleDateString()}</td>
                                                        <td style={{ fontSize: '14px' }}>
                                                            {task.assigned_to_details ? task.assigned_to_details.name : <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}
                                                        </td>
                                                        <td style={{ fontSize: '13px' }}>
                                                            {task.customer_details && <span className="badge badge-manager" style={{ marginRight: '4px' }}>👤 {task.customer_details.name}</span>}
                                                            {task.lead_details && <span className="badge badge-support" style={{ marginRight: '4px' }}>🎯 {task.lead_details.name}</span>}
                                                            {task.deal_details && <span className="badge badge-sales" style={{ marginRight: '4px' }}>💼 {task.deal_details.title}</span>}
                                                            {task.ticket_details && <span className="badge badge-admin" style={{ marginRight: '4px' }}>🎫 {task.ticket_details.ticket_number}</span>}
                                                            {!task.customer && !task.lead && !task.deal && !task.ticket && <span style={{ color: 'var(--text-muted)' }}>General Todo</span>}
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                                <button onClick={() => openTaskDetail(task)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>
                                                                    Open
                                                                </button>
                                                                <button onClick={() => handleDeleteTask(task.id)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '13px' }}>
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ) : (
                            
                            /* INTERACTIVE MONTH GRID CALENDAR VIEW */
                            <div className="glass-panel" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                {/* Calendar Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h3 style={{ textTransform: 'capitalize', color: 'var(--accent-secondary)' }}>
                                        {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                    </h3>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => handleMonthChange(-1)} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '13px' }}>
                                            ◀ Prev Month
                                        </button>
                                        <button onClick={() => setCurrentDate(new Date())} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '13px' }}>
                                            Today
                                        </button>
                                        <button onClick={() => handleMonthChange(1)} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '13px' }}>
                                            Next Month ▶
                                        </button>
                                    </div>
                                </div>

                                {/* Days of week header */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', paddingBottom: '8px', color: 'var(--text-secondary)' }}>
                                    <div>SUN</div>
                                    <div>MON</div>
                                    <div>TUE</div>
                                    <div>WED</div>
                                    <div>THU</div>
                                    <div>FRI</div>
                                    <div>SAT</div>
                                </div>

                                {/* Month Days cells grid */}
                                <div style={{ 
                                    flex: 1, 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(7, 1fr)', 
                                    gridAutoRows: '1fr',
                                    gap: '6px',
                                    overflowY: 'auto'
                                }}>
                                    {calendarCells.map((cell, idx) => {
                                        // Find tasks due on this date (ignoring timezone issues by comparing date strings YYYY-MM-DD)
                                        const cellYear = cell.dateObj.getFullYear();
                                        const cellMonth = String(cell.dateObj.getMonth() + 1).padStart(2, '0');
                                        const cellDay = String(cell.dateObj.getDate()).padStart(2, '0');
                                        const cellDateStr = `${cellYear}-${cellMonth}-${cellDay}`;

                                        const dayTasks = tasks.filter((t) => t.due_date === cellDateStr);

                                        return (
                                            <div
                                                key={idx}
                                                style={{
                                                    background: cell.isCurrentMonth ? 'rgba(25, 21, 53, 0.4)' : 'rgba(25, 21, 53, 0.1)',
                                                    border: '1px solid rgba(255,255,255,0.04)',
                                                    borderRadius: '8px',
                                                    padding: '8px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '4px',
                                                    minHeight: '80px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    opacity: cell.isCurrentMonth ? 1 : 0.4
                                                }}
                                                className="glass-card"
                                                onClick={() => handleDayCellClick(cell.dateObj)}
                                            >
                                                {/* Day number */}
                                                <div style={{ 
                                                    alignSelf: 'flex-end', 
                                                    fontSize: '11px', 
                                                    fontWeight: 'bold', 
                                                    color: cell.isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)' 
                                                }}>
                                                    {cell.dayNumber}
                                                </div>

                                                {/* Task Badges in day */}
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto' }}>
                                                    {dayTasks.map((t) => (
                                                        <div
                                                            key={t.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // Avoid triggering day cell click modal!
                                                                openTaskDetail(t);
                                                            }}
                                                            style={{
                                                                fontSize: '10.5px',
                                                                background: t.status === 'Completed' ? 'rgba(0, 230, 118, 0.12)' : 'rgba(138, 43, 226, 0.25)',
                                                                color: t.status === 'Completed' ? 'var(--role-sales)' : 'var(--text-primary)',
                                                                border: t.status === 'Completed' ? '1px solid rgba(0, 230, 118, 0.3)' : '1px solid rgba(138, 43, 226, 0.4)',
                                                                borderRadius: '4px',
                                                                padding: '2px 6px',
                                                                textOverflow: 'ellipsis',
                                                                overflow: 'hidden',
                                                                whiteSpace: 'nowrap',
                                                                textDecoration: t.status === 'Completed' ? 'line-through' : 'none'
                                                            }}
                                                        >
                                                            {t.title}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Create Task Modal */}
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
                    <div className="glass-card" style={{ width: '100%', maxWidth: '520px', padding: '32px', overflowY: 'auto', maxHeight: '90vh' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3>Schedule Task {selectedDateStr ? `for ${selectedDateStr}` : ''}</h3>
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
                                <label className="form-label" htmlFor="title">Task Title</label>
                                <input
                                    type="text"
                                    id="title"
                                    className="form-input"
                                    placeholder="e.g. Call client for proposal review..."
                                    value={newTask.title}
                                    onChange={handleInputChange}
                                    disabled={isSubmitting}
                                />
                                {formErrors.title && <div className="form-error">⚠️ {formErrors.title}</div>}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="priority">Priority</label>
                                    <select
                                        id="priority"
                                        className="form-input"
                                        value={newTask.priority}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                        style={{ appearance: 'none', background: 'var(--bg-primary)' }}
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="due_date">Due Date</label>
                                    <input
                                        type="date"
                                        id="due_date"
                                        className="form-input"
                                        value={newTask.due_date}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                    />
                                    {formErrors.due_date && <div className="form-error">⚠️ {formErrors.due_date}</div>}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="reminder_time">Reminder Time (Optional)</label>
                                    <input
                                        type="datetime-local"
                                        id="reminder_time"
                                        className="form-input"
                                        value={newTask.reminder_time}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                    />
                                    {formErrors.reminder_time && <div className="form-error">⚠️ {formErrors.reminder_time}</div>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="assigned_to">Assigned User</label>
                                    <select
                                        id="assigned_to"
                                        className="form-input"
                                        value={newTask.assigned_to}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting || !(user?.role === 'Admin' || user?.role === 'Manager')}
                                        style={{ appearance: 'none', background: 'var(--bg-primary)' }}
                                    >
                                        <option value="">Unassigned (Me)</option>
                                        {agents.map((ag) => (
                                            <option key={ag.id} value={ag.id}>{ag.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <h4 style={{ margin: '14px 0 8px', color: 'var(--accent-secondary)', fontSize: '13px' }}>Optional CRM Associations</h4>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '11px' }} htmlFor="customer">Customer Link</label>
                                    <select
                                        id="customer"
                                        className="form-input"
                                        value={newTask.customer}
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
                                        value={newTask.lead}
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
                                        value={newTask.deal}
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
                                        value={newTask.ticket}
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
                                <label className="form-label" htmlFor="description">Task Context Details</label>
                                <textarea
                                    id="description"
                                    className="form-input"
                                    placeholder="Enter checklist descriptions..."
                                    style={{ height: '60px', resize: 'vertical' }}
                                    value={newTask.description}
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
                                    {isSubmitting ? 'Scheduling...' : 'Schedule Task'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Task Detail Modal */}
            {showDetailModal && selectedTask && (
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
                    <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <span className={`badge ${getPriorityBadgeClass(selectedTask.priority)}`}>
                                {selectedTask.priority} Priority
                            </span>
                            <button 
                                onClick={() => setShowDetailModal(false)}
                                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                ✕
                            </button>
                        </div>

                        <h3 style={{ marginBottom: '12px' }}>{selectedTask.title}</h3>
                        
                        <div style={{ background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13.5px', borderLeft: '2px solid var(--accent-primary)', minHeight: '60px' }}>
                            {selectedTask.description || <span style={{ color: 'var(--text-muted)' }}>No additional context notes provided.</span>}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Due Date:</span>
                                <strong>📅 {new Date(selectedTask.due_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</strong>
                            </div>
                            {selectedTask.reminder_time && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Reminder:</span>
                                    <strong>⏰ {new Date(selectedTask.reminder_time).toLocaleString()}</strong>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Assigned To:</span>
                                <strong>👤 {selectedTask.assigned_to_details ? selectedTask.assigned_to_details.name : 'Unassigned'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedTask.status === 'Completed'}
                                        onChange={() => handleToggleStatus(selectedTask)}
                                    />
                                    <strong>{selectedTask.status}</strong>
                                </label>
                            </div>
                        </div>

                        {/* Mapped CRM linkages details */}
                        {(selectedTask.customer || selectedTask.lead || selectedTask.deal || selectedTask.ticket) && (
                            <div style={{ background: 'rgba(25,21,53,0.3)', padding: '14px', borderRadius: '8px', marginBottom: '24px' }}>
                                <h5 style={{ color: 'var(--accent-secondary)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px' }}>CRM Associated Records</h5>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '12px' }}>
                                    {selectedTask.customer_details && <span className="badge badge-manager">👤 Customer: {selectedTask.customer_details.name}</span>}
                                    {selectedTask.lead_details && <span className="badge badge-support">🎯 Lead: {selectedTask.lead_details.name}</span>}
                                    {selectedTask.deal_details && <span className="badge badge-sales">💼 Deal: {selectedTask.deal_details.title}</span>}
                                    {selectedTask.ticket_details && <span className="badge badge-admin">🎫 Ticket: {selectedTask.ticket_details.ticket_number}</span>}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '16px' }}>
                            <button 
                                onClick={() => setShowDetailModal(false)}
                                className="btn btn-secondary" 
                                style={{ flex: 1 }}
                            >
                                Close
                            </button>
                            <button 
                                onClick={() => handleDeleteTask(selectedTask.id)}
                                className="btn btn-danger" 
                                style={{ flex: 1 }}
                            >
                                Delete Task
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TasksManager;
