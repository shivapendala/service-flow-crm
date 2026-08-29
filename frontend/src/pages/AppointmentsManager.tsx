import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import Sidebar from '../components/Sidebar';

interface CustomerMinimal {
    id: number;
    name: string;
    company_name: string;
    email: string;
}

interface AppointmentItem {
    id: number;
    customer: number;
    customer_details: CustomerMinimal;
    assigned_to: number | null;
    assigned_to_details: { id: number; email: string; name: string } | null;
    date: string;
    time: string;
    purpose: string;
    location: string;
    status: string;
    notes: string;
    created_by_details: { id: number; email: string; name: string } | null;
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

const AppointmentsManager = () => {
    const { user } = useAuth();

    // Data lists
    const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
    const [upcomingAppts, setUpcomingAppts] = useState<AppointmentItem[]>([]);
    const [agents, setAgents] = useState<AgentListItem[]>([]);
    const [customers, setCustomers] = useState<CustomerMinimal[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'calendar' | 'list' | 'upcoming'>('calendar');

    // Calendar Navigation States
    const [currentDate, setCurrentDate] = useState(new Date());

    // Search and Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [assignedFilter, setAssignedFilter] = useState('');

    // Modal States (Add / Detail Drawer)
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedDateStr, setSelectedDateStr] = useState('');
    const [newAppt, setNewAppt] = useState({
        customer: '',
        assigned_to: '',
        date: '',
        time: '',
        purpose: '',
        location: '',
        notes: ''
    });

    const [selectedAppt, setSelectedAppt] = useState<AppointmentItem | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [formErrorMsg, setFormErrorMsg] = useState<string | null>(null);
    const [formSuccessMsg, setFormSuccessMsg] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Detail modal modifiers
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [updatingAgent, setUpdatingAgent] = useState(false);

    useEffect(() => {
        loadData();
    }, [search, statusFilter, assignedFilter]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const endpoint = `/appointments/?search=${encodeURIComponent(search)}` +
                             `&status=${statusFilter}` +
                             `&assigned_to=${assignedFilter}`;
            const data = await apiRequest(endpoint);
            setAppointments(data);

            const upcoming = await apiRequest('/appointments/upcoming/');
            setUpcomingAppts(upcoming);
        } catch (err) {
            console.error('Failed to load appointments:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (showAddModal && user && user.role !== 'Customer') {
            loadAgents();
            loadCustomers();
        }
    }, [showAddModal, user]);

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

    const loadCustomers = async () => {
        try {
            const res = await apiRequest('/customers/?page_size=100');
            setCustomers(res.results.map((c: any) => ({
                id: c.id,
                name: `${c.first_name} ${c.last_name}`,
                company_name: c.company_name,
                email: c.email
            })));
        } catch (err) {
            console.error('Failed to load customers:', err);
        }
    };

    const loadHistory = async (apptId: number) => {
        try {
            const historyData = await apiRequest(`/appointments/${apptId}/history/`);
            setHistory(historyData);
        } catch (err) {
            console.error('Failed to load history:', err);
        }
    };

    const openAppointmentDetail = async (appt: AppointmentItem) => {
        setSelectedAppt(appt);
        setShowDetailModal(true);
        loadHistory(appt.id);
        
        if (user && user.role !== 'Customer' && agents.length === 0) {
            loadAgents();
        }
    };

    const handleDeleteAppointment = async (apptId: number) => {
        if (!window.confirm("Permanently delete this scheduled appointment?")) return;
        try {
            await apiRequest(`/appointments/${apptId}/`, { method: 'DELETE' });
            setAppointments(appointments.filter(a => a.id !== apptId));
            setUpcomingAppts(upcomingAppts.filter(a => a.id !== apptId));
            setShowDetailModal(false);
            setSelectedAppt(null);
        } catch (err) {
            console.error('Deletion failed:', err);
        }
    };

