import { useEffect, useState } from 'react';

import api from '../../api/axios';
import HotelBookingsTable from '../../components/hotel/HotelBookingsTable';

export default function HotelBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadBookings = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get('/admin/hotel/bookings');
        setBookings(res?.data?.data || []);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load bookings.');
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-md text-ink">Hotel Bookings</h1>
        <p className="text-body-sm text-text-secondary mt-1">
          View all bookings for your property.
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
            title="Recent Bookings"
            bookings={bookings}
            mode="admin"
            emptyMessage="No bookings found for this property."
          />
        )}
      </div>
    </div>
  );
}
