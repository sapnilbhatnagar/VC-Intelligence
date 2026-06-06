import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';
import JobView from './pages/JobView';
import History from './pages/History';
import AuthPage from './pages/AuthPage';
import AdminDashboard from './pages/AdminDashboard';
import CreditsPage from './pages/CreditsPage';
import ProfilePage from './pages/ProfilePage';
import { useAuthStore } from './store/authStore';

// ============================================================
// Route configuration
//
// AuthPage and the public LandingPage render their own full-page
// layout — no AppLayout.
//
// Root "/" is public: logged-out visitors see the marketing
// LandingPage; logged-in users get the Dashboard inside AppLayout.
// All other routes are wrapped in AppLayout and protected.
// AdminRoute additionally requires role === 'admin'.
//
// /preview has been removed — preview is now embedded in
// JobView when jobId === 'new'.
// ============================================================
export default function App() {
  const token = useAuthStore((s) => s.token);

  return (
    <Routes>
      {/* ── Standalone auth page (no AppLayout) ────────────── */}
      <Route path="/auth" element={<AuthPage />} />

      {/* ── Root: public landing when logged out, dashboard when in ── */}
      <Route
        path="/"
        element={
          token ? (
            <AppLayout>
              <Dashboard />
            </AppLayout>
          ) : (
            <LandingPage />
          )
        }
      />

      {/* ── App shell with AppLayout (all other routes) ─────── */}
      <Route
        path="/*"
        element={
          <AppLayout>
            <Routes>
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
