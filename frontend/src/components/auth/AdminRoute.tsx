import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

// ============================================================
// AdminRoute — allows only authenticated users with role=admin
// Any other user is redirected to the dashboard root.
// ============================================================
interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
