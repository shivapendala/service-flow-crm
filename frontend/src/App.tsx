import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import CustomersList from './pages/CustomersList';
import CustomerDetail from './pages/CustomerDetail';
import LeadsList from './pages/LeadsList';
import LeadDetail from './pages/LeadDetail';
import PipelineBoard from './pages/PipelineBoard';
import TicketsList from './pages/TicketsList';
import TicketDetail from './pages/TicketDetail';
import ServiceRequestsList from './pages/ServiceRequestsList';
import ServiceRequestDetail from './pages/ServiceRequestDetail';
import TasksManager from './pages/TasksManager';
import AppointmentsManager from './pages/AppointmentsManager';
import CommunicationsManager from './pages/CommunicationsManager';

// Helper component to redirect authenticated users away from auth pages (Login, Register, etc.)
const PublicOnlyRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div style={{
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)'
            }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

function AppContent() {
    return (
        <Router>
            <Routes>
                {/* Public Marketing Landing Page */}
                <Route path="/" element={<Landing />} />

                {/* Auth Pages (Public only) */}
                <Route 
                    path="/login" 
                    element={
                        <PublicOnlyRoute>
                            <Login />
                        </PublicOnlyRoute>
                    } 
                />
                <Route 
                    path="/register" 
                    element={
                        <PublicOnlyRoute>
                            <Register />
                        </PublicOnlyRoute>
                    } 
                />
                <Route 
                    path="/forgot-password" 
                    element={
                        <PublicOnlyRoute>
                            <ForgotPassword />
                        </PublicOnlyRoute>
                    } 
                />
                <Route 
                    path="/reset-password" 
                    element={
                        <PublicOnlyRoute>
                            <ResetPassword />
                        </PublicOnlyRoute>
                    } 
                />

                {/* Protected App Pages */}
                <Route 
                    path="/dashboard" 
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/profile" 
                    element={
                        <ProtectedRoute>
                            <Profile />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/customers" 
                    element={
                        <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Support Agent', 'Sales Agent']}>
                            <CustomersList />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/customers/:id" 
                    element={
                        <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Support Agent', 'Sales Agent']}>
                            <CustomerDetail />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/leads" 
                    element={
                        <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Support Agent', 'Sales Agent']}>
                            <LeadsList />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/leads/:id" 
                    element={
                        <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Support Agent', 'Sales Agent']}>
                            <LeadDetail />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/pipeline" 
                    element={
                        <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Support Agent', 'Sales Agent']}>
                            <PipelineBoard />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/tickets" 
                    element={
                        <ProtectedRoute>
                            <TicketsList />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/tickets/:id" 
                    element={
                        <ProtectedRoute>
                            <TicketDetail />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/service-requests" 
                    element={
                        <ProtectedRoute>
                            <ServiceRequestsList />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/service-requests/:id" 
                    element={
                        <ProtectedRoute>
                            <ServiceRequestDetail />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/tasks" 
                    element={
                        <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Support Agent', 'Sales Agent']}>
                            <TasksManager />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/appointments" 
                    element={
                        <ProtectedRoute>
                            <AppointmentsManager />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/communications" 
                    element={
                        <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Support Agent', 'Sales Agent']}>
                            <CommunicationsManager />
                        </ProtectedRoute>
                    } 
                />

                {/* Catch-all fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;
