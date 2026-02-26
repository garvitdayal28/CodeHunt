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

// Traveler Pages
import TravelerDashboard from './pages/traveler/Dashboard';
import MyTrips from './pages/traveler/MyTrips';
import CreateItinerary from './pages/traveler/CreateItinerary';
import HotelSearch from './pages/traveler/HotelSearch';
import TourSearch from './pages/traveler/TourSearch';
import ItineraryDetail from './pages/traveler/ItineraryDetail';
import HotelDetail from './pages/traveler/HotelDetail';
import BookingConfirmation from './pages/traveler/BookingConfirmation';

import AITripPlanner from './pages/traveler/AITripPlanner';

// Placeholder dashboards for other roles
const HotelDashboard = () => <div className="p-6"><h1 className="text-display-md">Hotel Admin Dashboard</h1><p className="text-text-secondary mt-1">Property management overview.</p></div>;
const OperatorDashboard = () => <div className="p-6"><h1 className="text-display-md">Tour Operator Dashboard</h1><p className="text-text-secondary mt-1">Tour and activity management.</p></div>;

// Redirects to the correct dashboard based on user role
function getRoleDashboard(role) {
  switch (role) {
    case 'HOTEL_ADMIN':     return '/hotel/dashboard';
    case 'TOUR_OPERATOR':   return '/operator/dashboard';
    case 'PLATFORM_ADMIN':  return '/admin/dashboard';
    default:                return '/traveler/dashboard';
  }
}

// Redirect / to the correct dashboard or login
function AuthRedirect() {
  const { currentUser, userRole } = useAuth();
  if (currentUser) return <Navigate to={getRoleDashboard(userRole)} replace />;
  return <Navigate to="/login" replace />;
}

// Redirect logged-in users away from login/register pages
function PublicOnlyRoute({ children }) {
  const { currentUser, userRole } = useAuth();
  if (currentUser) return <Navigate to={getRoleDashboard(userRole)} replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
          
          {/* Index route redirects based on role */}
          <Route path="/" element={<AuthRedirect />} />

          {/* Protected routes wrapped in the AppLayout shell */}
          <Route element={<AppLayout />}>
            
            {/* Traveler Routes */}
            <Route element={<ProtectedRoute allowedRoles={['TRAVELER']} />}>
              <Route path="/traveler/dashboard" element={<TravelerDashboard />} />
              <Route path="/traveler/itineraries" element={<MyTrips />} />
              <Route path="/traveler/itineraries/new" element={<CreateItinerary />} />
              <Route path="/traveler/itineraries/:id" element={<ItineraryDetail />} />
              <Route path="/traveler/search" element={<HotelSearch />} />
              <Route path="/traveler/search/hotels" element={<HotelSearch />} />
              <Route path="/traveler/hotel/:id" element={<HotelDetail />} />
              <Route path="/traveler/booking/confirm" element={<BookingConfirmation />} />
              <Route path="/traveler/search/tours" element={<TourSearch />} />
              <Route path="/traveler/ai-planner" element={<AITripPlanner />} />
            </Route>

            {/* Hotel Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['HOTEL_ADMIN', 'PLATFORM_ADMIN']} />}>
              <Route path="/hotel/dashboard" element={<HotelDashboard />} />
            </Route>

            {/* Tour Operator Routes */}
            <Route element={<ProtectedRoute allowedRoles={['TOUR_OPERATOR', 'PLATFORM_ADMIN']} />}>
              <Route path="/operator/dashboard" element={<OperatorDashboard />} />
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