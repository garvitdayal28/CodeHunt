import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Star, MapPin, Wifi, Waves } from 'lucide-react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function HotelSearch() {
  const [searchParams] = useSearchParams();
  const [destination, setDestination] = useState(searchParams.get('destination') || '');
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = async (dest) => {
    if (!dest) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get(`/search/hotels?destination=${encodeURIComponent(dest)}`);
      setHotels(res.data.data || []);
    } catch {
      // Fallback demo data
      setHotels([
        { id: '1', name: 'The Grand Horizon', location: 'Goa, India', star_rating: 5, price_range: { min: 8000, max: 25000 }, amenities: ['Pool', 'Spa', 'Wi-Fi', 'Beach Access'], image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&h=300&fit=crop' },
        { id: '2', name: 'Mountain Retreat Lodge', location: 'Manali, India', star_rating: 4, price_range: { min: 3000, max: 12000 }, amenities: ['Fireplace', 'Hiking', 'Wi-Fi'], image_url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=500&h=300&fit=crop' },
        { id: '3', name: 'Seaside Villa Resort', location: 'Bali, Indonesia', star_rating: 5, price_range: { min: 15000, max: 50000 }, amenities: ['Private Pool', 'Spa', 'Butler', 'Beach'], image_url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=500&h=300&fit=crop' },
      ]);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (destination) doSearch(destination);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    doSearch(destination);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-md text-ink">Find Hotels</h1>
        <p className="text-body-sm text-text-secondary mt-1">Search and compare hotels by destination.</p>
      </div>

      <form onSubmit={handleSearch} className="flex items-end gap-3">
        <Input label="Destination" icon={Search} placeholder="Where are you going?"
          value={destination} onChange={(e) => setDestination(e.target.value)} className="flex-1" />
        <Button type="submit" loading={loading} size="lg">Search</Button>
      </form>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-72 bg-surface-sunken rounded-xl animate-pulse" />)}
        </div>
      ) : hotels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hotels.map((hotel, i) => (
            <div key={hotel.id}
              className={`group bg-white border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer animate-fade-in-up stagger-${i + 1}`}
            >
              <div className="relative h-44 overflow-hidden">
                <img src={hotel.image_url} alt={hotel.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur rounded-lg px-2 py-1 flex items-center gap-1">
                  <Star className="h-3 w-3 text-gold fill-gold" />
                  <span className="text-[12px] font-semibold text-ink">{hotel.star_rating}</span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-label-lg text-ink mb-1">{hotel.name}</h3>
                <div className="flex items-center gap-1 text-body-sm text-text-secondary mb-3">
                  <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <span>{hotel.location}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {hotel.amenities?.slice(0, 3).map(a => (
                    <span key={a} className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-surface-sunken text-text-secondary">{a}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div>
                    <span className="text-[18px] font-semibold text-ink">₹{hotel.price_range?.min?.toLocaleString()}</span>
                    <span className="text-[12px] text-text-muted"> / night</span>
                  </div>
                  <Button size="sm">View Rooms</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : searched ? (
        <div className="text-center py-16 border border-border rounded-xl bg-white">
          <Search className="h-10 w-10 text-text-placeholder mx-auto mb-3" />
          <p className="text-body-lg text-ink font-medium">No hotels found</p>
          <p className="text-body-sm text-text-secondary mt-1">Try a different destination.</p>
        </div>
      ) : null}
    </div>
  );
}
