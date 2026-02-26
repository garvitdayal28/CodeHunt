// Update App.jsx with real imports
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Platform Admin Pages
import PlatformDashboard from './pages/admin/Dashboard';
import AuditLog from './pages/admin/AuditLog';
import PlatformDisruptions from './pages/admin/Disruptions';

// Temporary placeholder dashboards for other roles
const TravelerDashboard = () => <div className="p-4"><h1 className="text-2xl font-bold">Traveler Dashboard</h1><p>Welcome to CodeHunt Trips!</p></div>;
const HotelDashboard = () => <div className="p-4"><h1 className="text-2xl font-bold">Hotel Admin Dashboard</h1><p>Property management overview.</p></div>;
const OperatorDashboard = () => <div className="p-4"><h1 className="text-2xl font-bold">Tour Operator Dashboard</h1><p>Tour and activity management.</p></div>;

// Route wrapper that redirects authenticated users to their specific dashboard
function AuthRedirect() {
  const { currentUser, userRole, loading } = useAuth();
  
  if (currentUser) {
    if (userRole === 'TRAVELER') return <Navigate to="/traveler/dashboard" replace />;
    if (userRole === 'HOTEL_ADMIN') return <Navigate to="/hotel/dashboard" replace />;
    if (userRole === 'TOUR_OPERATOR') return <Navigate to="/operator/dashboard" replace />;
    if (userRole === 'PLATFORM_ADMIN') return <Navigate to="/admin/dashboard" replace />;
  }
  
  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Index route redirects based on role */}
          <Route path="/" element={<AuthRedirect />} />

          {/* Protected routes wrapped in the AppLayout shell */}
          <Route element={<AppLayout />}>
            
            {/* Traveler Routes */}
            <Route element={<ProtectedRoute allowedRoles={['TRAVELER']} />}>
              <Route path="/traveler/dashboard" element={<TravelerDashboard />} />
              {/* Add more traveler routes here */}
            </Route>

            {/* Hotel Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['HOTEL_ADMIN', 'PLATFORM_ADMIN']} />}>
              <Route path="/hotel/dashboard" element={<HotelDashboard />} />
              {/* Add more hotel routes here */}
            </Route>

            {/* Tour Operator Routes */}
            <Route element={<ProtectedRoute allowedRoles={['TOUR_OPERATOR', 'PLATFORM_ADMIN']} />}>
              <Route path="/operator/dashboard" element={<OperatorDashboard />} />
              {/* Add more operator routes here */}
            </Route>

            {/* Platform Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['PLATFORM_ADMIN']} />}>
              <Route path="/admin/dashboard" element={<PlatformDashboard />} />
              <Route path="/admin/audit" element={<AuditLog />} />
              <Route path="/admin/disruptions" element={<PlatformDisruptions />} />
            </Route>

          </Route>
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;