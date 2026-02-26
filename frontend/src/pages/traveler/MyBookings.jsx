import { useEffect, useMemo, useState } from 'react';
import { Compass } from 'lucide-react';

import api from '../../api/axios';
import HotelBookingsTable from '../../components/hotel/HotelBookingsTable';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function formatCurrency(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return '-';
  return `INR ${parsed.toLocaleString()}`;
}

export default function MyBookings() {
  const [hotelBookings, setHotelBookings] = useState([]);
  const [activityBookings, setActivityBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadBookings = async () => {
      try {
        setLoading(true);
        setError('');
        const [hotelsRes, activitiesRes] = await Promise.all([
          api.get('/bookings/hotels/me'),
          api.get('/activities/me'),
        ]);
        setHotelBookings(hotelsRes?.data?.data || []);
        setActivityBookings(activitiesRes?.data?.data || []);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load bookings.');
        setHotelBookings([]);
        setActivityBookings([]);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, []);

  const activityColumns = useMemo(
    () => [
      {
        key: 'tour_name',
        header: 'Activity',
        render: (value, row) => (
          <div>
            <p className="text-[13px] text-ink font-medium">{value || '-'}</p>
            <p className="text-[12px] text-text-secondary">{row.source === 'GUIDE_SERVICE' ? 'Guide Service' : 'Tour'}</p>
          </div>
        ),
      },
      {
        key: 'scheduled_time',
        header: 'Schedule',
        render: (value) => formatDateTime(value),
      },
      {
        key: 'participants',
        header: 'People',
        render: (value) => Number(value || 1),
      },
      {
        key: 'total_price',
        header: 'Amount',
        render: (value) => formatCurrency(value),
      },
      {
        key: 'status',
        header: 'Status',
        render: (value) => <StatusBadge status={value} />,
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-md text-ink">My Bookings</h1>
        <p className="text-body-sm text-text-secondary mt-1">
          View and manage all your hotel and activity bookings.
        </p>
      </div>

      {error && (
        <div className="bg-danger-soft border border-danger/20 rounded-lg p-3">
          <p className="text-[13px] text-danger">{error}</p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-white p-4">
        {loading ? (
          <div className="h-64 bg-surface-sunken rounded-lg animate-pulse" />
        ) : (
          <HotelBookingsTable
            title="Hotel Bookings"
            bookings={hotelBookings}
            mode="traveler"
            emptyMessage="No hotel bookings yet. Search and reserve your stay."
          />
        )}
      </div>

      <div className="rounded-xl border border-border bg-white p-4">
        {loading ? (
          <div className="h-56 bg-surface-sunken rounded-lg animate-pulse" />
        ) : (
          <div className="space-y-3">
            <h3 className="text-label-lg text-ink inline-flex items-center gap-2">
              <Compass className="h-4 w-4 text-text-muted" />
              Activity Bookings
            </h3>
            <DataTable
              columns={activityColumns}
              data={activityBookings}
              emptyMessage="No activity bookings yet. Explore Tours & Activities to book one."
            />
          </div>
        )}
      </div>
    </div>
  );
}
