import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar } from 'lucide-react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function CreateItinerary() {
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!destination || !startDate || !endDate) {
      setError('All fields are required.');
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError('End date must be after start date.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/itineraries', { destination, start_date: startDate, end_date: endDate });
      const id = res.data.data?.id;
      navigate(id ? `/traveler/itineraries/${id}` : '/traveler/itineraries');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create itinerary.');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-display-md text-ink">Plan a new trip</h1>
        <p className="text-body-sm text-text-secondary mt-1">Where are you headed? We'll help you put it all together.</p>
      </div>

      {error && (
        <div className="bg-danger-soft border border-danger/20 rounded-lg p-3 mb-5">
          <p className="text-[13px] text-danger">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-border p-6 space-y-5">
        <Input
          label="Destination"
          type="text"
          required
          icon={MapPin}
          placeholder="e.g. Goa, India"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start date"
            type="date"
            required
            icon={Calendar}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="End date"
            type="date"
            required
            icon={Calendar}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Create Trip
        </Button>
      </form>
    </div>
  );
}
