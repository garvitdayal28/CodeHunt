import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, CarTaxiFront, Navigation, Send } from 'lucide-react';

import api from '../../api/axios';
import DriverOnlineToggle from '../../components/rides/DriverOnlineToggle';
import RideHistoryTable from '../../components/rides/RideHistoryTable';
import RideStatusCard from '../../components/rides/RideStatusCard';
import RideTrackingMap from '../../components/rides/RideTrackingMap';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { useRidesSocket } from '../../hooks/useRidesSocket';

const ACTIVE_STATUSES = [
  'ACCEPTED_PENDING_QUOTE',
  'QUOTE_SENT',
  'QUOTE_ACCEPTED',
  'DRIVER_EN_ROUTE',
  'IN_PROGRESS',
];

export default function BusinessRides() {
  const { businessType, userProfile } = useAuth();
  const [online, setOnline] = useState(false);
  const [incoming, setIncoming] = useState([]);
  const [history, setHistory] = useState([]);
  const [currentRide, setCurrentRide] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [quotePrice, setQuotePrice] = useState('');
  const [quoteNote, setQuoteNote] = useState('');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [success, setSuccess] = useState('');
  const [latestLocation, setLatestLocation] = useState(null);
  const watchIdRef = useRef(null);

  const { socket, connected, emitEvent } = useRidesSocket(true);

  const city = userProfile?.business_profile?.city || '';

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get('/rides/driver');
      const rides = res?.data?.data || [];
      setHistory(rides);
      const active = rides.find((ride) => ACTIVE_STATUSES.includes(ride.status)) || null;
      setCurrentRide(active);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load rides.');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (businessType === 'CAB_DRIVER') {
      fetchHistory();
    }
  }, [businessType]);

  useEffect(() => {
    if (!socket) return undefined;

    const onRequest = (payload) => {
      if (payload?.ride) {
        setError('');
        setIncoming((prev) => [payload.ride, ...prev.filter((item) => item.id !== payload.ride.id)]);
      }
    };
    const onStatus = (payload) => {
      const ride = payload?.ride;
      if (!ride) return;
      setError('');
      if (ACTIVE_STATUSES.includes(ride.status)) {
        setCurrentRide(ride);
      } else if (currentRide?.id === ride.id) {
        setCurrentRide(null);
      }
      setIncoming((prev) => prev.filter((item) => item.id !== ride.id));
      fetchHistory();
    };
    const onLocation = (payload) => {
      if (!payload?.ride_id || !currentRide || payload.ride_id !== currentRide.id) return;
      setCurrentRide((prev) => (prev ? { ...prev, driver_location: payload.driver_location } : prev));
    };
    const onEta = (payload) => {
      if (!payload?.ride_id || !currentRide || payload.ride_id !== currentRide.id) return;
      setCurrentRide((prev) => (prev ? { ...prev, eta_minutes: payload.eta_minutes } : prev));
    };
    const onError = (payload) => setError(payload?.message || 'Ride operation failed.');

    socket.on('ride:request_received', onRequest);
    socket.on('ride:status_changed', onStatus);
    socket.on('ride:location_updated', onLocation);
    socket.on('ride:eta_updated', onEta);
    socket.on('ride:error', onError);
    socket.on('ride:completed', onStatus);

    return () => {
      socket.off('ride:request_received', onRequest);
      socket.off('ride:status_changed', onStatus);
      socket.off('ride:location_updated', onLocation);
      socket.off('ride:eta_updated', onEta);
      socket.off('ride:error', onError);
      socket.off('ride:completed', onStatus);
    };
  }, [socket, currentRide]);

  useEffect(() => {
    if (!online) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return undefined;
    }

    if (!navigator.geolocation) {
      setError('Geolocation not supported in this browser.');
      return undefined;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setLatestLocation(location);
        setWarning('');
        emitEvent('driver:location_update', {
          location,
          ride_id: currentRide?.id || undefined,
        });
      },
      (geoError) => {
        const code = geoError?.code;
        if (code === 1) {
          setWarning('Location permission denied. You can still receive requests, but live tracking will be limited.');
        } else {
          setWarning('Unable to track your location right now. Requests still work using your selected city.');
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [online, currentRide?.id, emitEvent]);

  const handleToggleOnline = () => {
    const nextOnline = !online;
    setOnline(nextOnline);
    emitEvent('driver:set_online', {
      online: nextOnline,
      city,
      location: latestLocation || undefined,
    });
    setSuccess(nextOnline ? 'You are now online for ride requests.' : 'You are now offline.');
  };

  const handleAcceptRequest = (ride) => {
    setError('');
    setSuccess('');
    emitEvent('driver:accept_request', { ride_id: ride.id });
  };

  const handleSubmitQuote = () => {
    if (!currentRide) return;
    if (!quotePrice) {
      setError('Quote price is required.');
      return;
    }
    setError('');
    setSuccess('');
    emitEvent('driver:submit_quote', {
      ride_id: currentRide.id,
      price: quotePrice,
      currency: 'INR',
      note: quoteNote,
    });
    setQuotePrice('');
    setQuoteNote('');
    setSuccess('Quote submitted.');
  };

  const handleStartRide = () => {
    if (!currentRide) return;
    setError('');
    setSuccess('');
    emitEvent('driver:start_ride', { ride_id: currentRide.id });
  };

  const incomingRequests = useMemo(
    () => incoming.filter((ride) => ride.status === 'REQUESTED'),
    [incoming]
  );

  if (businessType !== 'CAB_DRIVER') {
    return (
      <Card>
        <h1 className="text-display-sm text-ink mb-2">Rides</h1>
        <p className="text-body-sm text-text-secondary">
          This tab is available only for business accounts registered as Cab Driver.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-md text-ink">Rides</h1>
        <p className="text-body-sm text-text-secondary mt-1">
          Manage incoming ride requests, quotes, and live tracking.
        </p>
      </div>

      {error && (
        <div className="bg-danger-soft border border-danger/20 rounded-lg p-3">
          <p className="text-[13px] text-danger">{error}</p>
        </div>
      )}
      {warning && (
        <div className="bg-warning/10 border border-warning/25 rounded-lg p-3">
          <p className="text-[13px] text-warning">{warning}</p>
        </div>
      )}
      {success && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-3">
          <p className="text-[13px] text-success">{success}</p>
        </div>
      )}

      <DriverOnlineToggle
        online={online}
        city={city}
        connected={connected}
        onToggle={handleToggleOnline}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="bg-surface-sunken">
          <div className="flex items-center gap-2 text-[13px] text-text-secondary">
            <Activity className="h-4 w-4" />
            Connection
          </div>
          <p className="text-[16px] font-semibold text-ink mt-1">{connected ? 'Realtime Live' : 'Disconnected'}</p>
        </Card>
        <Card className="bg-surface-sunken">
          <div className="flex items-center gap-2 text-[13px] text-text-secondary">
            <CarTaxiFront className="h-4 w-4" />
            Incoming Requests
          </div>
          <p className="text-[16px] font-semibold text-ink mt-1">{incomingRequests.length}</p>
        </Card>
        <Card className="bg-surface-sunken">
          <div className="flex items-center gap-2 text-[13px] text-text-secondary">
            <Navigation className="h-4 w-4" />
            Active Ride
          </div>
          <p className="text-[16px] font-semibold text-ink mt-1">{currentRide?.status?.replace(/_/g, ' ') || 'None'}</p>
        </Card>
      </div>

      <Card>
        <h3 className="text-label-lg text-ink mb-3">Incoming Requests</h3>
        {incomingRequests.length === 0 ? (
          <p className="text-[13px] text-text-secondary">No incoming requests right now.</p>
        ) : (
          <div className="space-y-3">
            {incomingRequests.map((ride) => (
              <div key={ride.id} className="border border-border rounded-xl p-4 bg-surface-sunken/40 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] text-ink font-medium">{ride.source?.address || '-'}</p>
                  <p className="text-[13px] text-text-secondary mt-1">{ride.destination?.address || '-'}</p>
                  <p className="text-[12px] text-text-secondary mt-1">City: {ride.city || '-'}</p>
                </div>
                <Button onClick={() => handleAcceptRequest(ride)}>Accept</Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <RideStatusCard ride={currentRide} />

      {currentRide?.status === 'ACCEPTED_PENDING_QUOTE' && (
        <Card>
          <h3 className="text-label-lg text-ink mb-3">Send Quote</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Price"
              type="number"
              min="1"
              value={quotePrice}
              onChange={(e) => setQuotePrice(e.target.value)}
              placeholder="e.g. 250"
            />
            <Input
              label="Currency"
              value="INR"
              disabled
            />
            <Input
              label="Note (optional)"
              value={quoteNote}
              onChange={(e) => setQuoteNote(e.target.value)}
              placeholder="Traffic surcharge included"
            />
          </div>
          <div className="mt-3">
            <Button icon={Send} onClick={handleSubmitQuote}>Submit Quote</Button>
          </div>
        </Card>
      )}

      {currentRide && (
        <RideTrackingMap ride={currentRide} />
      )}

      {currentRide && ['QUOTE_ACCEPTED', 'DRIVER_EN_ROUTE'].includes(currentRide.status) && (
        <Card>
          <h3 className="text-label-lg text-ink mb-2">Ready to start trip?</h3>
          <Button icon={Navigation} onClick={handleStartRide}>Start Ride</Button>
        </Card>
      )}

      {loadingHistory ? (
        <div className="h-40 bg-surface-sunken rounded-xl animate-pulse" />
      ) : (
        <RideHistoryTable title="Ride History" rides={history} travelerView={false} />
      )}
    </div>
  );
}
