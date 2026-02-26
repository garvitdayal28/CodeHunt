import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, CarTaxiFront, Navigation, Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import api from "../../api/axios";
import DriverOnlineToggle from "../../components/rides/DriverOnlineToggle";
import StarRatingDisplay from "../../components/ratings/StarRatingDisplay";
import RideHistoryTable from "../../components/rides/RideHistoryTable";
import OtpBoxes from "../../components/rides/OtpBoxes";
import RideStatusCard from "../../components/rides/RideStatusCard";
import RideTrackingMap from "../../components/rides/RideTrackingMap";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import ConfirmModal from "../../components/ui/ConfirmModal";
import EmptyState from "../../components/ui/EmptyState";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import { PageSectionSkeleton } from "../../components/ui/Skeleton";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useNotificationSound } from "../../hooks/useNotificationSound";
import { useRidesSocket } from "../../hooks/useRidesSocket";

const ACTIVE_STATUSES = [
  "ACCEPTED_PENDING_QUOTE",
  "QUOTE_SENT",
  "QUOTE_ACCEPTED",
  "DRIVER_EN_ROUTE",
  "IN_PROGRESS",
];

export default function BusinessRides() {
  const { businessType, userProfile } = useAuth();
  const [online, setOnline] = useState(false);
  const [incoming, setIncoming] = useState([]);
  const [history, setHistory] = useState([]);
  const [currentRide, setCurrentRide] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [latestLocation, setLatestLocation] = useState(null);
  const [acceptConfirmOpen, setAcceptConfirmOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quotePromptedRideId, setQuotePromptedRideId] = useState("");
  const [quoteAcceptedModalOpen, setQuoteAcceptedModalOpen] = useState(false);
  const [rideCompletedModalOpen, setRideCompletedModalOpen] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [latestRating, setLatestRating] = useState(null);
  const [startRideModalOpen, setStartRideModalOpen] = useState(false);
  const [startRideConfirmOpen, setStartRideConfirmOpen] = useState(false);
  const [startRideOtp, setStartRideOtp] = useState("");
  const [isAcceptingRide, setIsAcceptingRide] = useState(false);
  const watchIdRef = useRef(null);
  const { play } = useNotificationSound();
  const toast = useToast();

  const { socket, connected, emitEvent } = useRidesSocket(true);

  const city = userProfile?.business_profile?.city || "";

  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get("/rides/driver");
      const rides = res?.data?.data || [];
      setHistory(rides);
      const active =
        rides.find((ride) => ACTIVE_STATUSES.includes(ride.status)) || null;
      setCurrentRide(active);
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to load rides.";
      setError(message);
      toast.error("Rides", message);
    } finally {
      setLoadingHistory(false);
    }
  }, [toast]);

  useEffect(() => {
    if (businessType === "CAB_DRIVER") {
      fetchHistory();
    }
  }, [businessType, fetchHistory]);

  useEffect(() => {
    if (
      currentRide?.status === "ACCEPTED_PENDING_QUOTE" &&
      quotePromptedRideId !== currentRide.id
    ) {
      setQuotePromptedRideId(currentRide.id);
      setQuoteModalOpen(true);
      setIsAcceptingRide(false);
    }
  }, [currentRide?.id, currentRide?.status, quotePromptedRideId]);

  useEffect(() => {
    if (!socket) return undefined;

    const onRequest = (payload) => {
      if (payload?.ride) {
        setError("");
        setIncoming((prev) => [
          payload.ride,
          ...prev.filter((item) => item.id !== payload.ride.id),
        ]);
        play("incoming");
      }
    };
    const onStatus = (payload) => {
      const ride = payload?.ride;
      if (!ride) return;
      setError("");
      if (ACTIVE_STATUSES.includes(ride.status)) {
        setCurrentRide(ride);
        if (
          ride.status === "ACCEPTED_PENDING_QUOTE" &&
          quotePromptedRideId !== ride.id
        ) {
          setQuotePromptedRideId(ride.id);
          setQuoteModalOpen(true);
        }
        if (ride.status === "ACCEPTED_PENDING_QUOTE") {
          setIsAcceptingRide(false);
        }
        if (ride.status === "IN_PROGRESS") {
          setStartRideModalOpen(false);
          setStartRideOtp("");
        }
      } else if (currentRide?.id === ride.id) {
        setCurrentRide(null);
      }
      setIncoming((prev) => prev.filter((item) => item.id !== ride.id));
      fetchHistory();
    };
    const onQuoteAccepted = (payload) => {
      const ride = payload?.ride;
      if (!ride) return;
      setCurrentRide(ride);
      setQuoteAcceptedModalOpen(true);
      toast.success("Quote accepted", "Traveler accepted your quote. Start the ride now.");
      play("success");
    };
    const onCompleted = (payload) => {
      onStatus(payload);
      setQuoteAcceptedModalOpen(false);
      setQuoteModalOpen(false);
      setRideCompletedModalOpen(true);
      play("success");
    };
    const onRated = (payload) => {
      setLatestRating(payload || null);
      setRatingModalOpen(true);
      play("incoming");
    };
    const onLocation = (payload) => {
      if (
        !payload?.ride_id ||
        !currentRide ||
        payload.ride_id !== currentRide.id
      )
        return;
      setCurrentRide((prev) =>
        prev ? { ...prev, driver_location: payload.driver_location } : prev,
      );
    };
    const onEta = (payload) => {
      if (
        !payload?.ride_id ||
        !currentRide ||
        payload.ride_id !== currentRide.id
      )
        return;
      setCurrentRide((prev) =>
        prev ? { ...prev, eta_minutes: payload.eta_minutes } : prev,
      );
    };
    const onError = (payload) => {
      const message = payload?.message || "Ride operation failed.";
      setError(message);
      toast.error("Ride error", message);
      setIsAcceptingRide((prev) => {
        if (prev) {
          setQuoteModalOpen(false);
        }
        return false;
      });
    };

    socket.on("ride:request_received", onRequest);
    socket.on("ride:status_changed", onStatus);
    socket.on("ride:location_updated", onLocation);
    socket.on("ride:eta_updated", onEta);
    socket.on("ride:error", onError);
    socket.on("ride:quote_accepted", onQuoteAccepted);
    socket.on("ride:completed", onCompleted);
    socket.on("ride:rated", onRated);

    return () => {
      socket.off("ride:request_received", onRequest);
      socket.off("ride:status_changed", onStatus);
      socket.off("ride:location_updated", onLocation);
      socket.off("ride:eta_updated", onEta);
      socket.off("ride:error", onError);
      socket.off("ride:quote_accepted", onQuoteAccepted);
      socket.off("ride:completed", onCompleted);
      socket.off("ride:rated", onRated);
    };
  }, [socket, currentRide, fetchHistory, play, quotePromptedRideId, toast]);

  useEffect(() => {
    if (!online) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return undefined;
    }

    if (!navigator.geolocation) {
      setError("Geolocation not supported in this browser.");
      return undefined;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setLatestLocation(location);
        setWarning("");
        emitEvent("driver:location_update", {
          location,
          ride_id: currentRide?.id || undefined,
        });
      },
      (geoError) => {
        const code = geoError?.code;
        if (code === 1) {
          setWarning(
            "Location permission denied. You can still receive requests, but live tracking will be limited.",
          );
        } else {
          setWarning(
            "Unable to track your location right now. Requests still work using your selected city.",
          );
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
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
    emitEvent("driver:set_online", {
      online: nextOnline,
      city,
      location: latestLocation || undefined,
    });
    toast.info(
      "Driver availability",
      nextOnline
        ? "You are now online for ride requests."
        : "You are now offline.",
    );
  };

  const handleAcceptRequest = (ride) => {
    setSelectedRequest(ride);
    setAcceptConfirmOpen(true);
  };

  const handleConfirmAcceptRequest = () => {
    if (!selectedRequest) return;
    setError("");
    emitEvent("driver:accept_request", { ride_id: selectedRequest.id });
    setAcceptConfirmOpen(false);
    setIsAcceptingRide(true);
    setQuotePromptedRideId(selectedRequest.id);
    setQuoteModalOpen(true);
    toast.info("Ride accepted", "Prepare and submit a fare quote.");
  };

  const handleSubmitQuote = () => {
    if (!currentRide) return;
    if (!quotePrice) {
      setError("Quote price is required.");
      return;
    }
    setError("");
    emitEvent("driver:submit_quote", {
      ride_id: currentRide.id,
      price: quotePrice,
      currency: "INR",
      note: quoteNote,
    });
    setQuotePrice("");
    setQuoteNote("");
    setQuoteModalOpen(false);
    toast.success("Quote submitted", "Traveler has been notified.");
    play("success");
  };

  const handleStartRide = () => {
    if (!currentRide) return;
    if (!startRideOtp.trim()) {
      setError("Enter OTP shared by traveler to start ride.");
      return;
    }
    setError("");
    emitEvent("driver:start_ride", {
      ride_id: currentRide.id,
      otp: startRideOtp.trim(),
    });
    setQuoteAcceptedModalOpen(false);
    setStartRideModalOpen(false);
    setStartRideOtp("");
    toast.success("Ride started", "Trip is now in progress.");
  };

  const incomingRequests = useMemo(
    () => incoming.filter((ride) => ride.status === "REQUESTED"),
    [incoming],
  );

  if (businessType !== "CAB_DRIVER") {
    return (
      <Card>
        <h1 className="text-display-sm text-ink mb-2">Rides</h1>
        <p className="text-body-sm text-text-secondary">
          This tab is available only for business accounts registered as Cab
          Driver.
        </p>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <PageHeader
        title="Cab Operations"
        description="Review incoming requests, share fare quotes, verify OTP at pickup, and run live trips."
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
        {warning && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="bg-warning/10 border border-warning/25 rounded-lg p-3 overflow-hidden"
          >
            <p className="text-[13px] text-warning">{warning}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <DriverOnlineToggle
        online={online}
        city={city}
        connected={connected}
        onToggle={handleToggleOnline}
      />

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
              <CarTaxiFront className="h-4 w-4" />
              Incoming Requests
            </div>
            <p className="text-[16px] font-semibold text-ink mt-1">
              {incomingRequests.length}
            </p>
          </Card>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="bg-surface-sunken h-full">
            <div className="flex items-center gap-2 text-[13px] text-text-secondary">
              <Navigation className="h-4 w-4" />
              Active Ride
            </div>
            <p className="text-[16px] font-semibold text-ink mt-1">
              {currentRide?.status?.replace(/_/g, " ") || "None"}
            </p>
          </Card>
        </motion.div>
      </div>

      <Card>
        <h3 className="text-label-lg text-ink mb-3">Incoming Ride Requests</h3>
        {incomingRequests.length === 0 ? (
          <EmptyState
            icon={CarTaxiFront}
            title="No incoming requests right now."
            description="Go online to receive nearby ride requests in your service city."
            className="border-0 bg-transparent px-0 py-3"
          />
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {incomingRequests.map((ride) => (
                <motion.div
                  key={ride.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="border border-border rounded-xl p-4 bg-surface-sunken/40 flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="text-[14px] text-ink font-medium">
                      {ride.source?.address || "-"}
                    </p>
                    <p className="text-[13px] text-text-secondary mt-1">
                      {ride.destination?.address || "-"}
                    </p>
                    <p className="text-[12px] text-text-secondary mt-1">
                      City: {ride.city || "-"}
                    </p>
                  </div>
                  <Button onClick={() => handleAcceptRequest(ride)}>
                    Accept
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>

      <AnimatePresence mode="popLayout">
        {currentRide && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            <RideStatusCard ride={currentRide} />

            {currentRide?.status === "ACCEPTED_PENDING_QUOTE" && (
              <Card>
                <h3 className="text-label-lg text-ink mb-2">Send Fare Quote</h3>
                <p className="text-[13px] text-text-secondary">
                  Share your fare offer to proceed with this booking.
                </p>
                <div className="mt-3">
                  <Button icon={Send} onClick={() => setQuoteModalOpen(true)}>
                    Open Quote Modal
                  </Button>
                </div>
              </Card>
            )}

            <RideTrackingMap ride={currentRide} />

            {["QUOTE_ACCEPTED", "DRIVER_EN_ROUTE"].includes(
              currentRide.status,
            ) && (
              <Card>
                <h3 className="text-label-lg text-ink mb-2">
                  Verify OTP And Start Trip
                </h3>
                <p className="text-[13px] text-text-secondary mb-3">
                  Ask traveler for OTP at pickup before starting the trip.
                </p>
                <Button
                  icon={Navigation}
                  onClick={() => setStartRideModalOpen(true)}
                >
                  Verify OTP
                </Button>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {loadingHistory ? (
        <PageSectionSkeleton titleWidthClass="w-40" blocks={1} blockHeightClass="h-72" />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <RideHistoryTable title="Ride History" rides={history} travelerView={false} />
        </motion.div>
      )}

      <ConfirmModal
        open={acceptConfirmOpen}
        title="Accept Ride Request"
        message={
          selectedRequest
            ? `Accept request from ${selectedRequest.source?.address || "-"} to ${selectedRequest.destination?.address || "-"}?`
            : "Accept this ride request?"
        }
        onCancel={() => setAcceptConfirmOpen(false)}
        onConfirm={handleConfirmAcceptRequest}
        confirmLabel="Accept Ride"
        intent="warning"
      />

      <Modal
        open={quoteModalOpen}
        onClose={() => !isAcceptingRide && setQuoteModalOpen(false)}
        title="Submit Quote"
        footer={
          !isAcceptingRide && (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setQuoteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button icon={Send} onClick={handleSubmitQuote}>
                Submit Quote
              </Button>
            </div>
          )
        }
      >
        {isAcceptingRide ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-[14px] text-text-secondary">
              Accepting ride and preparing quote...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            <Input
              label="Price"
              type="number"
              min="1"
              value={quotePrice}
              onChange={(e) => setQuotePrice(e.target.value)}
              placeholder="e.g. 250"
            />
            <Input label="Currency" value="INR" disabled />
            <Input
              label="Note (optional)"
              value={quoteNote}
              onChange={(e) => setQuoteNote(e.target.value)}
              placeholder="Traffic surcharge included"
            />
          </div>
        )}
      </Modal>

      <Modal
        open={quoteAcceptedModalOpen}
        onClose={() => setQuoteAcceptedModalOpen(false)}
        title="Quote Accepted By Traveler"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setQuoteAcceptedModalOpen(false)}
            >
              Later
            </Button>
            <Button
              icon={Navigation}
              onClick={() => {
                setQuoteAcceptedModalOpen(false);
                setStartRideModalOpen(true);
              }}
            >
              Verify OTP
            </Button>
          </div>
        }
      >
        <p className="text-[14px] text-text-secondary">
          Traveler accepted your quote. Verify pickup OTP and start trip when
          ready.
        </p>
      </Modal>

      <Modal
        open={rideCompletedModalOpen}
        onClose={() => setRideCompletedModalOpen(false)}
        title="Ride Completed"
        footer={
          <div className="flex items-center justify-end">
            <Button onClick={() => setRideCompletedModalOpen(false)}>
              Okay
            </Button>
          </div>
        }
      >
        <p className="text-[14px] text-text-secondary">
          Traveler marked this ride as completed.
        </p>
      </Modal>

      <Modal
        open={ratingModalOpen}
        onClose={() => setRatingModalOpen(false)}
        title="New Rating Received"
        footer={
          <div className="flex items-center justify-end">
            <Button onClick={() => setRatingModalOpen(false)}>Close</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <p className="text-[12px] text-text-secondary">Traveler</p>
            <p className="text-[14px] text-ink font-medium">
              {latestRating?.traveler_name || "-"}
            </p>
          </div>
          <div>
            <p className="text-[12px] text-text-secondary">Stars</p>
            <StarRatingDisplay value={latestRating?.rating?.stars || 0} />
          </div>
          <div>
            <p className="text-[12px] text-text-secondary">Feedback</p>
            <p className="text-[14px] text-ink">
              {latestRating?.rating?.message || "No text feedback."}
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={startRideModalOpen}
        onClose={() => setStartRideModalOpen(false)}
        title="Verify OTP To Start Ride"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setStartRideModalOpen(false);
                setStartRideConfirmOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button icon={Navigation} onClick={() => setStartRideConfirmOpen(true)}>
              Start Ride
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-[13px] text-text-secondary">
            Ask traveler for their 4-digit trip OTP and enter it below.
          </p>
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-ink">
              Trip OTP
            </label>
            <OtpBoxes
              value={startRideOtp}
              onChange={(next) => setStartRideOtp(next)}
              editable
              autoFocus
            />
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={startRideConfirmOpen}
        title="Start Ride Now?"
        message="This will mark the trip as in progress for both driver and traveler."
        onCancel={() => setStartRideConfirmOpen(false)}
        onConfirm={() => {
          setStartRideConfirmOpen(false);
          handleStartRide();
        }}
        confirmLabel="Start Ride"
        intent="warning"
      />
    </motion.div>
  );
}
