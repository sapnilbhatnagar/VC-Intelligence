import { Navigate, useSearchParams } from 'react-router-dom';

// ============================================================
// /auth — kept as a route for old links and the sign-out flow,
// but the sign-in window now lives on the landing page itself.
// ?mode=register opens the create-account tab.
// ============================================================
export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'register' ? 'register' : 'signin';
  return <Navigate to={`/?auth=${mode}`} replace />;
}
