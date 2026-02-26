export default function EmptyState({
  icon: Icon,
  title,
  description,
  action = null,
  className = "",
}) {
  return (
    <div className={`rounded-xl border border-border bg-white px-4 py-10 text-center ${className}`}>
      {Icon ? (
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-hover">
          <Icon className="h-6 w-6 text-text-secondary" />
        </div>
      ) : null}
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-lg text-[13px] text-text-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
