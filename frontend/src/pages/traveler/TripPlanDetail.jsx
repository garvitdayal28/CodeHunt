/**
 * TripPlanDetail – full view of a single AI planner session.
 * Route: /traveler/ai-planner/:sessionId
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  AlertTriangle,
  Calendar,
  MapPin,
} from "lucide-react";
import api from "../../api/axios";
import PlannerResultView from "../../components/traveler/PlannerResultView";
import StatusBadge from "../../components/ui/StatusBadge";

export default function TripPlanDetail() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) return;
    const load = async () => {
      try {
        const res = await api.get(`/ai/planner/sessions/${sessionId}`);
        setSession(res.data?.data || null);
      } catch (err) {
        setError(err?.response?.data?.message || "Could not load trip plan.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-[14px] text-text-secondary">Loading trip plan…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          to="/traveler/itineraries"
          className="inline-flex items-center gap-1 text-[13px] text-text-secondary hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to My Trips
        </Link>
        <div className="flex items-center gap-2 p-4 rounded-xl bg-danger-soft border border-danger/20">
          <AlertTriangle className="h-4 w-4 text-danger shrink-0" />
          <p className="text-[13px] text-danger">{error}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-16">
        <p className="text-body-lg text-text-secondary">Trip plan not found.</p>
        <Link
          to="/traveler/itineraries"
          className="mt-3 inline-block text-[13px] text-primary hover:underline"
        >
          ← Back to My Trips
        </Link>
      </div>
    );
  }

  const result = session.result_json;
  const input = session.input || {};
  const createdAt = session.created_at
    ? new Date(session.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back link */}
      <Link
        to="/traveler/itineraries"
        className="inline-flex items-center gap-1 text-[13px] text-text-secondary hover:text-ink transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to My Trips
      </Link>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-display-sm text-ink font-bold">
              {result?.destination || input?.destination || "AI Trip Plan"}
            </h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {createdAt && (
                <span className="flex items-center gap-1 text-[12px] text-text-secondary">
                  <Calendar className="h-3 w-3" /> {createdAt}
                </span>
              )}
              {input?.origin && input?.destination && (
                <span className="flex items-center gap-1 text-[12px] text-text-secondary">
                  <MapPin className="h-3 w-3" /> {input.origin} →{" "}
                  {input.destination}
                </span>
              )}
              <StatusBadge status={session.status} />
            </div>
          </div>
        </div>
      </div>

      {/* If still running / failed */}
      {session.status === "RUNNING" && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-primary-soft border border-primary/20">
          <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
          <p className="text-[13px] text-primary">
            This plan is still being generated. Refresh in a moment.
          </p>
        </div>
      )}
      {session.status === "FAILED" && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-danger-soft border border-danger/20">
          <AlertTriangle className="h-4 w-4 text-danger shrink-0" />
          <p className="text-[13px] text-danger">
            {session.error?.message || "This plan failed to generate."}
          </p>
        </div>
      )}

      {/* Result */}
      {result ? (
        <PlannerResultView result={result} formInput={input} />
      ) : (
        session.status === "COMPLETED" && (
          <div className="text-center py-12 border border-border rounded-2xl bg-white">
            <p className="text-text-secondary text-[14px]">
              Plan data could not be loaded.
            </p>
          </div>
        )
      )}
    </div>
  );
}
