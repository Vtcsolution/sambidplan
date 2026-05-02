// frontend/src/components/admin/AdminRoute.jsx
import { Navigate } from 'react-router-dom';

export default function AdminRoute({ children }) {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  const userRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
  
  console.log('AdminRoute check:', { token: !!token, userRole });
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  if (userRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}