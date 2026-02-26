import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { currentUser, userRole } = useAuth();

  if (!currentUser) {
    // Not logged in, redirect to login page
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    // Logged in but doesn't have required role — redirect to their correct dashboard
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
