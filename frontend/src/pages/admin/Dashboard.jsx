import { useState, useEffect } from 'react';
import { 
  UsersIcon, 
  MapIcon, 
  ExclamationTriangleIcon, 
  BanknotesIcon 
} from '@heroicons/react/24/outline';
import api from '../../../api/axios';

export default function PlatformDashboard() {
  const [stats, setStats] = useState({
    total_users: 0,
    total_itineraries: 0,
    total_bookings: 0,
    active_trips: 0,
    total_disruptions: 0,
    total_tours: 0,
    total_properties: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/platform/overview');
        setStats(res.data.data);
      } catch (err) {
        console.error("Failed to fetch platform overview", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { name: 'Total Users', value: stats.total_users, icon: UsersIcon, color: 'bg-blue-500' },
    { name: 'Active Trips', value: stats.active_trips, icon: MapIcon, color: 'bg-emerald-500' },
    { name: 'Total Bookings', value: stats.total_bookings, icon: BanknotesIcon, color: 'bg-purple-500' },
    { name: 'Disruptions', value: stats.total_disruptions, icon: ExclamationTriangleIcon, color: 'bg-red-500' },
  ];

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 w-64 bg-gray-200 rounded"></div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>)}
      </div>
    </div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Platform Overview</h1>
      
      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {cards.map((item) => (
          <div key={item.name} className="bg-white overflow-hidden shadow rounded-lg block">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <item.icon className={`h-8 w-8 text-white p-1.5 rounded-md ${item.color}`} aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                    <dd>
                      <div className="text-2xl font-semibold text-gray-900">{item.value}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Additional breakdown block */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Inventory Breakdown</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-4">
              <span className="text-gray-600">Hotel Properties</span>
              <span className="font-semibold text-xl">{stats.total_properties}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-4">
              <span className="text-gray-600">Tours & Activities</span>
              <span className="font-semibold text-xl">{stats.total_tours}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Itineraries Created</span>
              <span className="font-semibold text-xl">{stats.total_itineraries}</span>
            </div>
          </div>
        </div>

        {/* Placeholder for future charting or feed */}
        <div className="bg-white shadow rounded-lg p-6 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <ChartBarIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>Advanced metrics visualization coming soon.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Added extra missing icon for the placeholder
import { ChartBarIcon } from '@heroicons/react/24/outline';
