import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, UtensilsCrossed, MapPin, Clock, Users } from 'lucide-react';

import api from '../../api/axios';
import MenuItemCard from '../../components/restaurant/MenuItemCard';
import Button from '../../components/ui/Button';

export default function RestaurantDetail() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [restaurant, setRestaurant] = useState(location.state?.restaurant || null);
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState('');

    const [loading, setLoading] = useState(!restaurant);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchMenu = async () => {
            try {
                setLoading(true);
                setError('');
                const res = await api.get(`/search/restaurants/${id}/menu`);
                const data = res?.data?.data;
                if (data) {
                    setRestaurant(data.restaurant);
                    setMenuItems(data.menu_items || []);
                    setCategories(data.restaurant.categories || []);
                    if (data.restaurant.categories?.length > 0) {
                        setActiveCategory(data.restaurant.categories[0]);
                    }
                }
            } catch (err) {
                setError(err?.response?.data?.message || 'Failed to load restaurant details.');
            } finally {
                setLoading(false);
            }
        };
        fetchMenu();
    }, [id]);

    const goBack = () => {
        if (location.key !== 'default') {
            navigate(-1);
        } else {
            navigate('/traveler/restaurants');
        }
    };

    if (loading && !restaurant) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-64 bg-surface-sunken rounded-2xl" />
                <div className="h-8 w-1/3 bg-surface-sunken rounded" />
                <div className="h-4 w-1/4 bg-surface-sunken rounded" />
                <div className="h-32 bg-surface-sunken rounded-xl" />
            </div>
        );
    }

    if (error && !restaurant) {
        return (
            <div className="text-center py-12">
                <p className="text-danger bg-danger-soft p-4 rounded-xl inline-block">{error}</p>
                <div className="mt-4">
                    <Button variant="secondary" onClick={goBack}>Go Back</Button>
                </div>
            </div>
        );
    }

    const displayedItems = activeCategory
        ? menuItems.filter((i) => i.category === activeCategory)
        : menuItems;

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            <button
                onClick={goBack}
                className="flex items-center gap-1 text-[13px] font-medium text-text-secondary hover:text-ink transition-colors"
            >
                <ChevronLeft className="h-4 w-4" /> Back to Search
            </button>

            {/* Hero Header */}
            <div className="relative rounded-3xl overflow-hidden bg-surface-sunken">
                <img
                    src={restaurant.image_url || '/placeholder-restaurant.jpg'}
                    alt={restaurant.name}
                    className="w-full h-64 md:h-80 object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        {restaurant.cuisine && (
                            <span className="px-3 py-1 bg-primary text-white rounded-full text-[12px] font-medium tracking-wide">
                                {restaurant.cuisine}
                            </span>
                        )}
                    </div>
                    <h1 className="text-display-lg text-white mb-2">{restaurant.name}</h1>
                    <div className="flex items-center gap-4 text-white/80 text-[14px]">
                        <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {restaurant.location}</span>
                    </div>
                </div>
            </div>

            {/* Details Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-border shadow-sm flex items-start gap-4">
                    <div className="p-2.5 bg-blue-soft text-blue rounded-xl shrink-0"><MapPin className="h-5 w-5" /></div>
                    <div>
                        <p className="text-[12px] text-text-secondary font-medium uppercase tracking-wider mb-0.5">Address</p>
                        <p className="text-[14px] text-ink font-medium leading-tight">{restaurant.address || 'Address unavailable'}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-border shadow-sm flex items-start gap-4">
                    <div className="p-2.5 bg-green-50 text-success rounded-xl shrink-0"><Clock className="h-5 w-5" /></div>
                    <div>
                        <p className="text-[12px] text-text-secondary font-medium uppercase tracking-wider mb-0.5">Hours</p>
                        <p className="text-[14px] text-ink font-medium leading-tight">{restaurant.opening_hours || 'Hours unavailable'}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-border shadow-sm flex items-start gap-4">
                    <div className="p-2.5 bg-amber-50 text-warning rounded-xl shrink-0"><Users className="h-5 w-5" /></div>
                    <div>
                        <p className="text-[12px] text-text-secondary font-medium uppercase tracking-wider mb-0.5">Capacity</p>
                        <p className="text-[14px] text-ink font-medium leading-tight">{restaurant.seating_capacity ? `Seats ${restaurant.seating_capacity}` : 'Contact for capacity'}</p>
                    </div>
                </div>
            </div>

            {/* Description */}
            {restaurant.description && (
                <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                    <h2 className="text-display-sm text-ink mb-3">About this Restaurant</h2>
                    <p className="text-body-md text-text-secondary leading-relaxed whitespace-pre-wrap">
                        {restaurant.description}
                    </p>
                </div>
            )}

            {/* Menu Section */}
            <div className="pt-4">
                <h2 className="text-display-sm text-ink mb-6">Menu</h2>

                {categories.length > 0 && (
                    <div className="flex overflow-x-auto gap-2 pb-4 mb-2 custom-scrollbar">
                        <button
                            onClick={() => setActiveCategory('')}
                            className={`px-4 py-2 rounded-xl text-[14px] font-medium whitespace-nowrap transition-colors ${activeCategory === ''
                                    ? 'bg-ink text-white'
                                    : 'bg-white text-text-secondary border border-border hover:border-ink hover:text-ink'
                                }`}
                        >
                            All Items
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-4 py-2 rounded-xl text-[14px] font-medium whitespace-nowrap transition-colors ${activeCategory === cat
                                        ? 'bg-ink text-white'
                                        : 'bg-white text-text-secondary border border-border hover:border-ink hover:text-ink'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[...Array(4)].map((_, idx) => (
                            <div key={idx} className="h-40 bg-surface-sunken rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : menuItems.length === 0 ? (
                    <div className="text-center py-12 border border-border bg-white rounded-2xl">
                        <UtensilsCrossed className="h-10 w-10 text-text-placeholder mx-auto mb-3" />
                        <p className="text-body-lg text-ink font-medium">Menu is empty</p>
                        <p className="text-body-sm text-text-secondary mt-1">Check back later for updates.</p>
                    </div>
                ) : displayedItems.length === 0 ? (
                    <p className="text-body-md text-text-secondary text-center py-8">No items in this category.</p>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {displayedItems.map((item) => (
                            <MenuItemCard
                                key={item.id}
                                item={item}
                                variant="traveler"
                                showActions={false}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
