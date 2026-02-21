import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

// ============================================================
// ProtectedRoute — redirects unauthenticated users to /auth
// Usage: wrap any route element that requires a login
// ============================================================
interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = useAuthStore((s) => s.token);

  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
