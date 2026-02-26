import { motion } from "motion/react";

const statusConfig = {
  ON_TRACK: { bg: "bg-success-soft", text: "text-success", label: "On Track" },
  CONFIRMED: {
    bg: "bg-success-soft",
    text: "text-success",
    label: "Confirmed",
  },
  COMPLETED: {
    bg: "bg-surface-sunken",
    text: "text-text-secondary",
    label: "Completed",
  },
  DISRUPTED: { bg: "bg-danger-soft", text: "text-danger", label: "Disrupted" },
  MISSED: { bg: "bg-danger-soft", text: "text-danger", label: "Missed" },
  LATE_ARRIVAL: {
    bg: "bg-warning-soft",
    text: "text-warning",
    label: "Late Arrival",
  },
  CHECKED_IN: { bg: "bg-info-soft", text: "text-info", label: "Checked In" },
  CHECKED_OUT: {
    bg: "bg-surface-sunken",
    text: "text-text-secondary",
    label: "Checked Out",
  },
  PENDING: { bg: "bg-warning-soft", text: "text-warning", label: "Pending" },
  UPCOMING: { bg: "bg-info-soft", text: "text-info", label: "Upcoming" },
  RESCHEDULED: {
    bg: "bg-info-soft",
    text: "text-info",
    label: "Rescheduled",
  },
  DRAFT: {
    bg: "bg-surface-sunken",
    text: "text-text-secondary",
    label: "Draft",
  },
  REQUESTED: { bg: "bg-info-soft", text: "text-info", label: "Requested" },
  QUOTE_SENT: { bg: "bg-warning-soft", text: "text-warning", label: "Quote Sent" },
  QUOTE_ACCEPTED: { bg: "bg-success-soft", text: "text-success", label: "Quote Accepted" },
  DRIVER_EN_ROUTE: { bg: "bg-info-soft", text: "text-info", label: "Driver En Route" },
  ACCEPTED_PENDING_QUOTE: {
    bg: "bg-warning-soft",
    text: "text-warning",
    label: "Pending Quote",
  },
  CANCELLED: { bg: "bg-danger-soft", text: "text-danger", label: "Cancelled" },
};

export default function StatusBadge({ status, className = "" }) {
  const config =
    statusConfig[status] || {
      bg: "bg-surface-sunken",
      text: "text-text-secondary",
      label: String(status || "Unknown")
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (ch) => ch.toUpperCase()),
    };

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`
        inline-flex items-center
        px-2 py-0.5 rounded-md
        text-[11px] font-semibold uppercase tracking-[0.04em]
        ${config.bg} ${config.text}
        ${className}
      `}
    >
      {config.label}
    </motion.span>
  );
}
