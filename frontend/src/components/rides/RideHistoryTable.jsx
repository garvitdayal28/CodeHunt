import Card from '../ui/Card';

function formatDate(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function RideHistoryTable({ title, rides = [], travelerView = true }) {
  return (
    <Card>
      <h3 className="text-label-lg text-ink mb-3">{title}</h3>
      {rides.length === 0 ? (
        <p className="text-[13px] text-text-secondary">No rides yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="text-text-secondary border-b border-border">
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Route</th>
                <th className="py-2 font-medium">{travelerView ? 'Driver' : 'Traveler'}</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {rides.map((ride) => (
                <tr key={ride.id} className="border-b border-border/70 last:border-b-0">
                  <td className="py-2 text-text-secondary">{formatDate(ride.created_at)}</td>
                  <td className="py-2 text-ink">{ride?.source?.address || '-'} to {ride?.destination?.address || '-'}</td>
                  <td className="py-2 text-ink">{travelerView ? (ride.driver_name || '-') : (ride.traveler_name || '-')}</td>
                  <td className="py-2 text-ink">{ride.status}</td>
                  <td className="py-2 text-ink">{ride.quoted_price ? `${ride.currency || 'INR'} ${ride.quoted_price}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
