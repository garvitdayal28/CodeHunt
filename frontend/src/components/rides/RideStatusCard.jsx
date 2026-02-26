import { motion } from "motion/react";
import Card from "../ui/Card";

const statusColors = {
  REQUESTED: "text-blue",
  ACCEPTED_PENDING_QUOTE: "text-gold",
  QUOTE_SENT: "text-gold",
  QUOTE_ACCEPTED: "text-primary",
  DRIVER_EN_ROUTE: "text-primary",
  IN_PROGRESS: "text-success",
  COMPLETED: "text-success",
  CANCELLED: "text-danger",
  EXPIRED: "text-danger",
};

function StatusLabel({ status }) {
  const label = status?.replace(/_/g, " ") || "UNKNOWN";
  return (
    <motion.span
      key={status}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`text-[13px] font-semibold px-2.5 py-1 rounded-full bg-surface-sunken border border-border ${statusColors[status] || "text-text-secondary"}`}
    >
      {label}
    </motion.span>
  );
}

export default function RideStatusCard({ ride }) {
  if (!ride) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-accent/50" />
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-label-lg text-ink font-semibold">
            Current Ride Details
          </h3>
          <StatusLabel status={ride.status} />
        </div>
        <div className="space-y-3 text-[13px] bg-surface-sunken/30 p-4 rounded-lg border border-border/50">
          <div className="flex justify-between gap-3 items-start">
            <span className="text-text-secondary font-medium min-w-[80px]">
              Pickup
            </span>
            <span className="text-ink text-right font-medium">
              {ride?.source?.address || "-"}
            </span>
          </div>
          <div className="flex justify-between gap-3 items-start">
            <span className="text-text-secondary font-medium min-w-[80px]">
              Dropoff
            </span>
            <span className="text-ink text-right font-medium">
              {ride?.destination?.address || "-"}
            </span>
          </div>
          <div className="h-px w-full bg-border/50 my-2" />
          <div className="flex justify-between gap-3 items-center">
            <span className="text-text-secondary font-medium min-w-[80px]">
              Driver
            </span>
            <span className="text-ink text-right">
              {ride?.driver_name || "Waiting for driver..."}
            </span>
          </div>
          <div className="flex justify-between gap-3 items-center">
            <span className="text-text-secondary font-medium min-w-[80px]">
              ETA
            </span>
            <span className="text-ink text-right font-semibold">
              {ride?.eta_minutes ? `${ride.eta_minutes} min` : "Calculating..."}
            </span>
          </div>
          {ride?.quoted_price && (
            <div className="flex justify-between gap-3 items-center">
              <span className="text-text-secondary font-medium min-w-[80px]">
                Fare
              </span>
              <span className="text-ink text-right font-semibold">
                {ride.currency || "INR"} {ride.quoted_price}
              </span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
