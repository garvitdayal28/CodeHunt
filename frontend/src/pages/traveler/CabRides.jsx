import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Clock3,
  LoaderCircle,
  LocateFixed,
  Search,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import api from "../../api/axios";
import RideHistoryTable from "../../components/rides/RideHistoryTable";
import OtpBoxes from "../../components/rides/OtpBoxes";
import RideStatusCard from "../../components/rides/RideStatusCard";
import RideTrackingMap from "../../components/rides/RideTrackingMap";
import StarRatingInput from "../../components/rides/StarRatingInput";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { Textarea } from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import { PageSectionSkeleton } from "../../components/ui/Skeleton";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useNotificationSound } from "../../hooks/useNotificationSound";
import { useRidesSocket } from "../../hooks/useRidesSocket";

const ACTIVE_STATUSES = [
  "REQUESTED",
  "ACCEPTED_PENDING_QUOTE",
  "QUOTE_SENT",
  "QUOTE_ACCEPTED",
  "DRIVER_EN_ROUTE",
  "IN_PROGRESS",
];

export default function CabRides() {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [onlineDriversCount, setOnlineDriversCount] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [searching, setSearching] = useState(false);
  const [quoteActionLoading, setQuoteActionLoading] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingMessage, setRatingMessage] = useState("");
  const [showRating, setShowRating] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [endRideConfirmOpen, setEndRideConfirmOpen] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [tripOtp, setTripOtp] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [requestPending, setRequestPending] = useState(false);
  const [requestStartedAt, setRequestStartedAt] = useState(null);
  const [requestSecondsLeft, setRequestSecondsLeft] = useState(0);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const [sourceDisplayAddress, setSourceDisplayAddress] = useState("");
  const [sourceCity, setSourceCity] = useState("");
  const [sourceSuggestions, setSourceSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [showSourceSuggestions, setShowSourceSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] =
    useState(false);
  const [loadingSourceSuggestions, setLoadingSourceSuggestions] =
    useState(false);
  const [loadingDestinationSuggestions, setLoadingDestinationSuggestions] =
    useState(false);
  const sourceBoxRef = useRef(null);
  const destinationBoxRef = useRef(null);
  const { userProfile } = useAuth();

  const { socket, connected, emitEvent } = useRidesSocket(true);
  const { play } = useNotificationSound();
  const toast = useToast();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const notifyError = useCallback(
    (message, title = "Cab rides") => {
      setError(message);
      toast.error(title, message);
    },
    [toast],
  );

  const notifySuccess = useCallback(
    (message, title = "Cab rides") => {
      setFeedback(message);
      toast.success(title, message);
    },
    [toast],
  );

  const notifyInfo = useCallback(
    (message, title = "Cab rides") => {
      setFeedback(message);
      toast.info(title, message);
    },
    [toast],
  );

  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get("/rides/traveler");
      const rides = res?.data?.data || [];
      setHistory(rides);
      const current =
        rides.find((r) => ACTIVE_STATUSES.includes(r.status)) || null;
      setActiveRide(current);
      if (current?.status === "REQUESTED") {
        setRequestPending(true);
        setRequestStartedAt(current.created_at || new Date().toISOString());
      }
    } catch (err) {
      notifyError(err?.response?.data?.message || "Failed to load rides.");
    } finally {
      setLoadingHistory(false);
    }
  }, [notifyError]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (activeRide?.status === "QUOTE_SENT") {
      setQuoteModalOpen(true);
    }
  }, [activeRide?.id, activeRide?.status]);

  useEffect(() => {
    const onDocClick = (event) => {
      if (
        sourceBoxRef.current &&
        !sourceBoxRef.current.contains(event.target)
      ) {
        setShowSourceSuggestions(false);
      }
      if (
        destinationBoxRef.current &&
        !destinationBoxRef.current.contains(event.target)
      ) {
        setShowDestinationSuggestions(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    const q = source.trim();
    if (useCurrentLocation || q.length < 3) {
      setSourceSuggestions([]);
      setLoadingSourceSuggestions(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setLoadingSourceSuggestions(true);
      try {
        const res = await api.post("/rides/geocode/suggest", {
          query: q,
          limit: 5,
        });
        setSourceSuggestions(res?.data?.data || []);
        setShowSourceSuggestions(true);
      } catch {
        setSourceSuggestions([]);
      } finally {
        setLoadingSourceSuggestions(false);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [source, useCurrentLocation]);

  useEffect(() => {
    const q = destination.trim();
    if (q.length < 3) {
      setDestinationSuggestions([]);
      setLoadingDestinationSuggestions(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setLoadingDestinationSuggestions(true);
      try {
        const res = await api.post("/rides/geocode/suggest", {
          query: q,
          city_hint: source || undefined,
          limit: 5,
        });
        setDestinationSuggestions(res?.data?.data || []);
        setShowDestinationSuggestions(true);
      } catch {
        setDestinationSuggestions([]);
      } finally {
        setLoadingDestinationSuggestions(false);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [destination, source]);

  useEffect(() => {
    if (!socket) return undefined;

    const onNearbyDrivers = (payload) => {
      setOnlineDriversCount(payload?.count || 0);
    };
    const onOnlineCount = (payload) => {
      setOnlineDriversCount(payload?.count || 0);
    };
    const onStatus = (payload) => {
      const ride = payload?.ride;
      if (!ride) return;
      setActiveRide(ACTIVE_STATUSES.includes(ride.status) ? ride : null);
      if (ride.status === "REQUESTED") {
        setRequestPending(true);
        setRequestStartedAt(ride.created_at || new Date().toISOString());
      } else {
        setRequestPending(false);
        setRequestSecondsLeft(0);
      }
      if (ride.status === "EXPIRED") {
        setFeedback("");
        notifyError(
          "No driver accepted in time. Please try again or adjust pickup location.",
          "Ride request expired",
        );
        play("warning");
      }
      fetchHistory();
      if (ride.status === "COMPLETED") {
        setShowRating(true);
        setQuoteModalOpen(false);
        setTripOtp("");
        play("success");
      }
      if (ride.status === "QUOTE_ACCEPTED" && ride.start_otp) {
        setTripOtp(String(ride.start_otp));
        setOtpModalOpen(true);
      }
      if (ride.status === "IN_PROGRESS") {
        setTripOtp("");
        setOtpModalOpen(false);
      }
    };
    const onQuote = (payload) => {
      const ride = payload?.ride;
      if (ride) {
        setActiveRide(ride);
        if (ride.status === "QUOTE_SENT") {
          setQuoteModalOpen(true);
          play("incoming");
        }
        if (ride.status === "QUOTE_ACCEPTED") {
          play("success");
        }
      }
    };
    const onLocation = (payload) => {
      if (!payload?.ride_id || !activeRide || payload.ride_id !== activeRide.id)
        return;
      setActiveRide((prev) =>
        prev ? { ...prev, driver_location: payload.driver_location } : prev,
      );
    };
    const onEta = (payload) => {
      if (!payload?.ride_id || !activeRide || payload.ride_id !== activeRide.id)
        return;
      setActiveRide((prev) =>
        prev ? { ...prev, eta_minutes: payload.eta_minutes } : prev,
      );
    };
    const onError = (payload) => {
      setRequestPending(false);
      setRequestSecondsLeft(0);
      notifyError(payload?.message || "Ride operation failed.", "Ride error");
      play("warning");
    };
    const onOtpGenerated = (payload) => {
      const otp = String(payload?.otp || "");
      if (!otp) return;
      setTripOtp(otp);
      setOtpModalOpen(true);
      notifyInfo("Your trip OTP is ready. Share it with driver at pickup.", "Pickup OTP");
      play("incoming");
    };

    socket.on("rides:nearby_drivers", onNearbyDrivers);
    socket.on("rides:online_count", onOnlineCount);
    socket.on("ride:status_changed", onStatus);
    socket.on("ride:quote_received", onQuote);
    socket.on("ride:accepted", onQuote);
    socket.on("ride:quote_accepted", onQuote);
    socket.on("ride:location_updated", onLocation);
    socket.on("ride:eta_updated", onEta);
    socket.on("ride:error", onError);
    socket.on("ride:completed", onStatus);
    socket.on("ride:otp_generated", onOtpGenerated);

    return () => {
      socket.off("rides:nearby_drivers", onNearbyDrivers);
      socket.off("rides:online_count", onOnlineCount);
      socket.off("ride:status_changed", onStatus);
      socket.off("ride:quote_received", onQuote);
      socket.off("ride:accepted", onQuote);
      socket.off("ride:quote_accepted", onQuote);
      socket.off("ride:location_updated", onLocation);
      socket.off("ride:eta_updated", onEta);
      socket.off("ride:error", onError);
      socket.off("ride:completed", onStatus);
      socket.off("ride:otp_generated", onOtpGenerated);
    };
  }, [socket, activeRide, fetchHistory, notifyError, notifyInfo, play]);

  useEffect(() => {
    if (!requestPending || !requestStartedAt) return undefined;
    const requestTimeoutSec = 45;
    const timer = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - new Date(requestStartedAt).getTime()) / 1000,
      );
      const left = Math.max(0, requestTimeoutSec - elapsed);
      setRequestSecondsLeft(left);
      if (left === 0) {
        setRequestPending(false);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [requestPending, requestStartedAt]);

  useEffect(() => {
    if (!connected) return;
    const profileCity = (userProfile?.city || "").trim();
    const effectiveCity = (sourceCity || profileCity).trim();
    emitEvent("traveler:set_city", { city: effectiveCity });
  }, [connected, sourceCity, userProfile?.city, emitEvent]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      notifyError("Geolocation is not available in this browser.");
      return;
    }
    setResolvingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentCoords({ lat, lng });
        setUseCurrentLocation(true);
        setError("");

        try {
          const reverseRes = await api.post("/rides/geocode", {
            source: { lat, lng },
            destination: { lat, lng },
            use_current_location: true,
          });
          const resolved = reverseRes?.data?.data?.source;
          const address = resolved?.address || "Current location";
          if (mountedRef.current) {
            setSource(address);
            setSourceDisplayAddress(address);
            setSourceCity((resolved?.city || "").trim());
          }
        } catch {
          if (mountedRef.current) {
            const fallback = "Current location selected";
            setSource(fallback);
            setSourceDisplayAddress(fallback);
          }
        } finally {
          if (mountedRef.current) {
            setResolvingLocation(false);
          }
        }
      },
      () => {
        setResolvingLocation(false);
        notifyError("Unable to fetch current location.");
      },
    );
  };

  const resolveLocations = async () => {
    if (!destination.trim()) {
      throw new Error("Destination is required.");
    }

    if (useCurrentLocation) {
      const position = currentCoords
        ? {
            coords: {
              latitude: currentCoords.lat,
              longitude: currentCoords.lng,
            },
          }
        : await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
      return api.post("/rides/geocode", {
        source: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: sourceDisplayAddress || source,
        },
        destination: { address: destination },
        use_current_location: true,
      });
    }

    if (!source.trim()) {
      throw new Error("Source is required.");
    }

    return api.post("/rides/geocode", {
      source: { address: source },
      destination: { address: destination },
      use_current_location: false,
    });
  };

  const handleSearchCabs = async () => {
    try {
      setError("");
      setFeedback("");
      setSearching(true);

      if (activeRide) {
        notifyError("You already have an active ride.");
        return;
      }

      const geocodeRes = await resolveLocations();
      const data = geocodeRes?.data?.data;
      emitEvent("traveler:request_ride", {
        source: data?.source,
        destination: data?.destination,
        use_current_location: useCurrentLocation,
      });
      setRequestPending(true);
      setRequestStartedAt(new Date().toISOString());
      setRequestSecondsLeft(45);
      notifyInfo("Request sent. Matching you with nearby drivers now.");
      play("info");
    } catch (err) {
      setRequestPending(false);
      setRequestSecondsLeft(0);
      notifyError(
        err?.response?.data?.message || err.message || "Failed to request cab.",
      );
    } finally {
      setSearching(false);
    }
  };

  const handleAcceptQuote = async () => {
    if (!activeRide) return;
    setQuoteActionLoading(true);
    emitEvent("traveler:accept_quote", { ride_id: activeRide.id });
    setQuoteModalOpen(false);
    notifySuccess("Quote accepted. Waiting for driver to start ride.");
    play("success");
    setQuoteActionLoading(false);
  };

  const handleRejectQuote = () => {
    if (!activeRide) return;
    emitEvent("traveler:reject_quote", { ride_id: activeRide.id });
    setQuoteModalOpen(false);
    play("warning");
  };

  const handleEndRide = async () => {
    if (!activeRide) return;
    try {
      setError("");
      const res = await api.post(`/rides/${activeRide.id}/end`);
      const ride = res?.data?.data;
      setActiveRide(null);
      setShowRating(true);
      setEndRideConfirmOpen(false);
      setHistory((prev) => [
        ride,
        ...prev.filter((item) => item.id !== ride.id),
      ]);
      play("success");
    } catch (err) {
      notifyError(err?.response?.data?.message || "Failed to end ride.");
      play("warning");
    }
  };

  const handleSubmitRating = async () => {
    if (!history.length) return;
    const latest = history[0];
    try {
      await api.post(`/rides/${latest.id}/rating`, {
        stars: ratingStars || undefined,
        message: ratingMessage || undefined,
      });
      setShowRating(false);
      setRatingStars(0);
      setRatingMessage("");
      notifySuccess("Rating submitted successfully.");
      fetchHistory();
      play("success");
    } catch (err) {
      notifyError(err?.response?.data?.message || "Failed to submit rating.");
      play("warning");
    }
  };

  const copyOtp = async () => {
    if (!tripOtp) return;
    try {
      await navigator.clipboard.writeText(tripOtp);
      notifySuccess("Trip OTP copied. Share this with your driver at pickup.");
      play("success");
    } catch {
      notifyInfo("Trip OTP: " + tripOtp);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <PageHeader
        title="Book A Cab"
        description="Find nearby drivers, approve fare, share OTP at pickup, and track trip live."
      />

      <AnimatePresence mode="popLayout">
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="bg-danger-soft border border-danger/20 rounded-lg p-3 overflow-hidden"
          >
            <p className="text-[13px] text-danger">{error}</p>
          </motion.div>
        )}
        {feedback && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="bg-success/10 border border-success/20 rounded-lg p-3 overflow-hidden"
          >
            <p className="text-[13px] text-success">{feedback}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-end">
            <Button
              variant="secondary"
              icon={LocateFixed}
              onClick={handleUseCurrentLocation}
              loading={resolvingLocation}
              className="w-full"
            >
              Current Location
            </Button>
          </div>
          <div className="space-y-1.5 relative" ref={sourceBoxRef}>
            <label className="block text-[13px] font-medium text-ink">
              Source
            </label>
            <input
              type="text"
              className="
                block w-full h-10 px-3
                bg-white border border-border
                rounded-lg text-[14px] text-ink placeholder-text-placeholder
                outline-none transition-all duration-150
                focus:border-accent focus:ring-2 focus:ring-accent/20
              "
              value={source}
              onFocus={() => setShowSourceSuggestions(true)}
              onChange={(e) => {
                setUseCurrentLocation(false);
                setCurrentCoords(null);
                setSourceDisplayAddress("");
                setSourceCity("");
                setSource(e.target.value);
              }}
              placeholder="Pickup address"
            />
            {showSourceSuggestions &&
              (loadingSourceSuggestions || sourceSuggestions.length > 0) && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {loadingSourceSuggestions && (
                    <div className="px-3 py-2 text-[12px] text-text-secondary">
                      Loading suggestions...
                    </div>
                  )}
                  {sourceSuggestions.map((item, idx) => (
                    <button
                      type="button"
                      key={`${item.address}-${idx}`}
                      className="w-full text-left px-3 py-2 text-[13px] text-ink hover:bg-surface-sunken"
                      onClick={() => {
                        setSource(item.address);
                        setSourceDisplayAddress(item.address);
                        setSourceCity((item.city || "").trim());
                        setShowSourceSuggestions(false);
                      }}
                    >
                      {item.address}
                    </button>
                  ))}
                </div>
              )}
          </div>
          <div className="space-y-1.5 relative" ref={destinationBoxRef}>
            <label className="block text-[13px] font-medium text-ink">
              Destination
            </label>
            <input
              type="text"
              className="
                block w-full h-10 px-3
                bg-white border border-border
                rounded-lg text-[14px] text-ink placeholder-text-placeholder
                outline-none transition-all duration-150
                focus:border-accent focus:ring-2 focus:ring-accent/20
              "
              value={destination}
              onFocus={() => setShowDestinationSuggestions(true)}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Drop location"
            />
            {showDestinationSuggestions &&
              (loadingDestinationSuggestions ||
                destinationSuggestions.length > 0) && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {loadingDestinationSuggestions && (
                    <div className="px-3 py-2 text-[12px] text-text-secondary">
                      Loading suggestions...
                    </div>
                  )}
                  {destinationSuggestions.map((item, idx) => (
                    <button
                      type="button"
                      key={`${item.address}-${idx}`}
                      className="w-full text-left px-3 py-2 text-[13px] text-ink hover:bg-surface-sunken"
                      onClick={() => {
                        setDestination(item.address);
                        setShowDestinationSuggestions(false);
                      }}
                    >
                      {item.address}
                    </button>
                  ))}
                </div>
              )}
          </div>
          <div className="flex items-end gap-2">
            <Button
              icon={Search}
              loading={searching}
              disabled={requestPending}
              onClick={handleSearchCabs}
            >
              Search Cabs
            </Button>
          </div>
        </div>
        <p className="text-[13px] text-text-secondary mt-3">
          Realtime: {connected ? "Connected" : "Disconnected"} - Online drivers
          in city: {onlineDriversCount}
        </p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="bg-surface-sunken h-full">
            <div className="flex items-center gap-2 text-[13px] text-text-secondary">
              <Activity className="h-4 w-4" />
              Connection
            </div>
            <p className="text-[16px] font-semibold text-ink mt-1">
              {connected ? "Realtime Live" : "Disconnected"}
            </p>
          </Card>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="bg-surface-sunken h-full">
            <div className="flex items-center gap-2 text-[13px] text-text-secondary">
              <Users className="h-4 w-4" />
              Online Drivers
            </div>
            <p className="text-[16px] font-semibold text-ink mt-1">
              {onlineDriversCount}
            </p>
          </Card>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="bg-surface-sunken h-full">
            <div className="flex items-center gap-2 text-[13px] text-text-secondary">
              <Clock3 className="h-4 w-4" />
              Ride State
            </div>
            <p className="text-[16px] font-semibold text-ink mt-1">
              {activeRide?.status?.replace(/_/g, " ") || "Idle"}
            </p>
          </Card>
        </motion.div>
      </div>

      <AnimatePresence mode="popLayout">
        {requestPending && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border border-accent/30 bg-accent/5">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-white border border-accent/20 flex items-center justify-center">
                  <LoaderCircle className="h-5 w-5 text-accent animate-spin" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-ink">
                    Finding drivers for your ride
                  </p>
                  <p className="text-[13px] text-text-secondary mt-1">
                    Sending request to online drivers in your city. Please wait
                    for acceptance.
                  </p>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="text-[12px] text-text-secondary inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      Online drivers: {onlineDriversCount}
                    </div>
                    <div className="text-[12px] text-text-secondary inline-flex items-center gap-1.5">
                      <Clock3 className="h-3.5 w-3.5" />
                      Request expires in ~{requestSecondsLeft}s
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 w-full rounded-full bg-white/80 border border-accent/15 overflow-hidden">
                    <motion.div
                      className="h-full bg-accent"
                      initial={{ width: "100%" }}
                      animate={{
                        width: `${Math.max(0, (requestSecondsLeft / 45) * 100)}%`,
                      }}
                      transition={{ duration: 1, ease: "linear" }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {tripOtp &&
          activeRide &&
          ["QUOTE_ACCEPTED", "DRIVER_EN_ROUTE"].includes(activeRide.status) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border border-blue/30 bg-blue/5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-label-lg text-ink">Pickup OTP</h3>
                    <p className="text-[13px] text-text-secondary mt-1">
                      Share this OTP with driver at pickup to start your trip.
                    </p>
                    <OtpBoxes value={tripOtp} className="mt-2" />
                  </div>
                  <Button variant="secondary" onClick={copyOtp}>
                    Copy OTP
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

        {activeRide && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            <RideStatusCard ride={activeRide} />
            <RideTrackingMap ride={activeRide} />

            {["IN_PROGRESS", "DRIVER_EN_ROUTE", "QUOTE_ACCEPTED"].includes(
              activeRide.status,
            ) && (
              <Card>
                <h3 className="text-label-lg text-ink mb-2">
                  Reached destination?
                </h3>
                <Button onClick={() => setEndRideConfirmOpen(true)}>
                  End Ride
                </Button>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {loadingHistory ? (
        <PageSectionSkeleton titleWidthClass="w-40" blocks={1} blockHeightClass="h-72" />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <RideHistoryTable title="Ride History" rides={history} travelerView />
        </motion.div>
      )}

      <Modal
        open={quoteModalOpen && activeRide?.status === "QUOTE_SENT"}
        onClose={() => setQuoteModalOpen(false)}
        title="Fare Quote Received"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={handleRejectQuote}>
              Reject
            </Button>
            <Button loading={quoteActionLoading} onClick={handleAcceptQuote}>
              Accept Quote
            </Button>
          </div>
        }
      >
        <p className="text-[14px] text-text-secondary">
          Driver quoted{" "}
          <span className="font-semibold text-ink">
            {activeRide?.currency || "INR"} {activeRide?.quoted_price}
          </span>
        </p>
        {activeRide?.quote_note && (
          <p className="text-[13px] text-text-secondary mt-2">
            Note: {activeRide.quote_note}
          </p>
        )}
      </Modal>

      <ConfirmModal
        open={endRideConfirmOpen}
        title="Confirm Ride Completion"
        message="Confirm that you have reached destination and want to end this ride."
        onCancel={() => setEndRideConfirmOpen(false)}
        onConfirm={handleEndRide}
        confirmLabel="End Ride"
        confirmVariant="danger"
        intent="danger"
      />

      <Modal
        open={showRating}
        onClose={() => setShowRating(false)}
        title="Rate Your Driver (Optional)"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowRating(false)}>
              Skip
            </Button>
            <Button onClick={handleSubmitRating}>Submit Rating</Button>
          </div>
        }
      >
        <StarRatingInput value={ratingStars} onChange={setRatingStars} />
        <Textarea
          className="mt-3"
          placeholder="Optional feedback message"
          value={ratingMessage}
          onChange={(e) => setRatingMessage(e.target.value)}
        />
      </Modal>

      <Modal
        open={otpModalOpen && !!tripOtp}
        onClose={() => setOtpModalOpen(false)}
        title="Your Pickup OTP"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setOtpModalOpen(false)}>
              Close
            </Button>
            <Button onClick={copyOtp}>Copy OTP</Button>
          </div>
        }
      >
        <p className="text-[13px] text-text-secondary">
          Share this OTP with driver at pickup to start your trip.
        </p>
        <OtpBoxes value={tripOtp || ""} className="mt-3" />
      </Modal>
    </motion.div>
  );
}