    // Calendar Month Grid Generation
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDayIndex = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        
        const days = [];
        const prevMonthTotalDays = new Date(year, month, 0).getDate();
        
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            days.push({
                dayNumber: prevMonthTotalDays - i,
                isCurrentMonth: false,
                dateObj: new Date(year, month - 1, prevMonthTotalDays - i)
            });
        }

        for (let i = 1; i <= totalDays; i++) {
            days.push({
                dayNumber: i,
                isCurrentMonth: true,
                dateObj: new Date(year, month, i)
            });
        }

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

    // Form inputs triggers
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setNewAppt({
            ...newAppt,
            [e.target.id]: e.target.value
        });
        if (formErrors[e.target.id]) {
            setFormErrors({ ...formErrors, [e.target.id]: '' });
        }
    };

    const handleDayCellClick = (date: Date) => {
        const today = new Date();
        today.setHours(0,0,0,0);
        if (date < today) return; // Prevent scheduling past appointments

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        setSelectedDateStr(dateStr);
        setNewAppt({
            ...newAppt,
            date: dateStr
        });
        setShowAddModal(true);
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!newAppt.purpose) errors.purpose = 'Appointment purpose is required';
        if (!newAppt.date) errors.date = 'Date is required';
        if (!newAppt.time) errors.time = 'Time is required';
        
        if (user && user.role !== 'Customer') {
            if (!newAppt.customer) errors.customer = 'Associated customer is required';
        }

        if (newAppt.date) {
            const selectedDue = new Date(newAppt.date);
            const today = new Date();
            today.setHours(0,0,0,0);
            if (selectedDue < today) {
                errors.date = 'Appointment date cannot be scheduled in the past';
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
                ...newAppt,
                assigned_to: newAppt.assigned_to ? parseInt(newAppt.assigned_to) : null
            };

            if (user && user.role !== 'Customer') {
                payload.customer = parseInt(newAppt.customer);
            } else {
                // Map Customer contact ID automatically based on customer email
                if (user) {
                    const custRes = await apiRequest(`/customers/?search=${encodeURIComponent(user.email)}`);
                    if (custRes.results && custRes.results.length > 0) {
                        payload.customer = custRes.results[0].id;
                    }
                }
            }

            await apiRequest('/appointments/', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            setFormSuccessMsg('Appointment scheduled successfully!');
            setNewAppt({
                customer: '',
                assigned_to: '',
                date: '',
                time: '',
                purpose: '',
                location: '',
                notes: ''
            });

            loadData();

            setTimeout(() => {
                setShowAddModal(false);
                setFormSuccessMsg(null);
            }, 1500);
        } catch (err: any) {
            console.error('Failed to submit appointment:', err);
            setFormErrorMsg(err.data?.detail || 'An error occurred during scheduling. Check inputs.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Detail Drawer PATCH updates (Staff only)
    const handleDetailPatch = async (field: string, val: any, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
        if (!selectedAppt) return;
        setter(true);
        try {
            const updated = await apiRequest(`/appointments/${selectedAppt.id}/`, {
                method: 'PATCH',
                body: JSON.stringify({ [field]: val })
            });
            setSelectedAppt(updated);
            
            // Reload query list and history logs
            loadData();
            loadHistory(selectedAppt.id);
        } catch (err) {
            console.error(`Failed to patch field ${field}:`, err);
        } finally {
            setter(false);
        }
    };

    const handleSelfCancel = async () => {
        if (!selectedAppt) return;
        if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
        setUpdatingStatus(true);
        try {
            const updated = await apiRequest(`/appointments/${selectedAppt.id}/`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'Cancelled' })
            });
            setSelectedAppt(updated);
            loadData();
            loadHistory(selectedAppt.id);
        } catch (err) {
            console.error('Cancellation failed:', err);
        } finally {
            setUpdatingStatus(false);
        }
    };

    // Badges Style helpers
    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Completed': return 'badge-sales';
            case 'Scheduled': return 'badge-manager';
            case 'Cancelled': return 'badge-support';
            default: return 'badge-admin'; // No Show
        }
    };

    const isStaff = user && user.role !== 'Customer';
    const calendarCells = getDaysInMonth(currentDate);

    return (
        <div className="layout-container">
            <Sidebar />

            <main className="main-content">
                <header className="header">
                    <h2 className="gradient-text">Appointments</h2>
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '4px' }}>
                        <button 
                            className={`btn ${activeTab === 'calendar' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveTab('calendar')}
                            style={{ height: '36px', fontSize: '13px', padding: '0 16px', border: 'none' }}
                        >
                            📅 Calendar
                        </button>
                        <button 
                            className={`btn ${activeTab === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveTab('list')}
                            style={{ height: '36px', fontSize: '13px', padding: '0 16px', border: 'none' }}
                        >
                            📋 Directory List
                        </button>
                        <button 
                            className={`btn ${activeTab === 'upcoming' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveTab('upcoming')}
                            style={{ height: '36px', fontSize: '13px', padding: '0 16px', border: 'none' }}
                        >
                            🔔 Upcoming
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
                                placeholder="🔍 Search purpose, location..."
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
                                <option value="Scheduled">Scheduled</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                                <option value="No Show">No Show</option>
                            </select>

                            {isStaff && (
                                <select
                                    className="form-input"
                                    style={{ width: '160px', appearance: 'none', background: 'var(--bg-primary)' }}
                                    value={assignedFilter}
                                    onChange={(e) => setAssignedFilter(e.target.value)}
                                >
                                    <option value="">All Assigned Employees</option>
                                    {agents.map((ag) => (
                                        <option key={ag.id} value={ag.id}>{ag.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <button onClick={() => { setSelectedDateStr(''); setShowAddModal(true); }} className="btn btn-primary" style={{ height: '40px', padding: '0 20px', fontSize: '13px' }}>
                            ➕ Schedule Meeting
                        </button>
                    </div>

                    {/* Views grid */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '80px', flex: 1, alignItems: 'center' }}>
                                <div className="spinner"></div>
                            </div>
                        ) : activeTab === 'list' ? (
                            
                            /* DIRECTORY LIST VIEW */
                            <div className="glass-panel" style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                                {appointments.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                        <span style={{ fontSize: '32px' }}>📋</span>
                                        <h4 style={{ marginTop: '12px' }}>No Appointments Found</h4>
                                    </div>
                                ) : (
                                    <div className="table-container">
                                        <table className="crm-table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Time</th>
                                                    <th>Client Company</th>
                                                    <th>Purpose</th>
                                                    <th>Location</th>
                                                    <th>Status</th>
                                                    <th>Assigned Employee</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {appointments.map((appt) => (
                                                    <tr key={appt.id}>
                                                        <td style={{ fontWeight: 'bold' }}>📅 {new Date(appt.date).toLocaleDateString()}</td>
                                                        <td>⏰ {appt.time.substring(0,5)}</td>
                                                        <td>
                                                            {appt.customer_details ? (
                                                                <div>
                                                                    <div>{appt.customer_details.name}</div>
                                                                    <small style={{ color: 'var(--text-secondary)' }}>{appt.customer_details.company_name}</small>
                                                                </div>
                                                            ) : '—'}
                                                        </td>
                                                        <td>{appt.purpose}</td>
                                                        <td>{appt.location || <span style={{ color: 'var(--text-muted)' }}>Not specified</span>}</td>
                                                        <td>
                                                            <span className={`badge ${getStatusBadgeClass(appt.status)}`}>
                                                                {appt.status}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {appt.assigned_to_details ? appt.assigned_to_details.name : <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}
                                                        </td>
                                                        <td>
                                                            <button onClick={() => openAppointmentDetail(appt)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>
                                                                Open Details
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'upcoming' ? (
                            
                            /* UPCOMING REMINDERS LIST VIEW */
                            <div className="glass-panel" style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                                <h3 style={{ marginBottom: '20px' }}>🔔 Scheduled Upcoming Meetings</h3>
                                {upcomingAppts.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                        <span style={{ fontSize: '32px' }}>🔔</span>
                                        <h4 style={{ marginTop: '12px' }}>No Upcoming Scheduled Appointments</h4>
                                        <p style={{ fontSize: '13px', marginTop: '4px' }}>All meetings are completed, cancelled, or none are logged.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
                                        {upcomingAppts.map((appt) => {
                                            const apptDate = new Date(`${appt.date}T${appt.time}`);
                                            const now = new Date();
                                            const diffMs = apptDate.getTime() - now.getTime();
                                            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                                            
                                            let dayReminder = '';
                                            if (diffDays === 0) dayReminder = 'Today';
                                            else if (diffDays === 1) dayReminder = 'Tomorrow';
                                            else dayReminder = `In ${diffDays} days`;

                                            return (
                                                <div 
                                                    key={appt.id}
                                                    className="glass-card"
                                                    style={{ 
                                                        padding: '16px 20px', 
                                                        borderLeft: '4px solid var(--role-manager)', 
                                                        display: 'flex', 
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ fontWeight: 'bold', fontSize: '14.5px', color: 'var(--text-primary)' }}>
                                                            {appt.purpose}
                                                        </div>
                                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                            🏢 Client: <strong>{appt.customer_details?.company_name || appt.customer_details?.name}</strong> · Location: <strong>{appt.location || 'Online'}</strong>
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                            Scheduled with: {appt.assigned_to_details ? appt.assigned_to_details.name : 'Unassigned'}
                                                        </div>
                                                    </div>

                                                    <div style={{ textAlign: 'right' }}>
                                                        <span className="badge badge-manager" style={{ fontSize: '11px', display: 'inline-block', marginBottom: '6px' }}>
                                                            {dayReminder}
                                                        </span>
                                                        <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
                                                            📅 {appt.date} · ⏰ {appt.time.substring(0,5)}
                                                        </div>
                                                        <button 
                                                            onClick={() => openAppointmentDetail(appt)}
                                                            className="btn btn-secondary"
                                                            style={{ fontSize: '12px', padding: '4px 10px', marginTop: '6px', height: '28px' }}
                                                        >
                                                            Open
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            
                            /* INTERACTIVE MONTH GRID CALENDAR VIEW */
                            <div className="glass-panel" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', paddingBottom: '8px', color: 'var(--text-secondary)' }}>
                                    <div>SUN</div>
                                    <div>MON</div>
                                    <div>TUE</div>
                                    <div>WED</div>
                                    <div>THU</div>
                                    <div>FRI</div>
                                    <div>SAT</div>
                                </div>

                                <div style={{ 
                                    flex: 1, 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(7, 1fr)', 
                                    gridAutoRows: '1fr',
                                    gap: '6px',
                                    overflowY: 'auto'
                                }}>
                                    {calendarCells.map((cell, idx) => {
                                        const cellYear = cell.dateObj.getFullYear();
                                        const cellMonth = String(cell.dateObj.getMonth() + 1).padStart(2, '0');
                                        const cellDay = String(cell.dateObj.getDate()).padStart(2, '0');
                                        const cellDateStr = `${cellYear}-${cellMonth}-${cellDay}`;

                                        const dayAppts = appointments.filter((a) => a.date === cellDateStr);

                                        const today = new Date();
                                        today.setHours(0,0,0,0);
                                        const isPast = cell.dateObj < today;

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
                                                    cursor: isPast ? 'default' : 'pointer',
                                                    opacity: cell.isCurrentMonth ? 1 : 0.4
                                                }}
                                                className="glass-card"
                                                onClick={() => handleDayCellClick(cell.dateObj)}
                                            >
                                                <div style={{ 
                                                    alignSelf: 'flex-end', 
                                                    fontSize: '11px', 
                                                    fontWeight: 'bold', 
                                                    color: cell.isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)' 
                                                }}>
                                                    {cell.dayNumber}
                                                </div>

                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto' }}>
                                                    {dayAppts.map((a) => (
                                                        <div
                                                            key={a.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openAppointmentDetail(a);
                                                            }}
                                                            style={{
                                                                fontSize: '10.5px',
                                                                background: a.status === 'Completed' ? 'rgba(0, 230, 118, 0.12)' : (a.status === 'Cancelled' ? 'rgba(255, 76, 76, 0.12)' : 'rgba(255, 193, 7, 0.15)'),
                                                                color: a.status === 'Completed' ? 'var(--role-sales)' : (a.status === 'Cancelled' ? 'var(--role-admin)' : 'var(--role-manager)'),
                                                                border: a.status === 'Completed' ? '1px solid rgba(0, 230, 118, 0.3)' : (a.status === 'Cancelled' ? '1px solid rgba(255, 76, 76, 0.3)' : '1px solid rgba(255, 193, 7, 0.4)'),
                                                                borderRadius: '4px',
                                                                padding: '2px 6px',
                                                                textOverflow: 'ellipsis',
                                                                overflow: 'hidden',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            {a.time.substring(0,5)} {a.customer_details?.company_name || a.customer_details?.name}
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

            {/* Create Appointment Modal */}
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
                            <h3>Schedule Appointment {selectedDateStr ? `for ${selectedDateStr}` : ''}</h3>
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
                                    <label className="form-label" htmlFor="customer">Customer Link</label>
                                    <select
                                        id="customer"
                                        className="form-input"
                                        value={newAppt.customer}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                        style={{ appearance: 'none', background: 'var(--bg-primary)' }}
                                    >
                                        <option value="">Select Customer</option>
                                        {customers.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.company_name})</option>
                                        ))}
                                    </select>
                                    {formErrors.customer && <div className="form-error">⚠️ {formErrors.customer}</div>}
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="date">Date</label>
                                    <input
                                        type="date"
                                        id="date"
                                        className="form-input"
                                        value={newAppt.date}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                    />
                                    {formErrors.date && <div className="form-error">⚠️ {formErrors.date}</div>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="time">Time</label>
                                    <input
                                        type="time"
                                        id="time"
                                        className="form-input"
                                        value={newAppt.time}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                    />
                                    {formErrors.time && <div className="form-error">⚠️ {formErrors.time}</div>}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="purpose">Purpose of Meeting</label>
                                <input
                                    type="text"
                                    id="purpose"
                                    className="form-input"
                                    placeholder="e.g. Project onboarding, sales pitch, diagnostic kickoff..."
                                    value={newAppt.purpose}
                                    onChange={handleInputChange}
                                    disabled={isSubmitting}
                                />
                                {formErrors.purpose && <div className="form-error">⚠️ {formErrors.purpose}</div>}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="location">Location / Channel</label>
                                    <input
                                        type="text"
                                        id="location"
                                        className="form-input"
                                        placeholder="e.g. Zoom Link, Conference Room 4..."
                                        value={newAppt.location}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                    />
                                </div>

                                {isStaff && (
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="assigned_to">Assigned Employee</label>
                                        <select
                                            id="assigned_to"
                                            className="form-input"
                                            value={newAppt.assigned_to}
                                            onChange={handleInputChange}
                                            disabled={isSubmitting}
                                            style={{ appearance: 'none', background: 'var(--bg-primary)' }}
                                        >
                                            <option value="">Unassigned (Me)</option>
                                            {agents.map((ag) => (
                                                <option key={ag.id} value={ag.id}>{ag.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="notes">Meeting Context Notes</label>
                                <textarea
                                    id="notes"
                                    className="form-input"
                                    placeholder="Enter background notes, agendas..."
                                    style={{ height: '60px', resize: 'vertical' }}
                                    value={newAppt.notes}
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
                                    {isSubmitting ? 'Scheduling...' : 'Schedule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Appointment Detail Drawer/Modal */}
            {showDetailModal && selectedAppt && (
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
                    <div className="glass-card" style={{ width: '100%', maxWidth: '640px', padding: '32px', overflowY: 'auto', maxHeight: '90vh' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3>Meeting Detail View</h3>
                            <button 
                                onClick={() => setShowDetailModal(false)}
                                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px', alignItems: 'start' }}>
                            {/* Left panel: Info */}
                            <div>
                                <h4 style={{ color: 'var(--accent-secondary)', marginBottom: '8px' }}>{selectedAppt.purpose}</h4>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                                    🏢 Client: <strong>{selectedAppt.customer_details?.company_name || selectedAppt.customer_details?.name}</strong>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                                    <div>
                                        <span style={{ color: 'var(--text-secondary)' }}>Status: </span>
                                        <span className={`badge ${getStatusBadgeClass(selectedAppt.status)}`}>{selectedAppt.status}</span>
                                    </div>
                                    <div>
                                        <span style={{ color: 'var(--text-secondary)' }}>Date: </span>
                                        <strong>📅 {selectedAppt.date}</strong>
                                    </div>
                                    <div>
                                        <span style={{ color: 'var(--text-secondary)' }}>Time: </span>
                                        <strong>⏰ {selectedAppt.time.substring(0,5)}</strong>
                                    </div>
                                    <div>
                                        <span style={{ color: 'var(--text-secondary)' }}>Location: </span>
                                        <strong>📍 {selectedAppt.location || 'Online'}</strong>
                                    </div>
                                    <div>
                                        <span style={{ color: 'var(--text-secondary)' }}>Assigned: </span>
                                        <strong>👤 {selectedAppt.assigned_to_details ? selectedAppt.assigned_to_details.name : 'Unassigned'}</strong>
                                    </div>
                                </div>

                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    <span style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Meeting Agenda Notes:</span>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '6px', minHeight: '40px' }}>
                                        {selectedAppt.notes || <span style={{ color: 'var(--text-muted)' }}>No additional notes.</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Right panel: Controls & History */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {isStaff ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px' }}>
                                        <h5 style={{ color: 'var(--accent-primary)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Update Appointment</h5>
                                        
                                        <div className="form-group" style={{ marginBottom: '8px' }}>
                                            <label className="form-label" style={{ fontSize: '10px' }} htmlFor="det-status">Status</label>
                                            <select
                                                id="det-status"
                                                className="form-input"
                                                value={selectedAppt.status}
                                                onChange={(e) => handleDetailPatch('status', e.target.value, setUpdatingStatus)}
                                                disabled={updatingStatus}
                                                style={{ height: '32px', fontSize: '12.5px', padding: '0 8px' }}
                                            >
                                                <option value="Scheduled">Scheduled</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Cancelled">Cancelled</option>
                                                <option value="No Show">No Show</option>
                                            </select>
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '8px' }}>
                                            <label className="form-label" style={{ fontSize: '10px' }} htmlFor="det-assigned">Agent</label>
                                            <select
                                                id="det-assigned"
                                                className="form-input"
                                                value={selectedAppt.assigned_to || ''}
                                                onChange={(e) => handleDetailPatch('assigned_to', e.target.value ? parseInt(e.target.value) : null, setUpdatingAgent)}
                                                disabled={updatingAgent}
                                                style={{ height: '32px', fontSize: '12.5px', padding: '0 8px' }}
                                            >
                                                <option value="">Unassigned</option>
                                                {agents.map((ag) => (
                                                    <option key={ag.id} value={ag.id}>{ag.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ) : (
                                    selectedAppt.status === 'Scheduled' && (
                                        <button 
                                            onClick={handleSelfCancel} 
                                            className="btn btn-danger" 
                                            style={{ width: '100%', height: '38px', fontSize: '13px' }}
                                            disabled={updatingStatus}
                                        >
                                            ❌ Cancel Appointment
                                        </button>
                                    )
                                )}

                                {/* Timeline logs */}
                                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: '12px', fontSize: '12px' }}>
                                    <h5 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', fontSize: '10px' }}>Reschedule History</h5>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                                        {history.length === 0 ? (
                                            <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>No timeline adjustments logged.</div>
                                        ) : (
                                            history.map((h) => (
                                                <div key={h.id}>
                                                    <div style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{h.status_from} ➔ {h.status_to}</div>
                                                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{h.notes}</div>
                                                    <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{new Date(h.changed_at).toLocaleString()}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '16px', marginTop: '28px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
                            <button 
                                onClick={() => setShowDetailModal(false)}
                                className="btn btn-secondary" 
                                style={{ flex: 1 }}
                            >
                                Close View
                            </button>
                            {isStaff && (
                                <button 
                                    onClick={() => handleDeleteAppointment(selectedAppt.id)}
                                    className="btn btn-danger" 
                                    style={{ flex: 1 }}
                                >
                                    Delete Schedule
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppointmentsManager;
