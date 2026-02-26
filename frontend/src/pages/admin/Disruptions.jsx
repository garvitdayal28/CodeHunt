import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Download, Radio } from 'lucide-react';
import api from '../../api/axios';
import { useSSE } from '../../hooks/useSSE';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import AlertCard from '../../components/ui/AlertCard';
import LiveIndicator from '../../components/ui/LiveIndicator';

const COLORS = ['#6366F1', '#3B82F6', '#F59E0B', '#EF4444', '#10B981'];

export default function PlatformDisruptions() {
  const [disruptions, setDisruptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { events: liveEvents, connected } = useSSE('/events/stream');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/platform/disruptions');
        setDisruptions(res.data.data);
      } catch {
        setDisruptions([
          { id: '1', disruption_type: 'FLIGHT_DELAY',     destination: 'Mumbai' },
          { id: '2', disruption_type: 'CANCELLATION',     destination: 'Delhi' },
          { id: '3', disruption_type: 'FLIGHT_DELAY',     destination: 'Mumbai' },
          { id: '4', disruption_type: 'EARLY_DEPARTURE',  destination: 'Goa' },
          { id: '5', disruption_type: 'FLIGHT_DELAY',     destination: 'Jaipur' },
        ]);
      } finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleExport = async () => {
    try {
      const res = await api.get('/platform/export?type=disruptions', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'disruptions.csv';
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { console.error(e); }
  };

  const typeData = disruptions.reduce((acc, c) => {
    const t = c.disruption_type || 'UNKNOWN';
    const e = acc.find(i => i.name === t);
    e ? e.value++ : acc.push({ name: t, value: 1 });
    return acc;
  }, []);

  const destData = disruptions.reduce((acc, c) => {
    const d = c.destination || 'Unknown';
    const e = acc.find(i => i.name === d);
    e ? e.count++ : acc.push({ name: d, count: 1 });
    return acc;
  }, []);

  const tooltipStyle = {
    backgroundColor: '#18181B', border: '1px solid #27272A',
    borderRadius: '8px', color: '#FAFAFA', fontSize: '12px',
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-md text-dark-text">Disruptions</h1>
          <p className="text-body-sm text-dark-text-secondary mt-1">Analytics and live event monitoring.</p>
        </div>
        <Button variant="secondary" size="sm" icon={Download} onClick={handleExport}>Export</Button>
      </div>

      {loading ? (
        <div className="h-64 bg-dark-card rounded-xl animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-dark-card! border-dark-border!">
            <h3 className="text-[14px] font-medium text-dark-text mb-4">By Type</h3>
            <div className="h-56">
              {typeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={typeData} cx="50%" cy="50%" outerRadius={75} innerRadius={40}
                      dataKey="value" stroke="none"
                      label={({ name, percent }) => `${name.replace(/_/g, ' ')} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-dark-text-secondary text-body-sm">No data</div>
              )}
            </div>
          </Card>

          <Card className="bg-dark-card! border-dark-border!">
            <h3 className="text-[14px] font-medium text-dark-text mb-4">By Destination</h3>
            <div className="h-56">
              {destData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={destData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                    <XAxis dataKey="name" tick={{ fill: '#A1A1AA', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#A1A1AA', fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-dark-text-secondary text-body-sm">No data</div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Live Feed */}
      <Card className="bg-dark-card! border-dark-border! p-0! overflow-hidden">
        <div className="px-5 py-3.5 border-b border-dark-border flex items-center justify-between">
          <h3 className="text-[14px] font-medium text-dark-text flex items-center gap-2">
            <Radio className="h-4 w-4 text-accent" strokeWidth={1.75} />
            Live Feed
          </h3>
          <LiveIndicator connected={connected} />
        </div>
        <div className="p-4 max-h-[320px] overflow-y-auto space-y-2">
          {liveEvents.length === 0 ? (
            <div className="text-center text-dark-text-secondary py-10">
              <Radio className="h-6 w-6 mx-auto mb-2 text-dark-border" strokeWidth={1.75} />
              <p className="text-body-sm">Listening for events...</p>
            </div>
          ) : (
            liveEvents.map((ev, i) => (
              <AlertCard key={i} title={ev.event_type} message={JSON.stringify(ev)} timestamp={ev.timestamp}
                severity={ev.event_type?.includes('DISRUPTION') ? 'danger' : 'warning'} />
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
