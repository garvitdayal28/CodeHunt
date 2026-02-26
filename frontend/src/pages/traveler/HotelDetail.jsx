import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, MapPin, Users } from 'lucide-react';

import api from '../../api/axios';
import HotelRoomCard from '../../components/hotel/HotelRoomCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

function buildQuery(filters) {
  const params = new URLSearchParams();
  if (filters.checkin) params.set('checkin', filters.checkin);
  if (filters.checkout) params.set('checkout', filters.checkout);
  if (filters.rooms) params.set('rooms', String(filters.rooms));
  if (filters.adults !== '') params.set('adults', String(filters.adults));
  if (filters.children !== '') params.set('children', String(filters.children));
  if (filters.priceMin) params.set('price_min', String(filters.priceMin));
  if (filters.priceMax) params.set('price_max', String(filters.priceMax));
  if (filters.sortBy) params.set('sort_by', filters.sortBy);
  return params.toString();
}

export default function HotelDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialFilters = useMemo(
    () => ({
      checkin: searchParams.get('checkin') || location.state?.filters?.checkin || '',
      checkout: searchParams.get('checkout') || location.state?.filters?.checkout || '',
      rooms: searchParams.get('rooms') || location.state?.filters?.rooms || '1',
      adults: searchParams.get('adults') || location.state?.filters?.adults || '2',
      children: searchParams.get('children') || location.state?.filters?.children || '0',
      priceMin: searchParams.get('price_min') || location.state?.filters?.priceMin || '',
      priceMax: searchParams.get('price_max') || location.state?.filters?.priceMax || '',
      sortBy: searchParams.get('sort_by') || location.state?.filters?.sortBy || 'price_asc',
    }),
    [location.state?.filters, searchParams]
  );

  const [filters, setFilters] = useState(initialFilters);
  const [hotel, setHotel] = useState(location.state?.hotel || null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);

  const roomsRequested = Number(filters.rooms || 1);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError('');
      const query = buildQuery(filters);
      const res = await api.get(`/search/hotels/${id}/rooms?${query}`);
      const payload = res?.data?.data || {};
      setHotel(payload.hotel || null);
      setRooms(payload.rooms || []);

      if (payload.rooms?.length > 0) {
        setSelectedRoom((prev) => payload.rooms.find((room) => room.id === prev?.id) || payload.rooms[0]);
      } else {
        setSelectedRoom(null);
      }
    } catch (err) {
      setRooms([]);
      setError(err?.response?.data?.message || 'Unable to load hotel rooms right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, filters.checkin, filters.checkout, filters.rooms, filters.adults, filters.children, filters.priceMin, filters.priceMax, filters.sortBy]);

  const handleBookNow = () => {
    if (!hotel || !selectedRoom) {
      setError('Please select a room before continuing.');
      return;
    }
    if (!filters.checkin || !filters.checkout) {
      setError('Please select check-in and check-out dates.');
      return;
    }
    if (selectedRoom.available_rooms < roomsRequested) {
      setError('Selected room type does not have enough inventory for requested rooms.');
      return;
    }

    navigate('/traveler/booking/confirm', {
      state: {
        hotel,
        booking: {
          checkIn: filters.checkin,
          checkOut: filters.checkout,
          roomType: selectedRoom.name,
          roomTypeId: selectedRoom.id,
          roomsBooked: roomsRequested,
          adults: Number(filters.adults || 0),
          children: Number(filters.children || 0),
          pricePerNight: selectedRoom.price_per_day,
          hotelOwnerUid: hotel.hotel_owner_uid || hotel.id,
          propertyId: hotel.id,
        },
      },
    });
  };

  const cover = hotel?.image_url || hotel?.image_urls?.[0];

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-[13px] text-text-secondary hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Hotels
      </button>

      {hotel && (
        <div className="rounded-2xl border border-border bg-white overflow-hidden">
          {cover && <img src={cover} alt={hotel.name} className="h-56 w-full object-cover" />}
          <div className="p-5">
            <h1 className="text-display-md text-ink">{hotel.name}</h1>
            <p className="text-body-sm text-text-secondary mt-1 inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> {hotel.location || '-'}
            </p>
            <p className="text-body-sm text-text-secondary mt-2">{hotel.description || 'No description available.'}</p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-white p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Input
            label="Check-in"
            type="date"
            value={filters.checkin}
            onChange={(e) => setFilters((prev) => ({ ...prev, checkin: e.target.value }))}
            min={new Date().toISOString().split('T')[0]}
          />
          <Input
            label="Check-out"
            type="date"
            value={filters.checkout}
            onChange={(e) => setFilters((prev) => ({ ...prev, checkout: e.target.value }))}
            min={filters.checkin || new Date().toISOString().split('T')[0]}
          />
          <Input
            label="Rooms"
            type="number"
            min="1"
            value={filters.rooms}
            onChange={(e) => setFilters((prev) => ({ ...prev, rooms: e.target.value }))}
          />
          <Input
            label="Adults"
            type="number"
            min="0"
            value={filters.adults}
            onChange={(e) => setFilters((prev) => ({ ...prev, adults: e.target.value }))}
          />
          <Input
            label="Children"
            type="number"
            min="0"
            value={filters.children}
            onChange={(e) => setFilters((prev) => ({ ...prev, children: e.target.value }))}
          />
        </div>
      </div>

      {error && (
        <div className="bg-danger-soft border border-danger/20 rounded-lg p-3">
          <p className="text-[13px] text-danger">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-display-sm text-ink">Available Rooms</h2>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="h-52 rounded-xl bg-surface-sunken animate-pulse" />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="rounded-xl border border-border bg-white p-8 text-center text-[14px] text-text-secondary">
              No rooms are available for the selected filters.
            </div>
          ) : (
            rooms.map((room) => (
              <HotelRoomCard
                key={room.id}
                room={room}
                selected={selectedRoom?.id === room.id}
                onSelect={setSelectedRoom}
                roomsRequested={roomsRequested}
              />
            ))
          )}
        </div>

        <div>
          <div className="sticky top-20 rounded-xl border border-border bg-white p-5 space-y-4">
            <h3 className="text-label-lg text-ink">Booking Summary</h3>
            <div className="space-y-2 text-[13px] text-text-secondary">
              <p className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {filters.checkin && filters.checkout ? `${filters.checkin} to ${filters.checkout}` : 'Select stay dates'}
              </p>
              <p className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {Number(filters.adults || 0)} adults, {Number(filters.children || 0)} children
              </p>
              <p>{roomsRequested} room(s)</p>
            </div>

            {selectedRoom ? (
              <div className="rounded-lg border border-border bg-surface-sunken/40 p-3">
                <p className="text-[13px] text-text-secondary">Selected room</p>
                <p className="text-[14px] font-semibold text-ink mt-1">{selectedRoom.name}</p>
                <p className="text-[13px] text-text-secondary mt-1">
                  INR {Number(selectedRoom.price_per_day || 0).toLocaleString()} per day
                </p>
              </div>
            ) : (
              <p className="text-[13px] text-text-secondary">Select a room type to continue.</p>
            )}

            <Button className="w-full" size="lg" onClick={handleBookNow} disabled={!selectedRoom}>
              Continue to Booking
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
