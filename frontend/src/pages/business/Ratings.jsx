import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

import api from "../../api/axios";
import RatingsSummaryCards from "../../components/ratings/RatingsSummaryCards";
import RatingsTable from "../../components/ratings/RatingsTable";
import Card from "../../components/ui/Card";
import { useAuth } from "../../contexts/AuthContext";

export default function BusinessRatings() {
  const { businessType } = useAuth();
  const [summary, setSummary] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (businessType !== "CAB_DRIVER") return;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/rides/driver/ratings");
        setSummary(res?.data?.data?.summary || null);
        setRatings(res?.data?.data?.ratings || []);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load ratings.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [businessType]);

  if (businessType !== "CAB_DRIVER") {
    return (
      <Card>
        <h1 className="text-display-sm text-ink mb-2">Ratings</h1>
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
      <div>
        <h1 className="text-display-md text-ink">Ratings</h1>
        <p className="text-body-sm text-text-secondary mt-1">
          View your cab service ratings and traveler feedback.
        </p>
      </div>

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
      </AnimatePresence>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="h-24 rounded-xl bg-surface-sunken animate-pulse" />
            <div className="h-24 rounded-xl bg-surface-sunken animate-pulse" />
            <div className="h-24 rounded-xl bg-surface-sunken animate-pulse" />
            <div className="h-24 rounded-xl bg-surface-sunken animate-pulse" />
          </div>
          <div className="h-72 rounded-xl bg-surface-sunken animate-pulse" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <RatingsSummaryCards summary={summary} />
          <RatingsTable ratings={ratings} />
        </motion.div>
      )}
    </motion.div>
  );
}
