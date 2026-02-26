import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Calendar, Hotel, Compass, Clock, ArrowLeft, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import Card from '../../components/ui/Card';

export default function ItineraryDetail() {
  const { id } = useParams();
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/itineraries/${id}`);
        setItinerary(res.data.data);
      } catch {
        setItinerary({
          id, destination: 'Goa, India',
          start_date: '2026-03-01', end_date: '2026-03-05', status: 'ON_TRACK',
          bookings: [
            { id: 'b1', property_name: 'The Grand Horizon', room_type: 'Deluxe', check_in_date: '2026-03-01', check_out_date: '2026-03-05', status: 'CONFIRMED' },
          ],
          activities: [
            { id: 'a1', tour_name: 'Sunset Beach Cruise', scheduled_time: '2026-03-03T17:00:00', status: 'UPCOMING' },
          ],
        });
      } finally { setLoading(false); }
    };
    fetch();
  }, [id]);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const formatDateTime = (d) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-surface-sunken rounded-lg animate-pulse" />
        <div className="h-40 bg-surface-sunken rounded-xl animate-pulse" />
        <div className="h-24 bg-surface-sunken rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!itinerary) {
    return <div className="text-center py-16"><p className="text-body-lg text-text-secondary">Itinerary not found.</p></div>;
  }

  // Build unified timeline
  const timeline = [
    ...(itinerary.bookings || []).map(b => ({
      type: 'hotel', date: b.check_in_date, title: b.property_name,
      subtitle: `${b.room_type} · ${formatDate(b.check_in_date)} — ${formatDate(b.check_out_date)}`,
      status: b.status, icon: Hotel,
    })),
    ...(itinerary.activities || []).map(a => ({
      type: 'activity', date: a.scheduled_time, title: a.tour_name,
      subtitle: formatDateTime(a.scheduled_time),
      status: a.status, icon: Compass,
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="space-y-6 max-w-3xl">
      <Link to="/traveler/itineraries" className="inline-flex items-center gap-1 text-[13px] text-text-secondary hover:text-ink transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to My Trips
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-5 w-5 text-primary" strokeWidth={1.75} />
            <h1 className="text-display-md text-ink">{itinerary.destination}</h1>
          </div>
          <div className="flex items-center gap-3 text-body-sm text-text-secondary">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(itinerary.start_date)} — {formatDate(itinerary.end_date)}</span>
            </div>
            <StatusBadge status={itinerary.status} />
          </div>
        </div>
        <Button variant="secondary" size="sm" icon={AlertTriangle}>
          Report Disruption
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link to={`/traveler/hotels?destination=${encodeURIComponent(itinerary.destination)}`}>
          <Button variant="secondary" size="sm" icon={Hotel}>Add Hotel</Button>
        </Link>
        <Link to={`/traveler/search/tours?destination=${encodeURIComponent(itinerary.destination)}`}>
          <Button variant="secondary" size="sm" icon={Compass}>Add Activity</Button>
        </Link>
      </div>

      {/* Timeline */}
      <div>
        <h2 className="text-display-sm text-ink mb-4">Itinerary Timeline</h2>
        {timeline.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <Clock className="h-8 w-8 text-text-placeholder mx-auto mb-2" />
              <p className="text-body-sm text-text-secondary">No bookings or activities yet. Start by adding a hotel or tour!</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-0">
            {timeline.map((item, i) => (
              <div key={i} className="flex gap-4 relative">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    item.type === 'hotel' ? 'bg-blue-soft text-blue' : 'bg-gold-soft text-gold'
                  }`}>
                    <item.icon className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  {i < timeline.length - 1 && (
                    <div className="w-px flex-1 bg-border min-h-[24px]" />
                  )}
                </div>
                {/* Content */}
                <div className="pb-6 flex-1">
                  <div className="bg-white border border-border rounded-lg p-4 hover:shadow-xs transition-shadow">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-label-lg text-ink">{item.title}</h3>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-body-sm text-text-secondary">{item.subtitle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
