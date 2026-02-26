import Card from '../ui/Card';
import StarRatingDisplay from './StarRatingDisplay';

function fmtDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

export default function RatingsTable({ ratings }) {
  return (
    <Card>
      <h3 className="text-label-lg text-ink mb-3">Recent Ratings</h3>
      {ratings?.length ? (
        <div className="space-y-3">
          {ratings.map((item) => (
            <div key={item.ride_id} className="rounded-xl border border-border bg-surface-sunken/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold text-ink">{item.traveler_name || 'Traveler'}</p>
                  <p className="text-[12px] text-text-secondary mt-1">{fmtDate(item.completed_at || item.updated_at)}</p>
                </div>
                <StarRatingDisplay value={item.stars || 0} />
              </div>
              <p className="text-[12px] text-text-secondary mt-2">{item.source || '-'} to {item.destination || '-'}</p>
              {item.message ? (
                <p className="text-[13px] text-ink mt-2 rounded-lg bg-white border border-border px-3 py-2">{item.message}</p>
              ) : (
                <p className="text-[12px] text-text-secondary mt-2">No written feedback.</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-text-secondary">No ratings yet.</p>
      )}
    </Card>
  );
}
