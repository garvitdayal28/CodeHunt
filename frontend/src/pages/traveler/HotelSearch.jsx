import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';

import api from '../../api/axios';
import HotelCard from '../../components/hotel/HotelCard';
import HotelFiltersBar from '../../components/hotel/HotelFiltersBar';

function buildSearchParams(filters) {
  const params = new URLSearchParams();
  if (filters.destination) params.set('destination', filters.destination.trim());
  if (filters.checkin) params.set('checkin', filters.checkin);
  if (filters.checkout) params.set('checkout', filters.checkout);
  if (filters.rooms) params.set('rooms', filters.rooms);
  if (filters.adults) params.set('adults', filters.adults);
  if (filters.children !== '') params.set('children', filters.children);
  if (filters.priceMin) params.set('price_min', filters.priceMin);
  if (filters.priceMax) params.set('price_max', filters.priceMax);
  if (filters.sortBy) params.set('sort_by', filters.sortBy);
  return params;
}

export default function HotelSearch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [filters, setFilters] = useState({
    destination: searchParams.get('destination') || '',
    checkin: searchParams.get('checkin') || '',
    checkout: searchParams.get('checkout') || '',
    rooms: searchParams.get('rooms') || '1',
    adults: searchParams.get('adults') || '2',
    children: searchParams.get('children') || '0',
    priceMin: searchParams.get('price_min') || '',
    priceMax: searchParams.get('price_max') || '',
    sortBy: searchParams.get('sort_by') || 'price_asc',
  });

  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const doSearch = async (activeFilters) => {
    if (!activeFilters.destination?.trim()) return;
    try {
      setLoading(true);
      setError('');
      setSearched(true);
      const params = buildSearchParams(activeFilters);
      const res = await api.get(`/search/hotels?${params.toString()}`);
      setHotels(res?.data?.data || []);
    } catch (err) {
      setHotels([]);
      setError(err?.response?.data?.message || 'Unable to search hotels right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filters.destination) doSearch(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    doSearch(filters);
  };

  const handleViewRooms = (hotel) => {
    const params = buildSearchParams(filters);
    navigate(`/traveler/hotels/${hotel.id}?${params.toString()}`, {
      state: { hotel, filters },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-md text-ink">Hotels</h1>
        <p className="text-body-sm text-text-secondary mt-1">
          Search city hotels, compare room inventory, and book with your trip itinerary.
        </p>
      </div>

      <HotelFiltersBar value={filters} onChange={setFilters} onSubmit={handleSubmit} loading={loading} />

      {error && (
        <div className="bg-danger-soft border border-danger/20 rounded-lg p-3">
          <p className="text-[13px] text-danger">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="h-80 bg-surface-sunken rounded-xl animate-pulse" />
          ))}
        </div>
      ) : hotels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hotels.map((hotel) => (
            <HotelCard key={hotel.id} hotel={hotel} onViewRooms={handleViewRooms} />
          ))}
        </div>
      ) : searched ? (
        <div className="text-center py-14 border border-border rounded-xl bg-white">
          <Search className="h-10 w-10 text-text-placeholder mx-auto mb-2" />
          <p className="text-body-lg text-ink font-medium">No hotels found</p>
          <p className="text-body-sm text-text-secondary mt-1">Try adjusting city, guests, rooms, or price filters.</p>
        </div>
      ) : null}
    </div>
  );
}
