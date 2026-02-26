import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  HomeIcon, 
  MapIcon, 
  BuildingOfficeIcon, 
  TicketIcon, 
  ChartBarIcon,
  ArrowLeftOnRectangleIcon 
} from '@heroicons/react/24/outline'; // Need to install @heroicons/react

export default function AppLayout() {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  // Define navigation items based on role
  let navigation = [];

  if (userRole === 'TRAVELER') {
    navigation = [
      { name: 'Dashboard', href: '/traveler/dashboard', icon: HomeIcon },
      { name: 'My Trips', href: '/traveler/itineraries', icon: MapIcon },
      { name: 'Search', href: '/traveler/search', icon: TicketIcon },
    ];
  } else if (userRole === 'HOTEL_ADMIN') {
    navigation = [
      { name: 'Dashboard', href: '/hotel/dashboard', icon: HomeIcon },
      { name: 'Bookings', href: '/hotel/bookings', icon: TicketIcon },
      { name: 'Inventory', href: '/hotel/inventory', icon: BuildingOfficeIcon },
    ];
  } else if (userRole === 'TOUR_OPERATOR') {
    navigation = [
      { name: 'Dashboard', href: '/operator/dashboard', icon: HomeIcon },
      { name: 'My Tours', href: '/operator/tours', icon: MapIcon },
      { name: 'Bookings', href: '/operator/activities', icon: TicketIcon },
    ];
  } else if (userRole === 'PLATFORM_ADMIN') {
    navigation = [
      { name: 'Dashboard', href: '/admin/dashboard', icon: ChartBarIcon },
      { name: 'Disruptions', href: '/admin/disruptions', icon: TicketIcon },
      { name: 'Audit Log', href: '/admin/audit', icon: MapIcon },
    ];
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <span className="text-xl font-bold text-blue-600">CodeHunt Trips</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-3 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <item.icon 
                    className={`mr-3 flex-shrink-0 h-5 w-5 ${
                      isActive ? 'text-blue-700' : 'text-gray-400'
                    }`} 
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center mb-4">
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{currentUser?.email}</p>
              <p className="text-xs font-medium text-gray-500 capitalize">{userRole?.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
          >
            <ArrowLeftOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400" />
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header could go here if needed */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
