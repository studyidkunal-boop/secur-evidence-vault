import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import InspectorDashboard from './pages/InspectorDashboard';
import DcpDashboard from './pages/DcpDashboard';
import JudgeDashboard from './pages/JudgeDashboard';
import EvidenceDetail from './pages/EvidenceDetail';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';

/**
 * Root redirection router: sends authenticated user to their role-specific landing page
 */
function RoleRedirect() {
  const { user, loading, getRoleHomePath } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-mono text-slate-400">AUTHENTICATING SECURA VAULT SESSION...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getRoleHomePath(user.role)} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* Public Entry Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/" element={<RoleRedirect />} />

            {/* ROLE 1: INSPECTOR ROUTES */}
            <Route
              path="/inspector"
              element={<Navigate to="/inspector/evidence" replace />}
            />
            <Route
              path="/inspector/evidence"
              element={
                <ProtectedRoute allowedRoles={['INSPECTOR']}>
                  <InspectorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspector/ingest"
              element={
                <ProtectedRoute allowedRoles={['INSPECTOR']}>
                  <InspectorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspector/activity"
              element={
                <ProtectedRoute allowedRoles={['INSPECTOR']}>
                  <InspectorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspector/*"
              element={
                <ProtectedRoute allowedRoles={['INSPECTOR']}>
                  <InspectorDashboard />
                </ProtectedRoute>
              }
            />

            {/* ROLE 2: DCP ROUTES */}
            <Route
              path="/dcp"
              element={<Navigate to="/dcp/review-queue" replace />}
            />
            <Route
              path="/dcp/review-queue"
              element={
                <ProtectedRoute allowedRoles={['DCP']}>
                  <DcpDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dcp/all-evidence"
              element={
                <ProtectedRoute allowedRoles={['DCP']}>
                  <DcpDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dcp/audit"
              element={
                <ProtectedRoute allowedRoles={['DCP']}>
                  <DcpDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dcp/verify-chain"
              element={
                <ProtectedRoute allowedRoles={['DCP']}>
                  <DcpDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dcp/*"
              element={
                <ProtectedRoute allowedRoles={['DCP']}>
                  <DcpDashboard />
                </ProtectedRoute>
              }
            />

            {/* ROLE 3: JUDGE ROUTES */}
            <Route
              path="/judge"
              element={<Navigate to="/judge/exhibits" replace />}
            />
            <Route
              path="/judge/exhibits"
              element={
                <ProtectedRoute allowedRoles={['JUDGE']}>
                  <JudgeDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/judge/verify-external"
              element={
                <ProtectedRoute allowedRoles={['JUDGE']}>
                  <JudgeDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/judge/custody-trail"
              element={
                <ProtectedRoute allowedRoles={['JUDGE']}>
                  <JudgeDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/judge/*"
              element={
                <ProtectedRoute allowedRoles={['JUDGE']}>
                  <JudgeDashboard />
                </ProtectedRoute>
              }
            />

            {/* SHARED PROTECTED ROUTE: Evidence Detail & Forensics */}
            <Route
              path="/evidence/:id"
              element={
                <ProtectedRoute allowedRoles={['INSPECTOR', 'DCP', 'JUDGE']}>
                  <EvidenceDetail />
                </ProtectedRoute>
              }
            />

            {/* Global fallback route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
