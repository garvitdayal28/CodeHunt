import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Building2,
  ChevronDown,
  LayoutDashboard,
  Car,
  LogOut,
  MapPin,
  Search,
  Settings,
  UserCircle2,
  ShieldCheck,
  Sparkles,
  Ticket,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';

const roleNavigation = {
  TRAVELER: [
    { name: 'Dashboard', href: '/traveler/dashboard', icon: LayoutDashboard },
    { name: 'My Trips', href: '/traveler/itineraries', icon: MapPin },
    { name: 'Cab', href: '/traveler/cabs', icon: Car },
    { name: 'Profile', href: '/traveler/profile', icon: UserCircle2 },
    { name: 'Search', href: '/traveler/search', icon: Search },
    { name: 'AI Planner', href: '/traveler/ai-planner', icon: Sparkles },
  ],
  BUSINESS: [
    { name: 'Dashboard', href: '/business/dashboard', icon: LayoutDashboard },
    { name: 'Rides', href: '/business/rides', icon: Car, cabOnly: true },
  ],
  HOTEL_ADMIN: [
    { name: 'Dashboard', href: '/hotel/dashboard', icon: LayoutDashboard },
    { name: 'Bookings', href: '/hotel/bookings', icon: Ticket },
    { name: 'Rooms', href: '/hotel/inventory', icon: Building2 },
    { name: 'Alerts', href: '/hotel/alerts', icon: Bell },
  ],
  TOUR_OPERATOR: [
    { name: 'Dashboard', href: '/operator/dashboard', icon: LayoutDashboard },
    { name: 'My Tours', href: '/operator/tours', icon: MapPin },
    { name: 'Bookings', href: '/operator/activities', icon: Ticket },
    { name: 'Alerts', href: '/operator/alerts', icon: Bell },
  ],
  PLATFORM_ADMIN: [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Disruptions', href: '/admin/disruptions', icon: AlertTriangle },
    { name: 'Audit Log', href: '/admin/audit', icon: ShieldCheck },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ],
};

export default function AppLayout() {
  const { currentUser, userRole, businessType, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navigation = (roleNavigation[userRole] || []).filter((item) => {
    if (!item.cabOnly) return true;
    return userRole === 'BUSINESS' && businessType === 'CAB_DRIVER';
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-50 bg-white border-b border-border shadow-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-14">
          <Link to="/" className="flex items-center gap-2 mr-8 shrink-0">
            <img src="/Logo-removedbg.png" alt="TripAllied" className="h-8 w-8 object-contain" />
            <span className="text-[17px] font-semibold text-ink tracking-tight">TripAllied</span>
          </Link>

          <nav className="flex items-center gap-1 flex-1">
            {navigation.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={`${item.name}-${item.href}`}
                  to={item.href}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                    text-[13px] font-medium transition-colors duration-100
                    ${isActive
                      ? 'bg-primary-soft text-primary'
                      : 'text-text-secondary hover:text-ink hover:bg-surface-sunken'
                    }
                  `}
                >
                  <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="relative ml-4">
            <button
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-sunken transition-colors cursor-pointer"
            >
              <div className="h-7 w-7 rounded-full bg-gradient-accent flex items-center justify-center text-[11px] font-semibold text-white">
                {currentUser?.email?.[0]?.toUpperCase() || '?'}
              </div>
              <span className="text-[13px] font-medium text-ink hidden sm:block">
                {currentUser?.displayName || currentUser?.email?.split('@')[0]}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-text-muted" strokeWidth={2} />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-border shadow-lg z-20 py-1 animate-slide-in">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-[13px] font-medium text-ink truncate">{currentUser?.email}</p>
                    <p className="text-[11px] text-text-muted">{userRole?.replace(/_/g, ' ')}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-3 py-2 text-[13px] font-medium text-text-secondary hover:text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" strokeWidth={1.75} />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
