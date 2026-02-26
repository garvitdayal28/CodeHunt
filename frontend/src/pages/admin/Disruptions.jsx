import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import api from '../../../api/axios';
import { useSSE } from '../../../hooks/useSSE';
import { ArrowDownTrayIcon, SignalIcon } from '@heroicons/react/24/outline';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function PlatformDisruptions() {
  const [disruptions, setDisruptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { events: liveEvents, connected } = useSSE('/events/stream');

  useEffect(() => {
    const fetchDisruptions = async () => {
      try {
        const res = await api.get('/platform/disruptions');
        setDisruptions(res.data.data);
      } catch (err) {
        console.error("Failed to fetch disruptions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDisruptions();
  }, []);

  const handleExport = async () => {
    try {
      const res = await api.get('/platform/export?type=disruptions', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'disruptions.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error("Failed to export disruptions", err);
    }
  };

  // Process data for charts
  const typeData = disruptions.reduce((acc, curr) => {
    const type = curr.disruption_type || 'UNKNOWN';
    const existing = acc.find(item => item.name === type);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: type, value: 1 });
    }
    return acc;
  }, []);

  const destinationData = disruptions.reduce((acc, curr) => {
    const dest = curr.destination || 'UNKNOWN';
    const existing = acc.find(item => item.name === dest);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: dest, value: 1 });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disruption Analytics</h1>
          <p className="mt-2 text-sm text-gray-700">Platform-wide overview of travel disruption events.</p>
        </div>
        <div className="mt-4 sm:flex-none flex items-center space-x-4">
          <button
            onClick={handleExport}
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400" />
            Export Data
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse h-64 bg-gray-200 rounded-lg"></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart 1: Disruptions by Type */}
          <div className="bg-white p-6 rounded-lg shadow ring-1 ring-black ring-opacity-5">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Disruptions by Type</h2>
            <div className="h-64">
              {typeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
              )}
            </div>
          </div>

          {/* Chart 2: Disruptions by Destination */}
          <div className="bg-white p-6 rounded-lg shadow ring-1 ring-black ring-opacity-5">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Disruptions by Destination</h2>
            <div className="h-64">
              {destinationData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={destinationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Event Feed */}
      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <SignalIcon className={`h-5 w-5 mr-2 ${connected ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
            Live Event Feed
          </h2>
          <span className="text-xs text-gray-500">{connected ? 'Connected to SSE Stream' : 'Disconnected (Redis unavailable)'}</span>
        </div>
        <div className="p-6">
          {liveEvents.length === 0 ? (
            <div className="text-center text-gray-500 py-8">Waiting for real-time events...</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {liveEvents.map((event, idx) => (
                <li key={idx} className="py-4 flex">
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {event.event_type}
                    </p>
                    <p className="text-sm text-gray-500">
                      {JSON.stringify(event, null, 2)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
