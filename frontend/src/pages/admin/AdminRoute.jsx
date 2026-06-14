// Guard: redirects to /admin/login (or /support/login for support members) if no valid adminToken
import { Navigate } from 'react-router-dom';

export default function AdminRoute({ children }) {
  const token = localStorage.getItem('adminToken');
  const role  = localStorage.getItem('adminRole');
  if (!token) {
    const loginPath = role === 'support' ? '/support/login' : '/admin/login';
    return <Navigate to={loginPath} replace />;
  }
  return children;
}
