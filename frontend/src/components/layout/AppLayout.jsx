import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Building2,
  Calendar,
  ChevronDown,
  LayoutDashboard,
  Car,
  Star,
  LogOut,
  MapPin,
  Search,
  Settings,
  UserCircle2,
  ShieldCheck,
  Sparkles,
  Ticket,
  UtensilsCrossed,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';

const roleNavigation = {
  TRAVELER: [
    { name: 'Dashboard', href: '/traveler/dashboard', icon: LayoutDashboard },
    { name: 'My Trips', href: '/traveler/itineraries', icon: MapPin },
    { name: 'Hotels', href: '/traveler/hotels', icon: Search, aliases: ['/traveler/search/hotels', '/traveler/hotel/'] },
    { name: 'Tours & Activities', href: '/traveler/search/tours', icon: Ticket, aliases: ['/traveler/tours/'] },
    { name: 'Restaurants', href: '/traveler/restaurants', icon: UtensilsCrossed },
    { name: 'My Bookings', href: '/traveler/bookings', icon: Calendar },
    { name: 'Cab', href: '/traveler/cabs', icon: Car },
    { name: 'AI Planner', href: '/traveler/ai-planner', icon: Sparkles },
  ],
  BUSINESS: [
    { name: 'Dashboard', href: '/business/dashboard', icon: LayoutDashboard },
    { name: 'Room Management', href: '/business/rooms', icon: Building2, hotelOnly: true },
    { name: 'Menu', href: '/business/menu', icon: UtensilsCrossed, restaurantOnly: true },
    { name: 'Manage Services', href: '/business/services', icon: MapPin, guideOnly: true },
    { name: 'Bookings', href: '/business/bookings', icon: Calendar, guideOnly: true },
    { name: 'Rides', href: '/business/rides', icon: Car, cabOnly: true },
    { name: 'Ratings', href: '/business/ratings', icon: Star, cabOnly: true },
  ],
  HOTEL_ADMIN: [
    { name: 'Dashboard', href: '/hotel/dashboard', icon: LayoutDashboard },
    { name: 'Bookings', href: '/hotel/bookings', icon: Calendar },
    { name: 'Room Management', href: '/hotel/rooms', icon: Building2 },
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
    if (item.cabOnly) return userRole === 'BUSINESS' && businessType === 'CAB_DRIVER';
    if (item.hotelOnly) return userRole === 'BUSINESS' && businessType === 'HOTEL';
    if (item.restaurantOnly) return userRole === 'BUSINESS' && businessType === 'RESTAURANT';
    if (item.guideOnly) return userRole === 'BUSINESS' && businessType === 'TOURIST_GUIDE_SERVICE';
    return true;
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
          <Link to="/" className="flex items-center gap-2 mr-10 shrink-0">
            <img src="/Logo-removedbg.png" alt="TripAllied" className="h-8 w-8 object-contain" />
            <span className="text-[17px] font-semibold text-ink tracking-tight">TripAllied</span>
          </Link>

          <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto no-scrollbar">
            {navigation.map((item) => {
              const isActive = [item.href, ...(item.aliases || [])].some((path) => location.pathname.startsWith(path));
              return (
                <Link
                  key={`${item.name}-${item.href}`}
                  to={item.href}
                  className={`
                    flex items-center gap-1.5 px-2 py-1.5 rounded-lg
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
              className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full border border-border hover:bg-surface-sunken transition-colors cursor-pointer"
            >
              <div className="h-7 w-7 rounded-full bg-linear-to-tr from-primary to-accent flex items-center justify-center text-[11px] font-semibold text-white shadow-sm ring-1 ring-white/20">
                {currentUser?.email?.[0]?.toUpperCase() || '?'}
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-text-muted mr-1" strokeWidth={2} />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-border shadow-lg z-20 py-1 animate-slide-in">
                  <div className="px-3 py-2 border-b border-border bg-surface-sunken/30">
                    <p className="text-[12px] font-semibold text-ink truncate">
                      {currentUser?.displayName || currentUser?.email?.split('@')[0]}
                    </p>
                    <p className="text-[11px] text-text-secondary truncate">{currentUser?.email}</p>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold tracking-wider uppercase">
                        {userRole?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="py-1">
                    <Link
                      to={userRole === 'TRAVELER' ? '/traveler/profile' : '#'}
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-text-secondary hover:text-ink hover:bg-surface-sunken transition-colors"
                    >
                      <UserCircle2 className="h-4 w-4" strokeWidth={1.75} />
                      My Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3 py-2 text-[13px] font-medium text-text-secondary hover:text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" strokeWidth={1.75} />
                      Sign out
                    </button>
                  </div>
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
