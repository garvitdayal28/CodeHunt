import Card from '../ui/Card';

const statusColors = {
  REQUESTED: 'text-blue',
  ACCEPTED_PENDING_QUOTE: 'text-gold',
  QUOTE_SENT: 'text-gold',
  QUOTE_ACCEPTED: 'text-primary',
  DRIVER_EN_ROUTE: 'text-primary',
  IN_PROGRESS: 'text-success',
  COMPLETED: 'text-success',
  CANCELLED: 'text-danger',
  EXPIRED: 'text-danger',
};

function StatusLabel({ status }) {
  const label = status?.replace(/_/g, ' ') || 'UNKNOWN';
  return <span className={`text-[13px] font-semibold ${statusColors[status] || 'text-text-secondary'}`}>{label}</span>;
}

export default function RideStatusCard({ ride }) {
  if (!ride) {
    return null;
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-label-lg text-ink">Current Ride</h3>
        <StatusLabel status={ride.status} />
      </div>
      <div className="space-y-2 text-[13px]">
        <div className="flex justify-between gap-3">
          <span className="text-text-secondary">Source</span>
          <span className="text-ink text-right">{ride?.source?.address || '-'}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-text-secondary">Destination</span>
          <span className="text-ink text-right">{ride?.destination?.address || '-'}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-text-secondary">Driver</span>
          <span className="text-ink text-right">{ride?.driver_name || '-'}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-text-secondary">ETA</span>
          <span className="text-ink text-right">{ride?.eta_minutes ? `${ride.eta_minutes} min` : '-'}</span>
        </div>
      </div>
    </Card>
  );
}
