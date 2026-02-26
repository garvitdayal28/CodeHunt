import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import AuditLog from './pages/admin/AuditLog';
import PlatformDashboard from './pages/admin/Dashboard';
import PlatformDisruptions from './pages/admin/Disruptions';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import BusinessDashboard from './pages/business/Dashboard';
import MenuManagement from './pages/business/MenuManagement';
import BusinessRides from './pages/business/Rides';
import BusinessRatings from './pages/business/Ratings';
import HotelDashboard from './pages/hotel/Dashboard';
import RoomManagement from './pages/hotel/RoomManagement';
import BookingConfirmation from './pages/traveler/BookingConfirmation';
import CabRides from './pages/traveler/CabRides';
import CreateItinerary from './pages/traveler/CreateItinerary';
import TravelerDashboard from './pages/traveler/Dashboard';
import HotelDetail from './pages/traveler/HotelDetail';
import HotelSearch from './pages/traveler/HotelSearch';
import ItineraryDetail from './pages/traveler/ItineraryDetail';
import MyTrips from './pages/traveler/MyTrips';
import TravelerProfile from './pages/traveler/Profile';
import TourSearch from './pages/traveler/TourSearch';
import AITripPlanner from './pages/traveler/AITripPlanner';

const OperatorDashboard = () => (
  <div className="p-6">
    <h1 className="text-display-md">Tour Operator Dashboard</h1>
    <p className="text-text-secondary mt-1">Tour and activity management.</p>
  </div>
);

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

function AuthRedirect() {
  const { currentUser, userRole } = useAuth();
  if (currentUser) return <Navigate to={getRoleDashboard(userRole)} replace />;
  return <Navigate to="/login" replace />;
}

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
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
          <Route path="/" element={<AuthRedirect />} />

          <Route element={<AppLayout />}>
            <Route element={<ProtectedRoute allowedRoles={['TRAVELER']} />}>
              <Route path="/traveler/dashboard" element={<TravelerDashboard />} />
              <Route path="/traveler/itineraries" element={<MyTrips />} />
              <Route path="/traveler/itineraries/new" element={<CreateItinerary />} />
              <Route path="/traveler/itineraries/:id" element={<ItineraryDetail />} />
              <Route path="/traveler/hotels" element={<HotelSearch />} />
              <Route path="/traveler/hotels/:id" element={<HotelDetail />} />
              <Route path="/traveler/search" element={<HotelSearch />} />
              <Route path="/traveler/search/hotels" element={<HotelSearch />} />
              <Route path="/traveler/hotel/:id" element={<HotelDetail />} />
              <Route path="/traveler/booking/confirm" element={<BookingConfirmation />} />
              <Route path="/traveler/search/tours" element={<TourSearch />} />
              <Route path="/traveler/ai-planner" element={<AITripPlanner />} />
              <Route path="/traveler/cabs" element={<CabRides />} />
              <Route path="/traveler/profile" element={<TravelerProfile />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['BUSINESS']} />}>
              <Route path="/business/dashboard" element={<BusinessDashboard />} />
              <Route path="/business/rooms" element={<RoomManagement />} />
              <Route path="/business/menu" element={<MenuManagement />} />
              <Route path="/business/rides" element={<BusinessRides />} />
              <Route path="/business/ratings" element={<BusinessRatings />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['HOTEL_ADMIN', 'PLATFORM_ADMIN']} />}>
              <Route path="/hotel/dashboard" element={<HotelDashboard />} />
              <Route path="/hotel/rooms" element={<RoomManagement />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['TOUR_OPERATOR', 'PLATFORM_ADMIN']} />}>
              <Route path="/operator/dashboard" element={<OperatorDashboard />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['PLATFORM_ADMIN']} />}>
              <Route path="/admin/dashboard" element={<PlatformDashboard />} />
              <Route path="/admin/audit" element={<AuditLog />} />
              <Route path="/admin/disruptions" element={<PlatformDisruptions />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
