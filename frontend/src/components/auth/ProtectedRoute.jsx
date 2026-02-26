import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function getRoleDashboard(role) {
  switch (role) {
    case 'BUSINESS':
      return '/business/dashboard';
    case 'HOTEL_ADMIN':
      return '/hotel/dashboard';
    case 'TOUR_OPERATOR':
      return '/operator/dashboard';
    case 'PLATFORM_ADMIN':
      return '/admin/dashboard';
    default:
      return '/traveler/dashboard';
  }
}

export default function ProtectedRoute({ allowedRoles }) {
  const { currentUser, userRole } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    return <Navigate to={getRoleDashboard(userRole)} replace />;
  }

  return <Outlet />;
}
