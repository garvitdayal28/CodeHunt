import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Building2, MapPin, CalendarDays, Loader2, AlertCircle } from 'lucide-react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';

export default function BookingConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hotel, booking } = location.state || {};

  const [itineraries, setItineraries] = useState([]);
  const [selectedItineraryId, setSelectedItineraryId] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Protect route
  useEffect(() => {
    if (!hotel || !booking) {
      navigate('/traveler/search/hotels');
      return;
    }
    fetchItineraries();
  }, [hotel, booking, navigate]);

  const fetchItineraries = async () => {
    setLoading(true);
    try {
      const res = await api.get('/itineraries');
      const data = res.data.data || [];
      setItineraries(data);
      if (data.length > 0) {
        setSelectedItineraryId(data[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load your trips. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const calcDays = () => {
    if (!booking) return 1;
    const start = new Date(booking.checkIn);
    const end = new Date(booking.checkOut);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  };

  const handleConfirm = async () => {
    if (!selectedItineraryId) {
      setError('Please select an itinerary to attach this booking to.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await api.post('/bookings', {
        itinerary_id: selectedItineraryId,
        property_id: hotel.id || hotel.external_hotel_id,
        property_name: hotel.name,
        room_type: booking.roomType,
        check_in_date: booking.checkIn,
        check_out_date: booking.checkOut,
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to complete booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hotel || !booking) return null;

  const nights = calcDays();
  const total = booking.pricePerNight * nights;

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white rounded-2xl shadow-sm border border-border p-8 text-center animate-fade-in-up">
        <div className="w-16 h-16 bg-primary-soft rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-display-md text-ink mb-2">Booking Confirmed!</h1>
        <p className="text-body-md text-text-secondary mb-8">
          Your stay at <span className="font-semibold text-ink">{hotel.name}</span> has been successfully added to your itinerary.
        </p>
        <div className="space-y-3">
          <Button onClick={() => navigate('/traveler/itineraries/' + selectedItineraryId)} className="w-full" size="lg">
            View My Itinerary
          </Button>
          <Button onClick={() => navigate('/traveler/search/hotels')} variant="secondary" className="w-full">
            Book Another Hotel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-display-md text-ink mb-6">Review & Confirm Booking</h1>
      
      {error && (
        <div className="bg-danger-soft border border-danger/20 rounded-xl p-4 flex gap-3 text-danger">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-[14px]">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Booking Details */}
        <div className="bg-white border border-border rounded-2xl shadow-sm p-6 space-y-6">
          <div className="flex gap-4">
            <img src={hotel.image_url} alt={hotel.name} className="w-24 h-24 object-cover rounded-xl" />
            <div>
              <h2 className="text-label-lg text-ink mb-1">{hotel.name}</h2>
              <p className="text-[13px] text-text-secondary flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{hotel.location}</p>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-[11px] font-semibold bg-primary-soft text-primary px-2 py-0.5 rounded-full">{hotel.star_rating} Stars</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-label-sm text-text-muted mb-0.5 uppercase tracking-wider">Check-in</p>
                <p className="text-body-md font-medium text-ink flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-primary" /> {booking.checkIn}</p>
              </div>
              <div className="w-10 border-t border-border border-dashed self-end mb-2.5"></div>
              <div className="text-right">
                <p className="text-label-sm text-text-muted mb-0.5 uppercase tracking-wider">Check-out</p>
                <p className="text-body-md font-medium text-ink flex items-center gap-1.5 justify-end">{booking.checkOut} <CalendarDays className="h-4 w-4 text-primary" /></p>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
               <p className="text-label-sm text-text-muted mb-1.5 uppercase tracking-wider">Room Type</p>
               <p className="text-body-md font-medium text-ink flex items-center gap-1.5"><Building2 className="h-4 w-4 text-text-secondary" /> {booking.roomType}</p>
            </div>
          </div>
        </div>

        {/* Action / Payment Summary */}
        <div className="bg-white border border-border rounded-2xl shadow-sm p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <h3 className="text-label-lg text-ink mb-3">Attach to Itinerary</h3>
              <p className="text-[13px] text-text-secondary mb-3">Select the trip this booking belongs to.</p>
              
              {loading ? (
                <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : itineraries.length === 0 ? (
                <div className="bg-surface-sunken p-4 rounded-xl text-center">
                  <p className="text-[13px] text-text-secondary mb-2">You don't have any trips yet.</p>
                  <Link to="/traveler/itineraries/new" className="text-[13px] font-semibold text-primary hover:underline">
                    Create a new trip first
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {itineraries.map(it => (
                    <label key={it.id} className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${selectedItineraryId === it.id ? 'border-primary bg-primary-soft/20' : 'border-border hover:bg-surface-sunken'}`}>
                      <input 
                        type="radio" 
                        name="itinerary" 
                        value={it.id} 
                        checked={selectedItineraryId === it.id}
                        onChange={() => setSelectedItineraryId(it.id)}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-label-md text-ink">{it.destination}</p>
                        <p className="text-[12px] text-text-muted">{it.start_date} to {it.end_date}</p>
                      </div>
                    </label>
                  ))}
                  <div className="pt-2 text-right">
                     <Link to="/traveler/itineraries/new" className="text-[12px] font-medium text-primary hover:underline">
                      + Create new trip
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-surface-sunken p-4 rounded-xl space-y-3">
              <div className="flex justify-between text-body-sm text-text-secondary">
                <span>₹{booking.pricePerNight.toLocaleString()} × {nights} nights</span>
                <span>₹{(booking.pricePerNight * nights).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-body-sm text-text-secondary">
                <span>Taxes & Fees</span>
                <span>₹{Math.round(total * 0.18).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-label-lg text-ink pt-3 border-t border-border">
                <span>Total</span>
                <span>₹{Math.round(total * 1.18).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Button 
              onClick={handleConfirm} 
              loading={isSubmitting} 
              disabled={!selectedItineraryId || itineraries.length === 0} 
              className="w-full" 
              size="lg"
            >
              Confirm Booking
            </Button>
            <p className="text-[11px] text-text-muted text-center mt-3">
              By confirming, you agree to our Terms of Service and Cancellation Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
