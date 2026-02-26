import { motion } from "motion/react";
import Button from "../ui/Button";
import Card from "../ui/Card";

export default function DriverOnlineToggle({
  online,
  city,
  onToggle,
  connected,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={`border-l-4 ${online ? "border-l-success" : "border-l-border"}`}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-label-lg text-ink">Driver Availability</h3>
              <span className="relative flex h-3 w-3">
                {online && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${online ? "bg-success" : "bg-text-secondary"}`}
                ></span>
              </span>
            </div>
            <p className="text-[13px] text-text-secondary mt-1">
              {connected ? "Realtime connected" : "Realtime disconnected"}
              {city ? ` - ${city}` : ""}
            </p>
          </div>
          <Button variant={online ? "danger" : "primary"} onClick={onToggle}>
            {online ? "Go Offline" : "Go Online"}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
