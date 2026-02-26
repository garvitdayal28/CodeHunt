import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, MapPin, Search, Ticket } from 'lucide-react';

import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Input, { Select } from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import HeroHeader from '../../components/ui/HeroHeader';

const categoryColors = {
  Adventure: 'bg-primary-soft text-primary',
  Cultural: 'bg-gold-soft text-gold',
  'Water Sports': 'bg-blue-soft text-blue',
  Walking: 'bg-success-soft text-success',
  Trekking: 'bg-primary-soft text-primary',
};

function normalizeSource(tour) {
  return String(tour?.source || '').toUpperCase() === 'GUIDE_SERVICE' ? 'GUIDE_SERVICE' : 'TOUR';
}

function parseGuideReference(tour) {
  const directOwnerUid = tour?.guide_owner_uid;
  const directServiceId = tour?.guide_service_id;
  if (directOwnerUid && directServiceId) {
    return { guideOwnerUid: directOwnerUid, guideServiceId: directServiceId };
  }

  const parts = String(tour?.id || '').split(':');
  if (parts.length === 3 && parts[0] === 'guide_service') {
    return { guideOwnerUid: parts[1], guideServiceId: parts[2] };
  }
  return { guideOwnerUid: '', guideServiceId: '' };
}

export default function TourSearch() {
  const [searchParams] = useSearchParams();
  const [destination, setDestination] = useState(searchParams.get('destination') || '');
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState(null);
  const [itineraries, setItineraries] = useState([]);
  const [itinerariesLoading, setItinerariesLoading] = useState(false);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [itineraryId, setItineraryId] = useState('');
  const [participants, setParticipants] = useState('1');
  const [scheduledTime, setScheduledTime] = useState('');
  const [timeSlots, setTimeSlots] = useState([]);
  const [timeSlotsLoading, setTimeSlotsLoading] = useState(false);
  const [timeSlotId, setTimeSlotId] = useState('');

  const selectedSource = useMemo(() => normalizeSource(selectedTour), [selectedTour]);
  const hasSlots = selectedSource === 'TOUR' && timeSlots.length > 0;

  const doSearch = async (dest) => {
    if (!dest) return;
    setLoading(true);
    setSearched(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.get(`/search/tours?destination=${encodeURIComponent(dest)}`);
      setTours(res.data.data || []);
    } catch {
      setError('Failed to fetch tours right now. Please try again.');
      setTours([]);
    } finally {
      setLoading(false);
    }
  };

  const loadItineraries = async () => {
    try {
      setItinerariesLoading(true);
      const res = await api.get('/itineraries');
      const rows = res?.data?.data || [];
      setItineraries(rows);
      if (rows.length > 0) {
        setItineraryId((prev) => prev || rows[0].id);
      }
    } catch {
      setItineraries([]);
    } finally {
      setItinerariesLoading(false);
    }
  };

  const loadTimeSlots = async (tourId) => {
    try {
      setTimeSlotsLoading(true);
      const res = await api.get(`/search/tours/${tourId}/time-slots`);
      const rows = (res?.data?.data || []).filter((slot) => slot.is_available !== false);
      setTimeSlots(rows);
      setTimeSlotId(rows[0]?.id || '');
    } catch {
      setTimeSlots([]);
      setTimeSlotId('');
    } finally {
      setTimeSlotsLoading(false);
    }
  };

  useEffect(() => {
    if (destination) doSearch(destination);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    doSearch(destination);
  };

  const openBooking = async (tour) => {
    setSelectedTour(tour);
    setBookingOpen(true);
    setBookingError('');
    setParticipants('1');
    setScheduledTime('');
    setTimeSlots([]);
    setTimeSlotId('');

    if (itineraries.length === 0) {
      await loadItineraries();
    }

    if (normalizeSource(tour) === 'TOUR') {
      await loadTimeSlots(tour.id);
    }
  };

  const handleBook = async () => {
    if (!selectedTour) return;
    if (!itineraryId) {
      setBookingError('Please select an itinerary.');
      return;
    }

    const participantCount = Number(participants || 1);
    if (!Number.isFinite(participantCount) || participantCount < 1) {
      setBookingError('Participants must be at least 1.');
      return;
    }

    const source = normalizeSource(selectedTour);
    const payload = {
      itinerary_id: itineraryId,
      source,
      participants: participantCount,
      tour_name: selectedTour.name,
    };

    if (source === 'TOUR') {
      payload.tour_id = selectedTour.id;
      if (hasSlots) {
        if (!timeSlotId) {
          setBookingError('Please select a time slot.');
          return;
        }
        payload.time_slot_id = timeSlotId;
      } else {
        if (!scheduledTime) {
          setBookingError('Please choose a schedule time.');
          return;
        }
        payload.scheduled_time = new Date(scheduledTime).toISOString();
      }
    } else {
      const { guideOwnerUid, guideServiceId } = parseGuideReference(selectedTour);
      if (!guideOwnerUid || !guideServiceId) {
        setBookingError('Invalid guide service reference.');
        return;
      }
      if (!scheduledTime) {
        setBookingError('Please choose a schedule time.');
        return;
      }
      payload.guide_owner_uid = guideOwnerUid;
      payload.guide_service_id = guideServiceId;
      payload.scheduled_time = new Date(scheduledTime).toISOString();
    }

    try {
      setBookingSaving(true);
      setBookingError('');
      await api.post('/activities', payload);
      setBookingOpen(false);
      setSuccess('Activity booked successfully. You can view it in My Bookings and itinerary timeline.');
    } catch (err) {
      setBookingError(err?.response?.data?.message || 'Failed to book activity.');
    } finally {
      setBookingSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <HeroHeader
        title="Adventure Awaits"
        description="Discover hidden gems, book guided tours, and create unforgettable memories at your next destination."
        image="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&h=400&fit=crop&q=80"
      />

      {error && (
        <div className="bg-danger-soft border border-danger/20 rounded-lg p-3">
          <p className="text-[13px] text-danger">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-3">
          <p className="text-[13px] text-success">{success}</p>
        </div>
      )}

      <form onSubmit={handleSearch} className="flex items-end gap-3">
        <Input
          label="Destination"
          icon={Search}
          placeholder="Search by location..."
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" loading={loading} size="lg">
          Search
        </Button>
      </form>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-72 bg-surface-sunken rounded-xl animate-pulse" />)}
        </div>
      ) : tours.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tours.map((tour, i) => {
            const source = normalizeSource(tour);
            return (
              <div
                key={tour.id}
                className={`group bg-white border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow animate-fade-in-up stagger-${i + 1}`}
              >
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={tour.image_url}
                    alt={tour.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase bg-white/90 text-ink">
                    {source === 'GUIDE_SERVICE' ? 'Guide Service' : 'Tour'}
                  </span>
                  {tour.category?.[0] && (
                    <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase ${categoryColors[tour.category[0]] || 'bg-surface-sunken text-text-secondary'}`}>
                      {tour.category[0]}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-label-lg text-ink mb-1">{tour.name}</h3>
                  <div className="flex items-center gap-3 text-body-sm text-text-secondary mb-3">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
                      <span>{tour.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
                      <span>{tour.duration_hours}h</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {tour.category?.map((c) => (
                      <span key={`${tour.id}-${c}`} className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${categoryColors[c] || 'bg-surface-sunken text-text-secondary'}`}>
                        {c}
                      </span>
                    ))}
                  </div>
                  {tour.owner_name && (
                    <p className="text-[12px] text-text-secondary mb-2">Hosted by {tour.owner_name}</p>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div>
                      <span className="text-[18px] font-semibold text-ink">INR {Number(tour.price || 0).toLocaleString()}</span>
                      <span className="text-[12px] text-text-muted"> / person</span>
                    </div>
                    <Button size="sm" icon={Ticket} onClick={() => openBooking(tour)}>
                      Book Now
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : searched ? (
        <div className="text-center py-16 border border-border rounded-xl bg-white">
          <Search className="h-10 w-10 text-text-placeholder mx-auto mb-3" />
          <p className="text-body-lg text-ink font-medium">No tours found</p>
          <p className="text-body-sm text-text-secondary mt-1">Try a different destination.</p>
        </div>
      ) : null}

      <Modal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        title={selectedTour ? `Book: ${selectedTour.name}` : 'Book Activity'}
        footer={(
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setBookingOpen(false)}>Cancel</Button>
            <Button loading={bookingSaving} onClick={handleBook}>Confirm Booking</Button>
          </div>
        )}
      >
        {!selectedTour ? null : (
          <div className="space-y-3">
            {bookingError && (
              <div className="bg-danger-soft border border-danger/20 rounded-lg p-3">
                <p className="text-[13px] text-danger">{bookingError}</p>
              </div>
            )}

            {itinerariesLoading ? (
              <div className="h-20 bg-surface-sunken rounded-lg animate-pulse" />
            ) : itineraries.length === 0 ? (
              <p className="text-[13px] text-text-secondary">
                No itineraries found. Create a trip first from My Trips before booking an activity.
              </p>
            ) : (
              <Select label="Select Itinerary" value={itineraryId} onChange={(e) => setItineraryId(e.target.value)}>
                {itineraries.map((itinerary) => (
                  <option key={itinerary.id} value={itinerary.id}>
                    {itinerary.destination} ({itinerary.start_date} to {itinerary.end_date})
                  </option>
                ))}
              </Select>
            )}

            <Input
              label="Participants"
              type="number"
              min="1"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
            />

            {selectedSource === 'TOUR' ? (
              <>
                {timeSlotsLoading ? (
                  <div className="h-20 bg-surface-sunken rounded-lg animate-pulse" />
                ) : hasSlots ? (
                  <Select label="Time Slot" value={timeSlotId} onChange={(e) => setTimeSlotId(e.target.value)}>
                    {timeSlots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {new Date(slot.scheduled_time).toLocaleString()} ({slot.remaining_capacity} seats left)
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    label="Schedule Time"
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                )}
              </>
            ) : (
              <Input
                label="Schedule Time"
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
