import { useState } from 'react';
import { Search, MapPin, Calendar, Users, Star, ArrowRight } from 'lucide-react';
import Button from '../../components/ui/Button';

const destinations = [
  {
    name: 'Bali, Indonesia',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&h=300&fit=crop',
    rating: 4.8,
    tag: 'Trending',
  },
  {
    name: 'Santorini, Greece',
    image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&h=300&fit=crop',
    rating: 4.9,
    tag: 'Popular',
  },
  {
    name: 'Kyoto, Japan',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=300&fit=crop',
    rating: 4.7,
    tag: 'Cultural',
  },
  {
    name: 'Maldives',
    image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=400&h=300&fit=crop',
    rating: 4.9,
    tag: 'Luxury',
  },
];

const tagColors = {
  Trending: 'bg-primary-soft text-primary',
  Popular:  'bg-blue-soft text-blue',
  Cultural: 'bg-gold-soft text-gold',
  Luxury:   'bg-primary-soft text-primary',
};

export default function TravelerDashboard() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="-mx-4 sm:-mx-6 -mt-6">
      {/* ── Hero Section ── */}
      <div className="relative w-full h-[420px] overflow-hidden rounded-b-2xl">
        {/* Background Image */}
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&h=900&fit=crop&q=80"
          alt="Beach at sunset"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-linear-to-b from-black/40 via-black/30 to-black/60" />

        {/* Content */}
        <div className="relative h-full flex flex-col items-center justify-center px-6 text-center">
          <h1 className="text-display-xl text-white mb-3 drop-shadow-lg">
            Plan Your Perfect Trip
          </h1>
          <p className="text-body-lg text-white/70 mb-8 max-w-lg">
            Discover destinations, book hotels and tours — all in sync with your travel plans.
          </p>

          {/* Search Bar */}
          <div className="w-full max-w-2xl">
            <div className="bg-white rounded-2xl shadow-xl p-2 flex items-center gap-2">
              <div className="flex-1 flex items-center gap-3 px-4">
                <Search className="h-5 w-5 text-text-muted shrink-0" strokeWidth={1.75} />
                <input
                  type="text"
                  placeholder="Where do you want to go?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full py-2.5 text-[15px] text-ink placeholder-text-placeholder outline-none bg-transparent"
                />
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 border-l border-border">
                <Calendar className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
                <span className="text-[13px] text-text-muted whitespace-nowrap">Any dates</span>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 border-l border-border">
                <Users className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
                <span className="text-[13px] text-text-muted whitespace-nowrap">2 guests</span>
              </div>
              <Button size="lg" className="shrink-0 rounded-xl">
                Start Planning
              </Button>
            </div>
          </div>

          {/* Tagline */}
          <p className="text-[13px] text-white/40 mt-4">
            Your ultimate trip planner designed to simplify the way you travel.
          </p>
        </div>
      </div>

      {/* ── Popular Destinations ── */}
      <div className="px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-display-md text-ink">Popular Destinations</h2>
            <p className="text-body-sm text-text-secondary mt-1">
              Discover, plan, and experience unforgettable journeys.
            </p>
          </div>
          <Button variant="ghost" size="sm" icon={ArrowRight} className="hidden sm:flex">
            View all
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {destinations.map((dest, i) => (
            <div
              key={dest.name}
              className={`
                group rounded-xl overflow-hidden border border-border bg-white shadow-xs
                hover:shadow-md transition-shadow duration-200 cursor-pointer
                animate-fade-in-up stagger-${i + 1}
              `}
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase ${tagColors[dest.tag]}`}>
                  {dest.tag}
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-label-lg text-ink">{dest.name}</h3>
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-gold fill-gold" strokeWidth={1.75} />
                    <span className="text-[13px] font-medium text-ink">{dest.rating}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  <MapPin className="h-3.5 w-3.5 text-text-muted" strokeWidth={1.75} />
                  <span className="text-body-sm text-text-secondary">{dest.name.split(',')[1]?.trim() || 'Explore'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
