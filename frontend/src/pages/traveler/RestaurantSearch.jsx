import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';

import api from '../../api/axios';
import RestaurantCard from '../../components/restaurant/RestaurantCard';
import RestaurantFiltersBar from '../../components/restaurant/RestaurantFiltersBar';

function buildSearchParams(filters) {
    const params = new URLSearchParams();
    if (filters.destination) params.set('destination', filters.destination.trim());
    if (filters.cuisine) params.set('cuisine', filters.cuisine.trim());
    if (filters.sortBy) params.set('sort_by', filters.sortBy);
    return params;
}

export default function RestaurantSearch() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [filters, setFilters] = useState({
        destination: searchParams.get('destination') || '',
        cuisine: searchParams.get('cuisine') || '',
        sortBy: searchParams.get('sort_by') || 'name_asc',
    });

    const [restaurants, setRestaurants] = useState([]);
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
            const res = await api.get(`/search/restaurants?${params.toString()}`);
            setRestaurants(res?.data?.data || []);
        } catch (err) {
            setRestaurants([]);
            setError(err?.response?.data?.message || 'Unable to search restaurants right now.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (filters.destination) doSearch(filters);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        doSearch(filters);
    };

    const handleViewMenu = (restaurant) => {
        const params = buildSearchParams(filters);
        navigate(`/traveler/restaurants/${restaurant.id}?${params.toString()}`, {
            state: { restaurant, filters },
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-display-md text-ink">Restaurants</h1>
                <p className="text-body-sm text-text-secondary mt-1">
                    Find the best places to eat, browse menus, and discover local cuisines.
                </p>
            </div>

            <RestaurantFiltersBar value={filters} onChange={setFilters} onSubmit={handleSubmit} loading={loading} />

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
            ) : restaurants.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {restaurants.map((restaurant) => (
                        <RestaurantCard key={restaurant.id} restaurant={restaurant} onViewMenu={handleViewMenu} />
                    ))}
                </div>
            ) : searched ? (
                <div className="text-center py-14 border border-border rounded-xl bg-white">
                    <Search className="h-10 w-10 text-text-placeholder mx-auto mb-2" />
                    <p className="text-body-lg text-ink font-medium">No restaurants found</p>
                    <p className="text-body-sm text-text-secondary mt-1">Try adjusting the city or cuisine type.</p>
                </div>
            ) : null}
        </div>
    );
}
