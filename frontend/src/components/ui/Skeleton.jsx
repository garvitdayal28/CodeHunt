export default function Skeleton({
  className = "",
  rounded = "lg",
  ...props
}) {
  const roundedClass = {
    sm: "skeleton-rounded-sm",
    md: "skeleton-rounded-md",
    lg: "skeleton-rounded-lg",
    xl: "skeleton-rounded-xl",
    full: "skeleton-rounded-full",
  }[rounded];

  return <div className={`skeleton ${roundedClass} ${className}`} {...props} />;
}

export function SkeletonText({ lines = 3, lineHeightClass = "h-3.5", className = "" }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton
          key={idx}
          className={`${lineHeightClass} ${idx === lines - 1 ? "w-3/4" : "w-full"}`}
          rounded="md"
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "", bodyLines = 3 }) {
  return (
    <div className={`rounded-xl border border-border bg-white p-4 ${className}`}>
      <Skeleton className="h-36 w-full" rounded="lg" />
      <Skeleton className="mt-4 h-4 w-2/3" rounded="md" />
      <SkeletonText lines={bodyLines} className="mt-3" />
    </div>
  );
}

export function TableSkeleton({ columns = 5, rows = 5, className = "" }) {
  return (
    <div className={`rounded-xl border border-border bg-white p-4 ${className}`}>
      <div className="grid gap-3">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((_, idx) => (
            <Skeleton key={idx} className="h-3.5" rounded="md" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((__, colIdx) => (
              <Skeleton key={`${rowIdx}-${colIdx}`} className="h-4" rounded="md" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSectionSkeleton({
  titleWidthClass = "w-48",
  blocks = 1,
  blockHeightClass = "h-64",
  className = "",
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      <Skeleton className={`h-8 ${titleWidthClass}`} rounded="lg" />
      {Array.from({ length: blocks }).map((_, idx) => (
        <Skeleton key={idx} className={blockHeightClass} rounded="xl" />
      ))}
    </div>
  );
}
