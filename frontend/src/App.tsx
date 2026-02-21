import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import Dashboard from './pages/Dashboard';
import JobView from './pages/JobView';
import History from './pages/History';
import AuthPage from './pages/AuthPage';
import AdminDashboard from './pages/AdminDashboard';
import CreditsPage from './pages/CreditsPage';
import ProfilePage from './pages/ProfilePage';

// ============================================================
// Route configuration
//
// AuthPage renders its own full-page layout — no AppLayout.
// All other routes are wrapped in AppLayout.
// Protected routes redirect to /auth if not logged in.
// AdminRoute additionally requires role === 'admin'.
//
// /preview has been removed — preview is now embedded in
// JobView when jobId === 'new'.
// ============================================================
export default function App() {
  return (
    <Routes>
      {/* ── Standalone auth page (no AppLayout) ────────────── */}
      <Route path="/auth" element={<AuthPage />} />

      {/* ── App shell with AppLayout ────────────────────────── */}
      <Route
        path="/*"
        element={
          <AppLayout>
            <Routes>
              {/* Dashboard — requires auth */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Protected: requires auth */}
              <Route
                path="/job/:jobId"
                element={
                  <ProtectedRoute>
                    <JobView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <History />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/credits"
                element={
                  <ProtectedRoute>
                    <CreditsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* Admin only */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppLayout>
        }
      />
    </Routes>
  );
}
