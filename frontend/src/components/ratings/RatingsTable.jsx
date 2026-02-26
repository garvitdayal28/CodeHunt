import { motion } from "motion/react";
import { MessageSquare, User, MapPin, Calendar } from "lucide-react";
import Card from "../ui/Card";
import StarRatingDisplay from "./StarRatingDisplay";
import { formatDate } from "../../utils/dateUtils";

export default function RatingsTable({ ratings }) {
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="p-5 border-b border-border bg-surface">
        <h3 className="text-label-lg text-ink font-semibold">Recent Ratings</h3>
      </div>

      {ratings?.length ? (
        <div className="divide-y divide-border/70">
          {ratings.map((item, index) => {
            const { date, time } = formatDate(
              item.completed_at || item.updated_at,
            );

            return (
              <motion.div
                key={item.ride_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="p-5 hover:bg-surface-hover/30 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-text-secondary" />
                      </div>
                      <div>
                        <p className="text-[15px] font-semibold text-ink">
                          {item.traveler_name || "Traveler"}
                        </p>
                        <div className="flex items-center gap-2 text-[12px] text-text-secondary mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {date}
                          </span>
                          <span>•</span>
                          <span>{time}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-[13px] text-text-secondary bg-surface-sunken/50 p-2.5 rounded-lg border border-border/50">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                      <span className="line-clamp-2">
                        <span className="font-medium text-ink">
                          {item.source || "-"}
                        </span>
                        <span className="mx-2 text-text-placeholder">→</span>
                        <span className="font-medium text-ink">
                          {item.destination || "-"}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-start md:items-end gap-3 min-w-[200px]">
                    <div className="bg-surface-sunken px-3 py-1.5 rounded-full border border-border">
                      <StarRatingDisplay value={item.stars || 0} />
                    </div>
                  </div>
                </div>

                {item.message && (
                  <div className="mt-4 flex items-start gap-3 bg-blue/5 border border-blue/10 rounded-xl p-4">
                    <MessageSquare className="w-5 h-5 text-blue shrink-0 mt-0.5" />
                    <p className="text-[14px] text-ink leading-relaxed italic">
                      "{item.message}"
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="p-10 text-center flex flex-col items-center justify-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-hover mb-4">
            <MessageSquare className="w-8 h-8 text-text-secondary" />
          </div>
          <p className="text-[15px] font-medium text-ink">No ratings yet</p>
          <p className="text-[13px] text-text-secondary mt-1">
            Complete more rides to receive traveler feedback.
          </p>
        </div>
      )}
    </Card>
  );
}
