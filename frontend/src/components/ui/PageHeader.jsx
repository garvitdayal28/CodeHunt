export default function PageHeader({
  title,
  description,
  action = null,
  className = "",
}) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      <div>
        <h1 className="text-display-md text-ink">{title}</h1>
        {description ? (
          <p className="mt-1 text-body-sm text-text-secondary">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
