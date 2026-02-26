import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Clock, Users, MapPin, Star, Tag } from 'lucide-react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const categoryColors = {
  Adventure:    'bg-primary-soft text-primary',
  Cultural:     'bg-gold-soft text-gold',
  'Water Sports': 'bg-blue-soft text-blue',
  Walking:      'bg-success-soft text-success',
  Trekking:     'bg-primary-soft text-primary',
};

export default function TourSearch() {
  const [searchParams] = useSearchParams();
  const [destination, setDestination] = useState(searchParams.get('destination') || '');
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = async (dest) => {
    if (!dest) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get(`/search/tours?destination=${encodeURIComponent(dest)}`);
      setTours(res.data.data || []);
    } catch {
      setTours([
        { id: '1', name: 'Sunset Beach Cruise', location: 'Goa, India', duration_hours: 2, price: 2500, category: ['Adventure', 'Water Sports'], image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=500&h=300&fit=crop' },
        { id: '2', name: 'Temple Trail Walk', location: 'Bali, Indonesia', duration_hours: 3, price: 1800, category: ['Cultural', 'Walking'], image_url: 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=500&h=300&fit=crop' },
        { id: '3', name: 'Mountain Trekking Adventure', location: 'Manali, India', duration_hours: 8, price: 3500, category: ['Adventure', 'Trekking'], image_url: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=500&h=300&fit=crop' },
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
        <h1 className="text-display-md text-ink">Find Tours & Activities</h1>
        <p className="text-body-sm text-text-secondary mt-1">Discover experiences at your destination.</p>
      </div>

      <form onSubmit={handleSearch} className="flex items-end gap-3">
        <Input label="Destination" icon={Search} placeholder="Search by location..."
          value={destination} onChange={(e) => setDestination(e.target.value)} className="flex-1" />
        <Button type="submit" loading={loading} size="lg">Search</Button>
      </form>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-72 bg-surface-sunken rounded-xl animate-pulse" />)}
        </div>
      ) : tours.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tours.map((tour, i) => (
            <div key={tour.id}
              className={`group bg-white border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer animate-fade-in-up stagger-${i + 1}`}
            >
              <div className="relative h-44 overflow-hidden">
                <img src={tour.image_url} alt={tour.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
                  {tour.category?.map(c => (
                    <span key={c} className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${categoryColors[c] || 'bg-surface-sunken text-text-secondary'}`}>{c}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div>
                    <span className="text-[18px] font-semibold text-ink">₹{tour.price?.toLocaleString()}</span>
                    <span className="text-[12px] text-text-muted"> / person</span>
                  </div>
                  <Button size="sm">Book Now</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : searched ? (
        <div className="text-center py-16 border border-border rounded-xl bg-white">
          <Search className="h-10 w-10 text-text-placeholder mx-auto mb-3" />
          <p className="text-body-lg text-ink font-medium">No tours found</p>
          <p className="text-body-sm text-text-secondary mt-1">Try a different destination.</p>
        </div>
      ) : null}
    </div>
  );
}
