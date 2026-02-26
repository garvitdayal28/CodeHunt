const statusConfig = {
  ON_TRACK:     { bg: 'bg-success-soft', text: 'text-success',        label: 'On Track' },
  CONFIRMED:    { bg: 'bg-success-soft', text: 'text-success',        label: 'Confirmed' },
  COMPLETED:    { bg: 'bg-surface-sunken', text: 'text-text-secondary', label: 'Completed' },
  DISRUPTED:    { bg: 'bg-danger-soft',  text: 'text-danger',          label: 'Disrupted' },
  MISSED:       { bg: 'bg-danger-soft',  text: 'text-danger',          label: 'Missed' },
  LATE_ARRIVAL: { bg: 'bg-warning-soft', text: 'text-warning',         label: 'Late Arrival' },
  PENDING:      { bg: 'bg-warning-soft', text: 'text-warning',         label: 'Pending' },
  UPCOMING:     { bg: 'bg-info-soft',    text: 'text-info',            label: 'Upcoming' },
  RESCHEDULED:  { bg: 'bg-accent-soft',  text: 'text-accent',          label: 'Rescheduled' },
  DRAFT:        { bg: 'bg-surface-sunken', text: 'text-text-secondary', label: 'Draft' },
};

export default function StatusBadge({ status, className = '' }) {
  const config = statusConfig[status] || statusConfig.PENDING;

  return (
    <span
      className={`
        inline-flex items-center
        px-2 py-0.5 rounded-md
        text-[11px] font-semibold uppercase tracking-[0.04em]
        ${config.bg} ${config.text}
        ${className}
      `}
    >
      {config.label}
    </span>
  );
}
