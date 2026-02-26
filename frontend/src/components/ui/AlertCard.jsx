import { Clock } from "lucide-react";
import { motion } from "motion/react";
import Button from "./Button";

export default function AlertCard({
  title,
  message,
  timestamp,
  severity = "danger",
  actions = [],
  className = "",
}) {
  const borderColor =
    severity === "warning" ? "border-l-warning" : "border-l-danger";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={`
        card-surface bg-white rounded-lg border border-border shadow-xs
        border-l-2 ${borderColor}
        p-4
        ${className}
      `}
    >
      <p className="text-label-lg text-ink">{title}</p>
      <p className="text-body-sm text-text-secondary mt-1">{message}</p>
      {timestamp && (
        <div className="flex items-center gap-1 mt-2 text-body-sm text-text-muted">
          <Clock className="h-3 w-3" strokeWidth={1.75} />
          <span>{timestamp}</span>
        </div>
      )}
      {actions.length > 0 && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
          {actions.map((action, i) => (
            <Button
              key={i}
              variant={i === 0 ? "primary" : "ghost"}
              size="sm"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
