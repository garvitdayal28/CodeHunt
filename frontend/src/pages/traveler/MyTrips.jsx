import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MapPin, Calendar, ChevronRight } from 'lucide-react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';

export default function MyTrips() {
  const [itineraries, setItineraries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/itineraries');
        setItineraries(res.data.data || []);
      } catch {
        setItineraries([
          { id: 'demo1', destination: 'Goa, India', start_date: '2026-03-01', end_date: '2026-03-05', status: 'ON_TRACK', created_at: new Date().toISOString() },
          { id: 'demo2', destination: 'Bali, Indonesia', start_date: '2026-04-10', end_date: '2026-04-17', status: 'DRAFT', created_at: new Date().toISOString() },
        ]);
      } finally { setLoading(false); }
    };
    fetch();
  }, []);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-md text-ink">My Trips</h1>
          <p className="text-body-sm text-text-secondary mt-1">All your planned and upcoming itineraries.</p>
        </div>
        <Link to="/traveler/itineraries/new">
          <Button icon={Plus}>New Trip</Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2].map(i => <div key={i} className="h-36 bg-surface-sunken rounded-xl animate-pulse" />)}
        </div>
      ) : itineraries.length === 0 ? (
        <div className="text-center py-16 border border-border rounded-xl bg-white">
          <MapPin className="h-10 w-10 text-text-placeholder mx-auto mb-3" />
          <p className="text-body-lg text-ink font-medium">No trips yet</p>
          <p className="text-body-sm text-text-secondary mt-1 mb-4">Plan your first adventure!</p>
          <Link to="/traveler/itineraries/new"><Button icon={Plus}>Create Trip</Button></Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {itineraries.map((itin, i) => (
            <Link key={itin.id} to={`/traveler/itineraries/${itin.id}`}
              className={`group bg-white border border-border rounded-xl p-5 hover:shadow-md transition-shadow animate-fade-in-up stagger-${i + 1}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" strokeWidth={1.75} />
                  <h3 className="text-label-lg text-ink">{itin.destination}</h3>
                </div>
                <StatusBadge status={itin.status} />
              </div>
              <div className="flex items-center gap-4 text-body-sm text-text-secondary">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <span>{formatDate(itin.start_date)} — {formatDate(itin.end_date)}</span>
                </div>
              </div>
              <div className="flex items-center justify-end mt-3 text-[13px] text-text-muted group-hover:text-primary transition-colors">
                View details <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
