import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Building2, CalendarDays, CheckCircle2, MapPin, Users } from 'lucide-react';

import api from '../../api/axios';
import Button from '../../components/ui/Button';

export default function BookingConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hotel, booking } = location.state || {};

  const [itineraries, setItineraries] = useState([]);
  const [selectedItineraryId, setSelectedItineraryId] = useState('');
  const [bookWithoutItinerary, setBookWithoutItinerary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hotel || !booking) {
      navigate('/traveler/hotels');
      return;
    }

    const loadItineraries = async () => {
      try {
        setLoading(true);
        const res = await api.get('/itineraries');
        const rows = res?.data?.data || [];
        setItineraries(rows);
        if (rows.length > 0) setSelectedItineraryId(rows[0].id);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load itineraries.');
      } finally {
        setLoading(false);
      }
    };

    loadItineraries();
  }, [booking, hotel, navigate]);

  const nights = useMemo(() => {
    if (!booking?.checkIn || !booking?.checkOut) return 1;
    const start = new Date(booking.checkIn);
    const end = new Date(booking.checkOut);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [booking]);

  const baseAmount = Number(booking?.pricePerNight || 0) * Number(booking?.roomsBooked || 1) * nights;
  const totalAmount = Math.round(baseAmount);

  const handleConfirm = async () => {
    if (!bookWithoutItinerary && !selectedItineraryId) {
      setError('Please select an itinerary or choose to book without one.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        hotel_owner_uid: booking.hotelOwnerUid || hotel.hotel_owner_uid || hotel.id,
        room_type_id: booking.roomTypeId,
        rooms_booked: Number(booking.roomsBooked || 1),
        adults: Number(booking.adults || 0),
        children: Number(booking.children || 0),
        check_in_date: booking.checkIn,
        check_out_date: booking.checkOut,
        property_id: booking.propertyId || hotel.id,
        property_name: hotel.name,
        room_type: booking.roomType,
      };

      if (!bookWithoutItinerary && selectedItineraryId) {
        payload.itinerary_id = selectedItineraryId;
      }

      await api.post('/bookings', payload);

      setSuccess(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to complete booking.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!hotel || !booking) return null;

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white rounded-2xl shadow-sm border border-border p-8 text-center">
        <div className="w-16 h-16 bg-primary-soft rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-display-md text-ink mb-2">Booking Confirmed</h1>
        <p className="text-body-md text-text-secondary mb-8">
          Your stay at <span className="font-semibold text-ink">{hotel.name}</span> is now {selectedItineraryId ? 'linked to your itinerary' : 'confirmed'}.
        </p>
        <div className="space-y-3">
          {selectedItineraryId && (
            <Button onClick={() => navigate(`/traveler/itineraries/${selectedItineraryId}`)} className="w-full" size="lg">
              View Itinerary
            </Button>
          )}
          <Button onClick={() => navigate('/traveler/hotels')} variant={selectedItineraryId ? 'secondary' : 'primary'} className="w-full">
            {selectedItineraryId ? 'Search More Hotels' : 'View My Bookings'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-display-md text-ink">Review and Confirm Booking</h1>

      {error && (
        <div className="bg-danger-soft border border-danger/20 rounded-xl p-4 flex gap-3 text-danger">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-[14px]">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-border rounded-2xl shadow-sm p-6 space-y-5">
          <div className="flex gap-4">
            {(hotel.image_url || hotel.image_urls?.[0]) && (
              <img src={hotel.image_url || hotel.image_urls?.[0]} alt={hotel.name} className="w-24 h-24 object-cover rounded-xl" />
            )}
            <div>
              <h2 className="text-label-lg text-ink mb-1">{hotel.name}</h2>
              <p className="text-[13px] text-text-secondary flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {hotel.location || '-'}
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-border">
            <p className="text-[13px] text-text-secondary flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-primary" />
              {booking.checkIn} to {booking.checkOut}
            </p>
            <p className="text-[13px] text-text-secondary flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-text-secondary" />
              {booking.roomType} ({booking.roomsBooked} room(s))
            </p>
            <p className="text-[13px] text-text-secondary flex items-center gap-1.5">
              <Users className="h-4 w-4 text-text-secondary" />
              {booking.adults} adults, {booking.children} children
            </p>
          </div>
        </div>

        <div className="bg-white border border-border rounded-2xl shadow-sm p-6 flex flex-col justify-between">
          <div className="space-y-5">
            <div>
              <h3 className="text-label-lg text-ink mb-2">Link to itinerary (optional)</h3>
              {loading ? (
                <div className="h-20 bg-surface-sunken rounded-lg animate-pulse" />
              ) : itineraries.length === 0 ? (
                <div className="bg-surface-sunken p-4 rounded-xl text-center">
                  <p className="text-[13px] text-text-secondary mb-2">No itinerary found.</p>
                  <Link to="/traveler/itineraries/new" className="text-[13px] font-semibold text-primary hover:underline">
                    Create itinerary
                  </Link>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-3">
                    {itineraries.map((itinerary) => (
                      <label
                        key={itinerary.id}
                        className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer ${
                          !bookWithoutItinerary && selectedItineraryId === itinerary.id ? 'border-primary bg-primary-soft/20' : 'border-border'
                        } ${bookWithoutItinerary ? 'opacity-50' : ''}`}
                      >
                        <input
                          type="radio"
                          name="itinerary"
                          checked={!bookWithoutItinerary && selectedItineraryId === itinerary.id}
                          onChange={() => {
                            setSelectedItineraryId(itinerary.id);
                            setBookWithoutItinerary(false);
                          }}
                          disabled={bookWithoutItinerary}
                          className="mt-1"
                        />
                        <div>
                          <p className="text-label-md text-ink">{itinerary.destination}</p>
                          <p className="text-[12px] text-text-muted">{itinerary.start_date} to {itinerary.end_date}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 p-3 border border-border rounded-xl cursor-pointer hover:bg-surface-sunken/30">
                    <input
                      type="checkbox"
                      checked={bookWithoutItinerary}
                      onChange={(e) => {
                        setBookWithoutItinerary(e.target.checked);
                        if (e.target.checked) setSelectedItineraryId('');
                      }}
                    />
                    <span className="text-[13px] text-text-secondary">Book without linking to itinerary</span>
                  </label>
                </>
              )}
            </div>

            <div className="bg-surface-sunken p-4 rounded-xl space-y-2">
              <div className="flex justify-between text-body-sm text-text-secondary">
                <span>INR {Number(booking.pricePerNight || 0).toLocaleString()} x {booking.roomsBooked} room(s) x {nights} night(s)</span>
                <span>INR {baseAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-label-lg text-ink pt-2 border-t border-border">
                <span>Total</span>
                <span>INR {totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Button
              onClick={handleConfirm}
              loading={submitting}
              disabled={!bookWithoutItinerary && !selectedItineraryId}
              className="w-full"
              size="lg"
            >
              Confirm Booking
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
