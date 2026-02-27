/**
 * PlannerResultView – renders a full AI planner result in rich card format.
 * Props:
 *   result      – parsed result_json from the planner session
 *   formInput   – original form input (for budget / destination fallback)
 *   compact     – boolean – if true, renders a condensed version (for MyTrips list)
 */
import { useState } from "react";
import {
  Bed,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MapPin,
  Plane,
  Train,
  Utensils,
  Compass,
  Lightbulb,
  Star,
  Clock,
  Users,
  Calendar,
  ArrowRight,
  Hotel,
  Activity,
} from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────
function budgetLabel(v) {
  if (v === "MID_RANGE") return "Mid-range";
  if (v === "BUDGET") return "Budget";
  if (v === "LUXURY") return "Luxury";
  return v || "";
}

function activityTypeIcon(type) {
  const t = (type || "").toLowerCase();
  if (t === "restaurant") return Utensils;
  if (t === "transport") return Plane;
  if (t === "experience") return Compass;
  return Activity;
}

function sourceTag(source) {
  if (!source) return null;
  const isRag = (source || "").toUpperCase() === "RAG";
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
        isRag
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-surface-sunken text-text-muted border border-border"
      }`}
    >
      {isRag ? "✦ Local data" : "AI"}
    </span>
  );
}

// ─── DayCard ─────────────────────────────────────────────────────────────────
function DayCard({ day }) {
  const [open, setOpen] = useState(day.day === 1);
  const Icon = activityTypeIcon;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-sunken transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-white text-[11px] font-bold shrink-0">
            {day.day}
          </span>
          <span className="text-[14px] font-semibold text-ink">
            {day.title}
          </span>
        </div>
        <div className="flex items-center gap-2 text-text-muted">
          <span className="text-[11px]">
            {(day.activities || []).length} activities
          </span>
          {open ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </button>

      {open && (
        <div className="divide-y divide-border/60">
          {(day.activities || []).map((act, idx) => {
            const ActIcon = activityTypeIcon(act.type);
            return (
              <div key={idx} className="px-4 py-3 flex gap-3">
                <div className="flex flex-col items-center pt-0.5">
                  <div className="h-7 w-7 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
                    <ActIcon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  {idx < (day.activities || []).length - 1 && (
                    <div className="w-px flex-1 bg-border/60 mt-1 min-h-4" />
                  )}
                </div>
                <div className="flex-1 pb-1">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {act.time && (
                        <span className="flex items-center gap-1 text-[11px] text-text-muted font-mono">
                          <Clock className="h-3 w-3" />
                          {act.time}
                        </span>
                      )}
                      <span className="text-[13px] font-medium text-ink">
                        {act.name}
                      </span>
                    </div>
                    {sourceTag(act.source)}
                  </div>
                  {act.description && (
                    <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">
                      {act.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── RecommendationChip ───────────────────────────────────────────────────────
function RecoCard({ icon: Icon, name, why, color = "blue" }) {
  const colorMap = {
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    gold: "bg-amber-50 border-amber-100 text-amber-700",
    green: "bg-emerald-50 border-emerald-100 text-emerald-700",
    purple: "bg-violet-50 border-violet-100 text-violet-700",
  };
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl border bg-white">
      {Icon && (
        <div
          className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${colorMap[color] || colorMap.blue}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink truncate">{name}</p>
        {why && (
          <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-2">
            {why}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── TransportOption ──────────────────────────────────────────────────────────
function TransportOption({ item, type }) {
  const Icon = type === "flight" ? Plane : Train;
  return (
    <a
      href={item.booking_url || "#"}
      target={item.booking_url ? "_blank" : "_self"}
      rel="noreferrer"
      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-white hover:border-primary/30 hover:bg-primary-soft transition-colors group"
    >
      <div className="h-8 w-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-sky-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-ink">
          {item.provider || "Unknown"}
        </p>
        <p className="text-[11px] text-text-secondary">
          {item.departure} → {item.arrival}
          {item.duration ? ` · ${item.duration}` : ""}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[13px] font-bold text-ink">
          {item.currency || "₹"} {item.price}
        </p>
        {item.booking_url && (
          <ExternalLink className="h-3 w-3 text-text-muted ml-auto group-hover:text-primary transition-colors" />
        )}
      </div>
    </a>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PlannerResultView({
  result,
  formInput = {},
  compact = false,
}) {
  if (!result) return null;

  const {
    destination,
    overview,
    trip_days,
    rag_confidence,
    daily_plan = [],
    tips = [],
    recommended_hotels = [],
    recommended_restaurants = [],
    recommended_tours = [],
    recommended_guides = [],
    transport = {},
    booking_actions = [],
    draft_itinerary_id,
  } = result;

  const flights = transport?.flight_options || [];
  const trains = transport?.train_options || [];

  if (compact) {
    // ── Compact card used in MyTrips list ──
    return (
      <div className="space-y-3">
        {overview && (
          <p className="text-[13px] text-text-secondary leading-relaxed">
            {overview}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {trip_days && (
            <span className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-primary-soft text-primary border border-primary/20">
              <Calendar className="h-3 w-3" /> {trip_days} days
            </span>
          )}
          {formInput?.budget && (
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-surface-sunken text-text-secondary border border-border">
              {budgetLabel(formInput.budget)}
            </span>
          )}
          {rag_confidence && (
            <span
              className={`text-[11px] px-2.5 py-1 rounded-full border ${
                rag_confidence === "high"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : rag_confidence === "medium"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-surface-sunken text-text-muted border-border"
              }`}
            >
              {rag_confidence} confidence
            </span>
          )}
        </div>
        {daily_plan.length > 0 && (
          <div className="text-[12px] text-text-secondary">
            {daily_plan.length} days planned ·{" "}
            {daily_plan.reduce((s, d) => s + (d.activities?.length || 0), 0)}{" "}
            activities
          </div>
        )}
      </div>
    );
  }

  // ── Full view ──
  return (
    <div className="space-y-6">
      {/* ── Header card ── */}
      <div className="bg-linear-to-br from-primary/5 via-white to-white border border-border rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-display-sm text-ink font-bold">
                {destination || formInput?.destination}
              </h2>
              {overview && (
                <p className="text-body-sm text-text-secondary mt-1 max-w-2xl leading-relaxed">
                  {overview}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {trip_days && (
              <span className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full bg-primary text-white font-medium">
                <Calendar className="h-3.5 w-3.5" /> {trip_days} days
              </span>
            )}
            {formInput?.budget && (
              <span className="text-[12px] px-3 py-1.5 rounded-full bg-white border border-border text-ink font-medium">
                {budgetLabel(formInput.budget)}
              </span>
            )}
            {formInput?.travelers && formInput.travelers > 1 && (
              <span className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full bg-white border border-border text-ink">
                <Users className="h-3.5 w-3.5" /> {formInput.travelers}{" "}
                travelers
              </span>
            )}
            {rag_confidence && (
              <span
                className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${
                  rag_confidence === "high"
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : rag_confidence === "medium"
                      ? "bg-amber-50 text-amber-600 border-amber-200"
                      : "bg-surface-sunken text-text-muted border-border"
                }`}
              >
                ✦ {rag_confidence} local match
              </span>
            )}
          </div>
        </div>

        {draft_itinerary_id && (
          <a
            href={`/traveler/itineraries/${draft_itinerary_id}`}
            className="inline-flex items-center gap-1.5 mt-4 text-[13px] text-primary font-medium hover:underline"
          >
            <Hotel className="h-3.5 w-3.5" />
            View saved itinerary
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {/* ── Day-by-day plan ── */}
      {daily_plan.length > 0 && (
        <section>
          <h3 className="text-label-lg text-ink mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Day-by-Day Itinerary
          </h3>
          <div className="space-y-2">
            {daily_plan.map((day) => (
              <DayCard key={day.day} day={day} />
            ))}
          </div>
        </section>
      )}

      {/* ── Recommendations ── */}
      {(recommended_hotels.length > 0 ||
        recommended_restaurants.length > 0 ||
        recommended_tours.length > 0 ||
        recommended_guides.length > 0) && (
        <section>
          <h3 className="text-label-lg text-ink mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            Recommendations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommended_hotels.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Hotels
                </p>
                <div className="space-y-2">
                  {recommended_hotels.slice(0, 4).map((h, i) => (
                    <RecoCard
                      key={i}
                      icon={Bed}
                      name={h.name}
                      why={h.why}
                      color="blue"
                    />
                  ))}
                </div>
              </div>
            )}
            {recommended_restaurants.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Restaurants
                </p>
                <div className="space-y-2">
                  {recommended_restaurants.slice(0, 4).map((r, i) => (
                    <RecoCard
                      key={i}
                      icon={Utensils}
                      name={r.name}
                      why={r.why}
                      color="gold"
                    />
                  ))}
                </div>
              </div>
            )}
            {recommended_tours.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Tours
                </p>
                <div className="space-y-2">
                  {recommended_tours.slice(0, 4).map((t, i) => (
                    <RecoCard
                      key={i}
                      icon={Compass}
                      name={t.name}
                      why={t.why}
                      color="green"
                    />
                  ))}
                </div>
              </div>
            )}
            {recommended_guides.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Guides
                </p>
                <div className="space-y-2">
                  {recommended_guides.slice(0, 4).map((g, i) => (
                    <RecoCard
                      key={i}
                      icon={Users}
                      name={g.name}
                      why={g.why}
                      color="purple"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Transport ── */}
      {(flights.length > 0 || trains.length > 0) && (
        <section>
          <h3 className="text-label-lg text-ink mb-3 flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" />
            Transport Options
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {flights.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Flights
                </p>
                <div className="space-y-2">
                  {flights.slice(0, 3).map((f, i) => (
                    <TransportOption key={i} item={f} type="flight" />
                  ))}
                </div>
              </div>
            )}
            {trains.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Trains
                </p>
                <div className="space-y-2">
                  {trains.slice(0, 3).map((t, i) => (
                    <TransportOption key={i} item={t} type="train" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Tips ── */}
      {tips.length > 0 && (
        <section>
          <h3 className="text-label-lg text-ink mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Travel Tips
          </h3>
          <ul className="space-y-2">
            {tips.map((tip, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-100"
              >
                <span className="text-amber-500 text-[14px] font-bold mt-0.5 shrink-0">
                  {i + 1}.
                </span>
                <span className="text-[13px] text-amber-900 leading-relaxed">
                  {tip}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Booking Actions ── */}
      {booking_actions.length > 0 && (
        <section>
          <h3 className="text-label-lg text-ink mb-3">Book Now</h3>
          <div className="flex flex-wrap gap-2">
            {booking_actions.map((action, i) => (
              <a
                key={i}
                href={action.url}
                target={
                  String(action.url || "").startsWith("/") ? "_self" : "_blank"
                }
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] px-4 py-2 rounded-xl border border-border bg-white text-ink hover:bg-primary-soft hover:border-primary/30 hover:text-primary transition-colors font-medium"
              >
                {action.label}
                <ArrowRight className="h-3 w-3" />
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
