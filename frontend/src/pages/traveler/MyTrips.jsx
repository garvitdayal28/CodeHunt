import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  MapPin,
  Calendar,
  ChevronRight,
  Sparkles,
  Loader2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import api from "../../api/axios";
import Button from "../../components/ui/Button";
import StatusBadge from "../../components/ui/StatusBadge";
import PlannerResultView from "../../components/traveler/PlannerResultView";

export default function MyTrips() {
  const [itineraries, setItineraries] = useState([]);
  const [plannerSessions, setPlannerSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [plannerLoading, setPlannerLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState(null);

  useEffect(() => {
    const fetchItineraries = async () => {
      try {
        const res = await api.get("/itineraries");
        setItineraries(res.data.data || []);
      } catch {
        setItineraries([
          {
            id: "demo1",
            destination: "Goa, India",
            start_date: "2026-03-01",
            end_date: "2026-03-05",
            status: "ON_TRACK",
            created_at: new Date().toISOString(),
          },
          {
            id: "demo2",
            destination: "Bali, Indonesia",
            start_date: "2026-04-10",
            end_date: "2026-04-17",
            status: "DRAFT",
            created_at: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    const fetchPlannerSessions = async () => {
      try {
        const res = await api.get("/ai/planner/sessions");
        setPlannerSessions(res.data.data || []);
      } catch {
        setPlannerSessions([]);
      } finally {
        setPlannerLoading(false);
      }
    };

    fetchItineraries();
    fetchPlannerSessions();
  }, []);

  const formatDate = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const completedSessions = plannerSessions.filter(
    (s) => s.status === "COMPLETED" && s.result_json,
  );
  const otherSessions = plannerSessions.filter(
    (s) => s.status !== "COMPLETED" || !s.result_json,
  );

  return (
    <div className="space-y-10">
      {/* ── Booked Itineraries ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-display-md text-ink">My Trips</h1>
            <p className="text-body-sm text-text-secondary mt-1">
              All your planned and upcoming itineraries.
            </p>
          </div>
          <Link to="/traveler/itineraries/new">
            <Button icon={Plus}>New Trip</Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-36 bg-surface-sunken rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : itineraries.length === 0 ? (
          <div className="text-center py-16 border border-border rounded-xl bg-white">
            <MapPin className="h-10 w-10 text-text-placeholder mx-auto mb-3" />
            <p className="text-body-lg text-ink font-medium">No trips yet</p>
            <p className="text-body-sm text-text-secondary mt-1 mb-4">
              Plan your first adventure!
            </p>
            <Link to="/traveler/itineraries/new">
              <Button icon={Plus}>Create Trip</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {itineraries.map((itin, i) => (
              <Link
                key={itin.id}
                to={`/traveler/itineraries/${itin.id}`}
                className={`group bg-white border border-border rounded-xl p-5 hover:shadow-md transition-shadow animate-fade-in-up stagger-${i + 1}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin
                      className="h-4 w-4 text-primary"
                      strokeWidth={1.75}
                    />
                    <h3 className="text-label-lg text-ink">
                      {itin.destination}
                    </h3>
                  </div>
                  <StatusBadge status={itin.status} />
                </div>
                <div className="flex items-center gap-4 text-body-sm text-text-secondary">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span>
                      {formatDate(itin.start_date)} —{" "}
                      {formatDate(itin.end_date)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-end mt-3 text-[13px] text-text-muted group-hover:text-primary transition-colors">
                  View details <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── AI Trip Plans ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-display-sm text-ink">AI Trip Plans</h2>
              <p className="text-body-sm text-text-secondary mt-0.5">
                Plans generated by TripAllied AI Planner.
              </p>
            </div>
          </div>
          <Link to="/traveler/ai-planner">
            <Button variant="secondary" icon={Sparkles}>
              New AI Plan
            </Button>
          </Link>
        </div>

        {plannerLoading ? (
          <div className="flex items-center gap-2 py-6 text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-[13px]">Loading AI plans…</span>
          </div>
        ) : plannerSessions.length === 0 ? (
          <div className="text-center py-12 border border-border border-dashed rounded-xl bg-white">
            <Sparkles className="h-9 w-9 text-text-placeholder mx-auto mb-3" />
            <p className="text-body-lg text-ink font-medium">No AI plans yet</p>
            <p className="text-body-sm text-text-secondary mt-1 mb-4">
              Use the AI Planner to generate a smart itinerary.
            </p>
            <Link to="/traveler/ai-planner">
              <Button icon={Sparkles}>Start AI Planner</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Completed plans with result */}
            {completedSessions.map((session) => {
              const isExpanded = expandedSession === session.id;
              const input = session.input || {};
              const result = session.result_json;
              const createdAt = formatDate(session.created_at);

              return (
                <div
                  key={session.id}
                  className="bg-white border border-border rounded-2xl overflow-hidden"
                >
                  {/* Card header */}
                  <div className="px-5 py-4 flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl bg-linear-to-br from-primary to-primary/70 flex items-center justify-center shrink-0">
                        <MapPin className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-[15px] font-semibold text-ink">
                          {result?.destination ||
                            input?.destination ||
                            "Trip Plan"}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {createdAt && (
                            <span className="flex items-center gap-1 text-[11px] text-text-muted">
                              <Clock className="h-3 w-3" /> {createdAt}
                            </span>
                          )}
                          {input?.trip_days && (
                            <span className="flex items-center gap-1 text-[11px] text-text-muted">
                              <Calendar className="h-3 w-3" /> {input.trip_days}{" "}
                              days
                            </span>
                          )}
                          <StatusBadge status={session.status} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/traveler/ai-planner/${session.id}`}
                        className="text-[12px] px-3 py-1.5 rounded-lg border border-border bg-white text-ink hover:bg-surface-sunken transition-colors"
                      >
                        Full view
                      </Link>
                      <button
                        onClick={() =>
                          setExpandedSession(isExpanded ? null : session.id)
                        }
                        className="flex items-center gap-1 text-[12px] px-3 py-1.5 rounded-lg bg-primary-soft text-primary border border-primary/20 hover:bg-primary/10 transition-colors font-medium"
                      >
                        {isExpanded ? "Collapse" : "Preview plan"}
                        <ChevronRight
                          className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Compact summary always visible */}
                  {!isExpanded && (
                    <div className="px-5 pb-4 border-t border-border/60 pt-3">
                      <PlannerResultView
                        result={result}
                        formInput={input}
                        compact
                      />
                    </div>
                  )}

                  {/* Full expanded plan */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-border/60 pt-4">
                      <PlannerResultView result={result} formInput={input} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Non-completed sessions (running, failed, cancelled) */}
            {otherSessions.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider px-1">
                  Other Sessions
                </p>
                {otherSessions.map((session) => {
                  const input = session.input || {};
                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between gap-3 p-4 bg-white border border-border rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        {session.status === "RUNNING" ||
                        session.status === "QUEUED" ? (
                          <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                        ) : session.status === "FAILED" ? (
                          <AlertTriangle className="h-4 w-4 text-danger shrink-0" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-text-muted shrink-0" />
                        )}
                        <div>
                          <p className="text-[13px] font-medium text-ink">
                            {input?.destination || "Unnamed plan"}
                          </p>
                          <p className="text-[11px] text-text-muted">
                            {formatDate(session.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={session.status} />
                        <Link
                          to={`/traveler/ai-planner/${session.id}`}
                          className="text-[12px] text-primary hover:underline"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
