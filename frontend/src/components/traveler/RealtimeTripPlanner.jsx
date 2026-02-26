import { useEffect, useMemo, useState } from 'react';
import { Calendar, Loader2, MapPin, Plane, Sparkles, Train } from 'lucide-react';

import api from '../../api/axios';
import { usePlannerSocket } from '../../hooks/usePlannerSocket';
import LiveIndicator from '../ui/LiveIndicator';
import Button from '../ui/Button';

const DEFAULT_FORM = {
  origin: 'India',
  destination: '',
  start_date: '',
  end_date: '',
  trip_days: 3,
  travelers: 1,
  budget: 'MID_RANGE',
  interests_text: '',
  transport_modes: ['FLIGHT', 'TRAIN'],
  notes: '',
};

function parseInterests(text) {
  return (text || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toDisplayBudget(value) {
  if (value === 'MID_RANGE') return 'Mid-range';
  if (value === 'BUDGET') return 'Budget';
  if (value === 'LUXURY') return 'Luxury';
  return value || '';
}

function stageLabel(stage) {
  const labels = {
    validate_input: 'Validate Input',
    rag_retrieve: 'Retrieve RAG Context',
    transport_lookup: 'Search Flights/Trains',
    plan_synthesis_stream: 'Generate Plan',
    persist_results: 'Save Draft Itinerary',
  };
  return labels[stage] || stage;
}

export default function RealtimeTripPlanner() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [starting, setStarting] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [sessionStatus, setSessionStatus] = useState('');
  const [error, setError] = useState('');
  const [progressEvents, setProgressEvents] = useState([]);
  const [streamText, setStreamText] = useState('');
  const [result, setResult] = useState(null);
  const [loadingSession, setLoadingSession] = useState(false);

  const { socket, connected, error: socketError, subscribeSession, unsubscribeSession } = usePlannerSocket(true);

  const sortedProgress = useMemo(
    () => [...progressEvents].sort((a, b) => (a.elapsed_ms || 0) - (b.elapsed_ms || 0)),
    [progressEvents]
  );

  useEffect(() => {
    if (!socket) return undefined;

    const onProgress = (payload) => {
      if (sessionId && payload?.session_id && payload.session_id !== sessionId) return;
      setSessionStatus(payload?.status || 'RUNNING');
      setProgressEvents((prev) => [
        ...prev,
        {
          stage: payload?.stage,
          status: payload?.status,
          message: payload?.message,
          elapsed_ms: payload?.elapsed_ms || 0,
        },
      ]);
    };

    const onToken = (payload) => {
      if (sessionId && payload?.session_id && payload.session_id !== sessionId) return;
      if (payload?.chunk) {
        setStreamText((prev) => `${prev}${payload.chunk}`);
      }
    };

    const onComplete = (payload) => {
      if (sessionId && payload?.session_id && payload.session_id !== sessionId) return;
      setSessionStatus(payload?.status || 'COMPLETED');
      setResult(payload?.result || null);
    };

    const onPlannerError = (payload) => {
      if (sessionId && payload?.session_id && payload.session_id !== sessionId) return;
      setSessionStatus(payload?.status || 'FAILED');
      setError(payload?.error?.message || 'Planner session failed.');
    };

    const onCancelled = () => {
      setSessionStatus('CANCELLED');
    };

    socket.on('planner:progress', onProgress);
    socket.on('planner:token', onToken);
    socket.on('planner:complete', onComplete);
    socket.on('planner:error', onPlannerError);
    socket.on('planner:cancelled', onCancelled);

    return () => {
      socket.off('planner:progress', onProgress);
      socket.off('planner:token', onToken);
      socket.off('planner:complete', onComplete);
      socket.off('planner:error', onPlannerError);
      socket.off('planner:cancelled', onCancelled);
    };
  }, [socket, sessionId]);

  useEffect(() => () => {
    if (sessionId) unsubscribeSession(sessionId);
  }, [sessionId, unsubscribeSession]);

  const handleTransportToggle = (mode) => {
    setForm((prev) => {
      const has = prev.transport_modes.includes(mode);
      const nextModes = has ? prev.transport_modes.filter((m) => m !== mode) : [...prev.transport_modes, mode];
      return {
        ...prev,
        transport_modes: nextModes.length > 0 ? nextModes : [mode],
      };
    });
  };

  const startPlanner = async (event) => {
    event.preventDefault();
    if (!form.destination.trim()) {
      setError('Destination is required.');
      return;
    }
    setError('');
    setStarting(true);
    setResult(null);
    setStreamText('');
    setProgressEvents([]);
    setSessionStatus('QUEUED');

    try {
      const payload = {
        origin: form.origin,
        destination: form.destination,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        trip_days: Number(form.trip_days) || 3,
        travelers: Number(form.travelers) || 1,
        budget: form.budget,
        interests: parseInterests(form.interests_text),
        transport_modes: form.transport_modes,
        notes: form.notes,
      };
      const res = await api.post('/ai/planner/sessions', payload);
      const createdId = res?.data?.data?.id;
      setSessionId(createdId || '');
      if (createdId) {
        subscribeSession(createdId);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to start planner session.');
      setSessionStatus('FAILED');
    } finally {
      setStarting(false);
    }
  };

  const refreshSession = async () => {
    if (!sessionId) return;
    setLoadingSession(true);
    try {
      const res = await api.get(`/ai/planner/sessions/${sessionId}`);
      const data = res?.data?.data || {};
      setSessionStatus(data.status || sessionStatus);
      setStreamText(data.stream_text || '');
      setResult(data.result_json || null);
      setProgressEvents(
        (data.events || [])
          .filter((item) => item.type === 'progress')
          .map((item) => ({
            stage: item.stage,
            status: item.status,
            message: item.message,
            elapsed_ms: item.elapsed_ms,
          }))
      );
    } catch {
      setError('Could not refresh planner session details.');
    } finally {
      setLoadingSession(false);
    }
  };

  const cancelPlanner = async () => {
    if (!sessionId) return;
    try {
      await api.post(`/ai/planner/sessions/${sessionId}/cancel`);
      setSessionStatus('CANCELLED');
    } catch {
      setError('Unable to cancel planner session.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-display-sm text-ink">Realtime AI Trip Planner</h2>
          </div>
          <p className="text-body-sm text-text-secondary mt-1">
            RAG-powered itinerary with live progress and streamed output.
          </p>
        </div>
        <LiveIndicator connected={connected} label="PLANNER LIVE" />
      </div>

      {(error || socketError) && (
        <div className="bg-danger-soft border border-danger/20 rounded-lg p-3">
          <p className="text-[13px] text-danger">{error || socketError}</p>
        </div>
      )}

      <form onSubmit={startPlanner} className="bg-white border border-border rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-label-md text-ink">Origin</span>
            <input
              value={form.origin}
              onChange={(e) => setForm((prev) => ({ ...prev, origin: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border text-[14px] text-ink"
              placeholder="e.g. Delhi"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-label-md text-ink">Destination</span>
            <input
              value={form.destination}
              onChange={(e) => setForm((prev) => ({ ...prev, destination: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border text-[14px] text-ink"
              placeholder="e.g. Goa, India"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <label className="space-y-1.5">
            <span className="text-label-md text-ink flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Start</span>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border text-[14px] text-ink"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-label-md text-ink flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />End</span>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border text-[14px] text-ink"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-label-md text-ink">Days</span>
            <input
              type="number"
              min="1"
              max="30"
              value={form.trip_days}
              onChange={(e) => setForm((prev) => ({ ...prev, trip_days: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border text-[14px] text-ink"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-label-md text-ink">Travelers</span>
            <input
              type="number"
              min="1"
              max="20"
              value={form.travelers}
              onChange={(e) => setForm((prev) => ({ ...prev, travelers: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border text-[14px] text-ink"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-label-md text-ink">Budget</span>
            <select
              value={form.budget}
              onChange={(e) => setForm((prev) => ({ ...prev, budget: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border text-[14px] text-ink bg-white"
            >
              <option value="BUDGET">Budget</option>
              <option value="MID_RANGE">Mid-range</option>
              <option value="LUXURY">Luxury</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-label-md text-ink">Interests (comma-separated)</span>
            <input
              value={form.interests_text}
              onChange={(e) => setForm((prev) => ({ ...prev, interests_text: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border text-[14px] text-ink"
              placeholder="beaches, food, heritage"
            />
          </label>
        </div>

        <label className="space-y-1.5 block">
          <span className="text-label-md text-ink">Notes</span>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-border text-[14px] text-ink min-h-[80px]"
            placeholder="Any additional constraints"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-label-md text-ink mr-2">Transport</span>
          <button
            type="button"
            onClick={() => handleTransportToggle('FLIGHT')}
            className={`px-3 py-1.5 rounded-lg text-[12px] border ${form.transport_modes.includes('FLIGHT') ? 'bg-primary-soft border-primary/30 text-primary' : 'border-border text-text-secondary'}`}
          >
            <Plane className="inline h-3.5 w-3.5 mr-1" /> Flight
          </button>
          <button
            type="button"
            onClick={() => handleTransportToggle('TRAIN')}
            className={`px-3 py-1.5 rounded-lg text-[12px] border ${form.transport_modes.includes('TRAIN') ? 'bg-primary-soft border-primary/30 text-primary' : 'border-border text-text-secondary'}`}
          >
            <Train className="inline h-3.5 w-3.5 mr-1" /> Train
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={starting} icon={Sparkles}>
            Start Planner
          </Button>
          <Button type="button" variant="secondary" onClick={refreshSession} loading={loadingSession} disabled={!sessionId}>
            Refresh Session
          </Button>
          <Button type="button" variant="ghost" onClick={cancelPlanner} disabled={!sessionId || sessionStatus === 'COMPLETED'}>
            Cancel
          </Button>
          {sessionId && (
            <span className="text-[12px] text-text-secondary self-center">
              Session: {sessionId} | Status: {sessionStatus || 'QUEUED'}
            </span>
          )}
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-border rounded-xl p-4">
          <h3 className="text-label-lg text-ink mb-3">Planner Progress</h3>
          {sortedProgress.length === 0 ? (
            <p className="text-[13px] text-text-secondary">No events yet. Start a planner session.</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
              {sortedProgress.map((event, idx) => (
                <div key={`${event.stage}-${idx}`} className="border border-border rounded-lg p-2.5">
                  <p className="text-[12px] font-semibold text-ink">{stageLabel(event.stage)}</p>
                  <p className="text-[12px] text-text-secondary">{event.message}</p>
                  <p className="text-[11px] text-text-muted mt-1">
                    {event.status} • {(event.elapsed_ms || 0)} ms
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-border rounded-xl p-4">
          <h3 className="text-label-lg text-ink mb-3">Streamed Model Output</h3>
          {streamText ? (
            <pre className="text-[12px] text-text-secondary whitespace-pre-wrap max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
              {streamText}
            </pre>
          ) : (
            <p className="text-[13px] text-text-secondary">Waiting for streamed response...</p>
          )}
          {(sessionStatus === 'RUNNING' || sessionStatus === 'QUEUED') && (
            <div className="flex items-center gap-2 mt-2 text-[12px] text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generating in realtime...
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="bg-white border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-display-sm text-ink">{result.destination || form.destination}</h3>
              <p className="text-body-sm text-text-secondary mt-1">{result.overview}</p>
            </div>
            <span className="text-[12px] px-2 py-1 rounded-md bg-primary-soft text-primary font-medium">
              {result.trip_days || form.trip_days} days • {toDisplayBudget(form.budget)}
            </span>
          </div>

          {result.daily_plan?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-label-lg text-ink">Day-by-Day</h4>
              {result.daily_plan.map((day) => (
                <div key={day.day} className="border border-border rounded-lg p-3">
                  <p className="text-[13px] font-semibold text-ink">Day {day.day}: {day.title}</p>
                  <ul className="mt-1 space-y-1">
                    {(day.activities || []).slice(0, 4).map((activity, idx) => (
                      <li key={`${day.day}-${idx}`} className="text-[12px] text-text-secondary">
                        {activity.time ? `${activity.time} • ` : ''}{activity.name} ({activity.source || 'MODEL'})
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border border-border rounded-lg p-3">
              <p className="text-[12px] font-semibold text-ink mb-1">Hotels</p>
              {(result.recommended_hotels || []).slice(0, 4).map((item, idx) => (
                <p key={`hotel-${idx}`} className="text-[12px] text-text-secondary">• {item.name}</p>
              ))}
            </div>
            <div className="border border-border rounded-lg p-3">
              <p className="text-[12px] font-semibold text-ink mb-1">Restaurants</p>
              {(result.recommended_restaurants || []).slice(0, 4).map((item, idx) => (
                <p key={`rest-${idx}`} className="text-[12px] text-text-secondary">• {item.name}</p>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border border-border rounded-lg p-3">
              <p className="text-[12px] font-semibold text-ink mb-1">Live Flights</p>
              {(result.transport?.flight_options || []).slice(0, 3).map((item, idx) => (
                <a
                  key={`f-${idx}`}
                  href={item.booking_url || '#'}
                  target={item.booking_url ? '_blank' : '_self'}
                  rel="noreferrer"
                  className="block text-[12px] text-blue hover:underline"
                >
                  {item.provider} • {item.departure} → {item.arrival} • {item.currency} {item.price}
                </a>
              ))}
            </div>
            <div className="border border-border rounded-lg p-3">
              <p className="text-[12px] font-semibold text-ink mb-1">Live Trains</p>
              {(result.transport?.train_options || []).slice(0, 3).map((item, idx) => (
                <a
                  key={`t-${idx}`}
                  href={item.booking_url || '#'}
                  target={item.booking_url ? '_blank' : '_self'}
                  rel="noreferrer"
                  className="block text-[12px] text-blue hover:underline"
                >
                  {item.provider} • {item.departure} → {item.arrival} • {item.currency} {item.price}
                </a>
              ))}
            </div>
          </div>

          {result.booking_actions?.length > 0 && (
            <div>
              <h4 className="text-label-lg text-ink mb-2">Book Next</h4>
              <div className="flex flex-wrap gap-2">
                {result.booking_actions.map((action, idx) => (
                  <a
                    key={`${action.type}-${idx}`}
                    href={action.url}
                    target={String(action.url || '').startsWith('/') ? '_self' : '_blank'}
                    rel="noreferrer"
                    className="text-[12px] px-3 py-1.5 rounded-lg border border-border text-ink hover:bg-surface-sunken"
                  >
                    {action.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          {result.draft_itinerary_id && (
            <a href={`/traveler/itineraries/${result.draft_itinerary_id}`} className="inline-flex items-center gap-1 text-[13px] text-primary hover:underline">
              <MapPin className="h-3.5 w-3.5" />
              Open saved draft itinerary
            </a>
          )}
        </div>
      )}
    </div>
  );
}
