import { useEffect, useState } from 'react';

import api from '../../api/axios';
import HotelBookingsTable from '../../components/hotel/HotelBookingsTable';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBookings = async () => {
      try {
        setLoading(true);
        const res = await api.get('/bookings/hotels/me');
        setBookings(res?.data?.data || []);
      } catch {
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
        <h1 className="text-display-md text-ink">My Bookings</h1>
        <p className="text-body-sm text-text-secondary mt-1">
          View and manage all your hotel bookings.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-white p-4">
        {loading ? (
          <div className="h-64 bg-surface-sunken rounded-lg animate-pulse" />
        ) : (
          <HotelBookingsTable
            bookings={bookings}
            mode="traveler"
            emptyMessage="No hotel bookings yet. Search and reserve your stay."
          />
        )}
      </div>
    </div>
  );
}
