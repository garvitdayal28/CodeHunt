import { useState } from 'react';
import { Sparkles, MapPin, Calendar, ArrowRight, Clock, Utensils, Hotel, Camera, Loader2, ChevronDown, ChevronUp, ArrowLeft, Tag, DollarSign, Luggage } from 'lucide-react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';

const INTEREST_OPTIONS = ['Beaches', 'Culture', 'Adventure', 'Food', 'Nightlife', 'Nature', 'History', 'Romance', 'Shopping', 'Architecture'];
const BUDGET_OPTIONS = ['Budget', 'Mid-range', 'Luxury'];

const activityIcons = { attraction: Camera, restaurant: Utensils, transport: MapPin, experience: Sparkles };

export default function AITripPlanner() {
  const [step, setStep] = useState('search');         // search → destinations → planning → done
  const [query, setQuery] = useState('');
  const [destinations, setDestinations] = useState([]);
  const [selectedDest, setSelectedDest] = useState(null);
  const [days, setDays] = useState(3);
  const [interests, setInterests] = useState([]);
  const [budget, setBudget] = useState('Mid-range');
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedDay, setExpandedDay] = useState(0);

  const suggestDestinations = async () => {
    if (!query.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await api.post('/ai/suggest-destinations', { query });
      setDestinations(res.data.data || []);
      setStep('destinations');
    } catch (e) { setError(e.response?.data?.message || 'Failed to get suggestions'); }
    finally { setLoading(false); }
  };

  const generatePlan = async () => {
    if (!selectedDest) return;
    setLoading(true); setError(''); setStep('planning');
    try {
      const res = await api.post('/ai/plan-trip', {
        destination: selectedDest.name,
        days,
        interests,
        budget,
      });
      setPlan(res.data.data);
      setStep('done');
      setExpandedDay(0);
    } catch (e) { setError(e.response?.data?.message || 'Failed to generate trip plan'); setStep('configure'); }
    finally { setLoading(false); }
  };

  const toggleInterest = (tag) => {
    setInterests(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const resetAll = () => {
    setStep('search'); setQuery(''); setDestinations([]); setSelectedDest(null);
    setPlan(null); setError(''); setInterests([]); setDays(3); setBudget('Mid-range');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {step !== 'search' && (
          <button onClick={step === 'done' ? resetAll : () => setStep(step === 'configure' ? 'destinations' : 'search')}
            className="p-1.5 rounded-lg hover:bg-surface-sunken transition-colors text-text-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-display-md text-ink">AI Trip Planner</h1>
          </div>
          <p className="text-body-sm text-text-secondary mt-0.5">
            {step === 'search' && 'Tell us what kind of trip you want'}
            {step === 'destinations' && 'Choose a destination to plan'}
            {step === 'configure' && `Configure your trip to ${selectedDest?.name}`}
            {step === 'planning' && 'Crafting your perfect trip...'}
            {step === 'done' && `Your ${plan?.destination} itinerary is ready!`}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-danger-soft border border-danger/20 rounded-lg p-3">
          <p className="text-[13px] text-danger">{error}</p>
        </div>
      )}

      {/* Step 1: Search */}
      {step === 'search' && (
        <div className="space-y-6">
          <div className="bg-white border border-border rounded-xl p-8 text-center">
            <Sparkles className="h-10 w-10 text-primary mx-auto mb-4" />
            <h2 className="text-display-sm text-ink mb-2">Where do you want to go?</h2>
            <p className="text-body-sm text-text-secondary mb-6 max-w-md mx-auto">
              Describe your dream trip and we will suggest the perfect destinations using AI.
            </p>
            <div className="flex gap-3 max-w-lg mx-auto">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && suggestDestinations()}
                placeholder="e.g. Beach holiday in Asia, Cultural tour of Europe..."
                className="flex-1 px-4 py-3 rounded-lg border border-border bg-white text-[14px] text-ink placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
              <Button onClick={suggestDestinations} loading={loading} size="lg" icon={Sparkles}>
                Suggest
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {['Beach holiday in Asia', 'European adventure', 'Weekend getaway India', 'Romantic trip'].map(s => (
                <button key={s} onClick={() => { setQuery(s); }}
                  className="text-[12px] px-3 py-1.5 rounded-full border border-border text-text-secondary hover:text-ink hover:border-primary/30 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Destination Cards */}
      {step === 'destinations' && (
        <div className="space-y-4">
          <p className="text-body-sm text-text-secondary">Based on "{query}" — pick a destination to plan your trip:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {destinations.map((d, i) => (
              <button key={i}
                onClick={() => { setSelectedDest(d); setStep('configure'); }}
                className={`group text-left bg-white border rounded-xl p-5 hover:shadow-md transition-all cursor-pointer animate-fade-in-up stagger-${i + 1} ${
                  selectedDest?.name === d.name ? 'border-primary ring-2 ring-primary/10' : 'border-border'
                }`}>
                <h3 className="text-label-lg text-ink mb-1">{d.name}</h3>
                <p className="text-[12px] text-primary font-medium mb-2">{d.tagline}</p>
                <p className="text-[13px] text-text-secondary leading-relaxed mb-3">{d.description}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {d.best_for?.map(tag => (
                    <span key={tag} className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-primary-soft text-primary">{tag}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[12px] text-text-muted">
                  <span>{d.best_months}</span>
                  <span>~${d.avg_budget_per_day_usd}/day</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Configure Trip */}
      {step === 'configure' && selectedDest && (
        <div className="bg-white border border-border rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <MapPin className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-label-lg text-ink">{selectedDest.name}</h2>
              <p className="text-[13px] text-text-secondary">{selectedDest.tagline}</p>
            </div>
          </div>

          <div>
            <label className="text-label-md text-ink mb-2 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-text-secondary" /> How many days?
            </label>
            <div className="flex gap-2 mt-2">
              {[2, 3, 5, 7, 10].map(d => (
                <button key={d} onClick={() => setDays(d)}
                  className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                    days === d ? 'bg-primary text-white' : 'bg-surface-sunken text-text-secondary hover:text-ink'
                  }`}>
                  {d} days
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-label-md text-ink mb-2 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-text-secondary" /> Your interests
            </label>
            <div className="flex flex-wrap gap-2 mt-2">
              {INTEREST_OPTIONS.map(tag => (
                <button key={tag} onClick={() => toggleInterest(tag)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                    interests.includes(tag)
                      ? 'bg-primary text-white'
                      : 'bg-surface-sunken text-text-secondary hover:text-ink'
                  }`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-label-md text-ink mb-2 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-text-secondary" /> Budget level
            </label>
            <div className="flex gap-2 mt-2">
              {BUDGET_OPTIONS.map(b => (
                <button key={b} onClick={() => setBudget(b)}
                  className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                    budget === b ? 'bg-primary text-white' : 'bg-surface-sunken text-text-secondary hover:text-ink'
                  }`}>
                  {b}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={generatePlan} loading={loading} className="w-full" size="lg" icon={Sparkles}>
            Generate My Trip Plan
          </Button>
        </div>
      )}

      {/* Step 3.5: Loading */}
      {step === 'planning' && (
        <div className="bg-white border border-border rounded-xl p-12 text-center">
          <Loader2 className="h-10 w-10 text-primary mx-auto mb-4 animate-spin" />
          <h2 className="text-display-sm text-ink mb-2">Planning your trip...</h2>
          <p className="text-body-sm text-text-secondary">AI is crafting a personalized {days}-day itinerary for {selectedDest?.name}. This takes ~10 seconds.</p>
        </div>
      )}

      {/* Step 4: Full Plan */}
      {step === 'done' && plan && (
        <div className="space-y-6">
          {/* Overview */}
          <div className="bg-white border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="text-display-sm text-ink">{plan.destination}</h2>
              <span className="text-[12px] px-2 py-0.5 rounded-full bg-primary-soft text-primary font-medium ml-auto">{plan.duration_days} days</span>
            </div>
            <p className="text-body-sm text-text-secondary mb-4">{plan.overview}</p>
            <div className="flex flex-wrap gap-2">
              {plan.highlights?.map((h, i) => (
                <span key={i} className="text-[12px] px-3 py-1 rounded-full bg-gold-soft text-gold font-medium">✨ {h}</span>
              ))}
            </div>
          </div>

          {/* Budget */}
          {plan.estimated_budget && (
            <div className="bg-white border border-border rounded-xl p-5">
              <h3 className="text-label-lg text-ink mb-3 flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-text-secondary" /> Estimated Budget
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Accommodation', value: `$${plan.estimated_budget.accommodation_per_night}/night`, icon: Hotel },
                  { label: 'Food', value: `$${plan.estimated_budget.food_per_day}/day`, icon: Utensils },
                  { label: 'Activities', value: `$${plan.estimated_budget.activities_per_day}/day`, icon: Camera },
                  { label: 'Total Trip', value: `$${plan.estimated_budget.total_estimated}`, icon: DollarSign },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-surface-sunken rounded-lg p-3 text-center">
                    <Icon className="h-4 w-4 text-text-secondary mx-auto mb-1" />
                    <p className="text-[18px] font-semibold text-ink">{value}</p>
                    <p className="text-[11px] text-text-muted">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hotels */}
          {plan.recommended_hotels?.length > 0 && (
            <div className="bg-white border border-border rounded-xl p-5">
              <h3 className="text-label-lg text-ink mb-3 flex items-center gap-1.5">
                <Hotel className="h-4 w-4 text-text-secondary" /> Recommended Hotels
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {plan.recommended_hotels.map((h, i) => (
                  <div key={i} className="border border-border rounded-lg p-4">
                    <h4 className="text-label-md text-ink">{h.name}</h4>
                    <p className="text-[12px] text-primary font-medium">{h.type} · {h.area}</p>
                    <p className="text-[12px] text-text-secondary mt-1">{h.why}</p>
                    <p className="text-[13px] font-semibold text-ink mt-2">{h.price_range}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Day-by-Day Plan */}
          <div className="space-y-3">
            <h3 className="text-display-sm text-ink flex items-center gap-1.5">
              <Calendar className="h-5 w-5 text-text-secondary" /> Day-by-Day Itinerary
            </h3>
            {plan.daily_plan?.map((day, i) => (
              <div key={i} className="bg-white border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedDay(expandedDay === i ? -1 : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-surface-sunken/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white text-[13px] font-semibold">{day.day}</span>
                    <span className="text-label-lg text-ink">{day.title}</span>
                  </div>
                  {expandedDay === i ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
                </button>

                {expandedDay === i && (
                  <div className="px-5 pb-5 border-t border-border pt-4 space-y-3">
                    {/* Activities */}
                    {day.activities?.map((a, j) => {
                      const Icon = activityIcons[a.type] || Camera;
                      return (
                        <div key={j} className="flex gap-3 items-start">
                          <div className="w-7 h-7 rounded-full bg-primary-soft flex items-center justify-center shrink-0 mt-0.5">
                            <Icon className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] text-text-muted font-medium">{a.time}</span>
                              <span className="text-label-md text-ink">{a.name}</span>
                            </div>
                            <p className="text-[13px] text-text-secondary">{a.description}</p>
                            {a.tips && <p className="text-[12px] text-blue mt-0.5">💡 {a.tips}</p>}
                            <span className="text-[11px] text-text-muted">{a.duration}</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Meals */}
                    {day.meals?.length > 0 && (
                      <div className="pt-3 border-t border-border">
                        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-2">Meals</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {day.meals.map((m, k) => (
                            <div key={k} className="bg-surface-sunken rounded-lg p-3">
                              <p className="text-[11px] text-primary font-semibold uppercase">{m.type}</p>
                              <p className="text-label-md text-ink">{m.restaurant}</p>
                              <p className="text-[12px] text-text-secondary">{m.cuisine} · {m.price_range}</p>
                              {m.must_try && <p className="text-[12px] text-gold mt-1">🍽️ Try: {m.must_try}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Tips */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plan.packing_tips?.length > 0 && (
              <div className="bg-white border border-border rounded-xl p-5">
                <h3 className="text-label-lg text-ink mb-3 flex items-center gap-1.5">
                  <Luggage className="h-4 w-4 text-text-secondary" /> Packing Tips
                </h3>
                <ul className="space-y-1.5">
                  {plan.packing_tips.map((t, i) => (
                    <li key={i} className="text-[13px] text-text-secondary flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span> {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {plan.local_tips?.length > 0 && (
              <div className="bg-white border border-border rounded-xl p-5">
                <h3 className="text-label-lg text-ink mb-3 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-text-secondary" /> Local Tips
                </h3>
                <ul className="space-y-1.5">
                  {plan.local_tips.map((t, i) => (
                    <li key={i} className="text-[13px] text-text-secondary flex items-start gap-2">
                      <span className="text-gold mt-0.5">•</span> {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Button onClick={resetAll} variant="secondary" className="w-full">Plan Another Trip</Button>
        </div>
      )}
    </div>
  );
}
