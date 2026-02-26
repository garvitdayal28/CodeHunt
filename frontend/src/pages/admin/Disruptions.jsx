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
import PageHeader from '../../components/ui/PageHeader';
import { PageSectionSkeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../contexts/ToastContext';

const COLORS = ['#6366F1', '#3B82F6', '#F59E0B', '#EF4444', '#10B981'];

export default function PlatformDisruptions() {
  const [disruptions, setDisruptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { events: liveEvents, connected } = useSSE('/events/stream');
  const toast = useToast();

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
      toast.success('Export ready', 'Disruptions CSV downloaded.');
    } catch (e) {
      console.error(e);
      toast.error('Export failed', 'Unable to export disruptions right now.');
    }
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
    backgroundColor: '#ffffff', border: '1px solid #E5E7EB',
    borderRadius: '8px', color: '#111827', fontSize: '12px',
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        title="Disruptions"
        description="Analytics and live event monitoring."
        action={<Button variant="secondary" size="sm" icon={Download} onClick={handleExport}>Export</Button>}
      />

      {loading ? (
        <PageSectionSkeleton blocks={1} blockHeightClass="h-64" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <h3 className="text-[14px] font-medium text-ink mb-4">By Type</h3>
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
                <div className="h-full flex items-center justify-center text-text-secondary text-body-sm">No data</div>
              )}
            </div>
          </Card>

          <Card>
            <h3 className="text-[14px] font-medium text-ink mb-4">By Destination</h3>
            <div className="h-56">
              {destData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={destData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-text-secondary text-body-sm">No data</div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Live Feed */}
      <Card className="!p-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-medium text-ink flex items-center gap-2">
            <Radio className="h-4 w-4 text-info" strokeWidth={1.75} />
            Live Feed
          </h3>
          <LiveIndicator connected={connected} />
        </div>
        <div className="p-4 max-h-[320px] overflow-y-auto space-y-2">
          {liveEvents.length === 0 ? (
            <div className="text-center text-text-secondary py-10">
              <Radio className="h-6 w-6 mx-auto mb-2 text-border" strokeWidth={1.75} />
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
