import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { MapPin, Star, Wifi, Coffee, Wind, Car, Users, ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import Button from '../../components/ui/Button';

// Mock room types based on standard hotel API responses
const ROOM_TYPES = [
  { id: 'standard', name: 'Standard Room', capacity: 2, priceMultiplier: 1, desc: 'Comfortable room with essential amenities.' },
  { id: 'deluxe', name: 'Deluxe Room', capacity: 3, priceMultiplier: 1.4, desc: 'Spacious room with a city view and premium bedding.' },
  { id: 'suite', name: 'Executive Suite', capacity: 4, priceMultiplier: 2.5, desc: 'Luxury suite with a separate living area and ocean views.' },
];

export default function HotelDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const hotel = location.state?.hotel; // Passed from HotelSearch.jsx

  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(ROOM_TYPES[0]);

  // If no hotel data is passed via state, we realistically would fetch it here by ID.
  // For this demo, we assume the user clicked through from the search page.
  useEffect(() => {
    if (!hotel) {
      navigate('/traveler/search/hotels');
    }
  }, [hotel, navigate]);

  if (!hotel) return null;

  const basePrice = hotel.price_per_night || hotel.price_range?.min || 5000;

  const handleBookNow = () => {
    if (!checkIn || !checkOut) {
      alert('Please select check-in and check-out dates.');
      return;
    }
    
    // Navigate to confirmation page, passing the booking details
    navigate('/traveler/booking/confirm', {
      state: {
        hotel,
        booking: {
          checkIn,
          checkOut,
          roomType: selectedRoom.name,
          roomId: selectedRoom.id,
          pricePerNight: Math.round(basePrice * selectedRoom.priceMultiplier),
        }
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary hover:text-ink transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to search
      </button>

      {/* Header & Images */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-display-md text-ink mb-2">{hotel.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-body-sm text-text-secondary">
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" /> {hotel.location}</span>
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-gold fill-gold" /> {hotel.star_rating} ({hotel.review_score} review score)
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[28px] font-semibold text-ink">₹{basePrice.toLocaleString()}</p>
            <p className="text-body-sm text-text-muted mt-1">Starting price per night</p>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 h-[400px] rounded-2xl overflow-hidden">
          <div className="md:col-span-2 h-full">
            <img src={hotel.image_url} alt={hotel.name} className="w-full h-full object-cover" />
          </div>
          <div className="grid grid-rows-2 gap-2 h-full hidden md:grid">
            <img src={hotel.image_url.replace('max500', 'max1000')} alt="Hotel View" className="w-full h-full object-cover" />
            <div className="bg-surface-sunken flex items-center justify-center relative overflow-hidden group">
              <img src={hotel.image_url} alt="Hotel View 2" className="w-full h-full object-cover blur-sm brightness-75 transition-all group-hover:blur-none group-hover:brightness-100" />
              <span className="absolute text-white font-semibold text-label-lg drop-shadow-md">+ More</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* About */}
          <section>
            <h2 className="text-display-sm text-ink mb-4">About this property</h2>
            <p className="text-body-md text-text-secondary leading-relaxed">
              Experience the perfect blend of comfort and luxury at {hotel.name}. Located in the heart of {hotel.location}, 
              this beautiful property offers top-notch amenities, exceptionally designed rooms, and world-class service to ensure 
              an unforgettable stay. Whether you're here for business or leisure, everything you need is right at your fingertips.
            </p>
          </section>

          {/* Amenities */}
          <section>
            <h2 className="text-display-sm text-ink mb-4">Popular Amenities</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {['Free Wi-Fi', 'Swimming Pool', 'Air Conditioning', 'Room Service', 'Restaurant', '24/7 Front Desk'].map((am, i) => (
                <div key={i} className="flex items-center gap-2 text-text-secondary text-body-sm">
                  {i % 3 === 0 ? <Wifi className="h-4 w-4" /> : i % 3 === 1 ? <Wind className="h-4 w-4" /> : <Coffee className="h-4 w-4" />}
                  {am}
                </div>
              ))}
            </div>
          </section>

          {/* Room Selection */}
          <section>
            <h2 className="text-display-sm text-ink mb-4">Available Rooms</h2>
            <div className="space-y-4">
              {ROOM_TYPES.map(room => {
                const price = Math.round(basePrice * room.priceMultiplier);
                const isSelected = selectedRoom.id === room.id;
                return (
                  <div key={room.id} 
                    onClick={() => setSelectedRoom(room)}
                    className={`border rounded-xl p-5 cursor-pointer transition-all ${
                      isSelected ? 'border-primary ring-1 ring-primary/20 bg-primary-soft/30' : 'border-border bg-white hover:border-text-placeholder'
                    }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-label-lg text-ink font-semibold">{room.name}</h3>
                        <p className="text-body-sm text-text-secondary mt-1">{room.desc}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[18px] font-semibold text-ink">₹{price.toLocaleString()}</span>
                        <span className="text-[12px] text-text-muted block">/ night</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[12px] text-text-muted mt-3">
                      <Users className="h-3.5 w-3.5" /> Sleeps up to {room.capacity}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Booking Widget */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 bg-white border border-border rounded-2xl shadow-sm p-6 space-y-5">
            <h3 className="text-display-sm text-ink">Book your stay</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-label-sm text-text-secondary mb-1.5 flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" /> Check-in Date
                </label>
                <input 
                  type="date" 
                  value={checkIn}
                  onChange={e => setCheckIn(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-body-sm"
                />
              </div>
              <div>
                <label className="text-label-sm text-text-secondary mb-1.5 flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" /> Check-out Date
                </label>
                <input 
                  type="date" 
                  value={checkOut}
                  onChange={e => setCheckOut(e.target.value)}
                  min={checkIn || new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-body-sm"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border mt-4">
              <div className="flex justify-between text-body-sm text-text-secondary mb-2">
                <span>Selected Room</span>
                <span className="font-medium text-ink">{selectedRoom.name}</span>
              </div>
              <div className="flex justify-between text-label-lg text-ink mt-3 pt-3 border-t border-border/50">
                <span>Price per night</span>
                <span>₹{Math.round(basePrice * selectedRoom.priceMultiplier).toLocaleString()}</span>
              </div>
            </div>

            <Button onClick={handleBookNow} className="w-full" size="lg">
              Continue to Booking
            </Button>
            <p className="text-[12px] text-center text-text-muted mt-3">You won't be charged yet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
