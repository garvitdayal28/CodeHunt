import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';

import api from '../../api/axios';
import RestaurantCard from '../../components/restaurant/RestaurantCard';
import RestaurantFiltersBar from '../../components/restaurant/RestaurantFiltersBar';
import EmptyState from '../../components/ui/EmptyState';
import HeroHeader from '../../components/ui/HeroHeader';
import { SkeletonCard } from '../../components/ui/Skeleton';

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
            <HeroHeader
                title="Savor Local Flavors"
                description="Find the best places to eat, browse menus, and discover authentic local cuisines."
                image="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&h=400&fit=crop&q=80"
            />

            <RestaurantFiltersBar value={filters} onChange={setFilters} onSubmit={handleSubmit} loading={loading} />

            {error && (
                <div className="bg-danger-soft border border-danger/20 rounded-lg p-3">
                    <p className="text-[13px] text-danger">{error}</p>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, idx) => (
                        <SkeletonCard key={idx} className="h-88" bodyLines={2} />
                    ))}
                </div>
            ) : restaurants.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {restaurants.map((restaurant) => (
                        <RestaurantCard key={restaurant.id} restaurant={restaurant} onViewMenu={handleViewMenu} />
                    ))}
                </div>
            ) : searched ? (
                <EmptyState
                    icon={Search}
                    title="No restaurants found"
                    description="Try adjusting the city or cuisine type."
                />
            ) : null}
        </div>
    );
}
