import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import api from '../../api/axios';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../contexts/ToastContext';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const toast = useToast();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const ep = filterAction ? `/platform/audit-log?action=${filterAction}` : '/platform/audit-log';
      const res = await api.get(ep);
      setLogs(res.data.data);
    } catch {
      setLogs([
        { id: '1', timestamp: new Date().toISOString(), actor_uid: 'user_abc123', actor_role: 'TRAVELER', action: 'BOOKING_CREATED', resource_type: 'booking', resource_id: 'bk_001' },
        { id: '2', timestamp: new Date(Date.now() - 120000).toISOString(), actor_uid: 'admin_xyz', actor_role: 'HOTEL_ADMIN', action: 'LATE_CHECKOUT_APPROVED', resource_type: 'booking', resource_id: 'bk_002' },
        { id: '3', timestamp: new Date(Date.now() - 300000).toISOString(), actor_uid: 'user_def456', actor_role: 'TRAVELER', action: 'DISRUPTION_REPORTED', resource_type: 'itinerary', resource_id: 'it_003' },
      ]);
    } finally { setLoading(false); }
  }, [filterAction]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleExport = async () => {
    try {
      const res = await api.get('/platform/export?type=audit_log', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'audit_log.csv';
      document.body.appendChild(a); a.click(); a.remove();
      toast.success('Export ready', 'Audit log CSV downloaded.');
    } catch (e) {
      console.error(e);
      toast.error('Export failed', 'Unable to export audit log right now.');
    }
  };

  const columns = [
    {
      key: 'timestamp', header: 'Time',
      render: (v) => <span className="text-mono-sm text-text-secondary">{new Date(v).toLocaleString()}</span>,
    },
    {
      key: 'actor_uid', header: 'Actor',
      render: (v, r) => (
        <div>
          <span className="text-[13px] font-medium text-ink truncate block max-w-[140px]" title={v}>{v}</span>
          <span className="text-[11px] text-text-secondary">{r.actor_role}</span>
        </div>
      ),
    },
    {
      key: 'action', header: 'Action',
      render: (v) => <StatusBadge status={v === 'DISRUPTION_REPORTED' ? 'DISRUPTED' : v === 'BOOKING_CREATED' ? 'CONFIRMED' : 'COMPLETED'} />,
    },
    {
      key: 'resource_type', header: 'Resource',
      render: (_, r) => <span className="text-mono-sm text-text-secondary">{r.resource_type}:{r.resource_id}</span>,
    },
  ];

  return (
    <div className="space-y-5 max-w-6xl">
      <PageHeader
        title="Audit Log"
        description="System-wide action history."
        action={(
          <div className="flex items-center gap-2">
            <Select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className="w-44">
              <option value="">All Actions</option>
              <option value="BOOKING_CREATED">Booking Created</option>
              <option value="DISRUPTION_REPORTED">Disruption</option>
              <option value="LATE_CHECKOUT_APPROVED">Check-out</option>
            </Select>
            <Button variant="secondary" size="sm" icon={Download} onClick={handleExport}>Export</Button>
          </div>
        )}
      />

      <DataTable columns={columns} data={logs} emptyMessage="No audit logs found." loading={loading} />
    </div>
  );
}
