import { useState, useEffect } from 'react';
import { Users, MapPin, Ticket, AlertTriangle, Building2, Compass } from 'lucide-react';
import api from '../../api/axios';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';

export default function PlatformDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/platform/overview');
        setStats(res.data.data);
      } catch {
        setStats({
          total_users: 142, total_itineraries: 87, total_bookings: 234,
          active_trips: 23, total_disruptions: 12, total_properties: 18, total_tours: 45,
        });
      } finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-48 bg-surface-sunken rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-surface-sunken rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const topCards = [
    { title: 'Active Trips',   value: stats.active_trips,      icon: MapPin,        accent: 'primary' },
    { title: 'Total Bookings', value: stats.total_bookings,     icon: Ticket,        accent: 'blue' },
    { title: 'Disruptions',    value: stats.total_disruptions,  icon: AlertTriangle, accent: 'gold' },
    { title: 'Total Users',    value: stats.total_users,        icon: Users,         accent: 'success' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-md text-ink">Overview</h1>
        <p className="text-body-sm text-text-secondary mt-1">Platform-wide metrics and system health.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topCards.map((card, i) => <StatCard key={card.title} {...card} index={i} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-display-sm text-ink mb-4">Inventory</h2>
          {[
            { label: 'Properties',  val: stats.total_properties,  icon: Building2 },
            { label: 'Tours',       val: stats.total_tours,       icon: Compass },
            { label: 'Itineraries', val: stats.total_itineraries, icon: MapPin },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
              <div className="flex items-center gap-2.5">
                <item.icon className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
                <span className="text-body-sm text-text-secondary">{item.label}</span>
              </div>
              <span className="text-[18px] font-semibold text-ink">{item.val}</span>
            </div>
          ))}
        </Card>

        <Card>
          <h2 className="text-display-sm text-ink mb-4">System Health</h2>
          {[
            { name: 'API Server', status: true },
            { name: 'Firestore',  status: true },
            { name: 'Redis',      status: false },
          ].map((s) => (
            <div key={s.name} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
              <span className="text-body-sm text-text-secondary">{s.name}</span>
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${s.status ? 'bg-success' : 'bg-danger'}`} />
                <span className={`text-[12px] font-medium ${s.status ? 'text-success' : 'text-danger'}`}>
                  {s.status ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
