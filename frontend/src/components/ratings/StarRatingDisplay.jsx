import { Star } from 'lucide-react';

export default function StarRatingDisplay({ value, size = 'sm' }) {
  const stars = Number.isFinite(Number(value)) ? Number(value) : 0;
  const iconSize = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${iconSize} ${stars >= n ? 'text-gold fill-gold' : 'text-border'}`}
          strokeWidth={1.8}
        />
      ))}
      <span className="ml-1 text-[13px] text-text-secondary">{stars ? stars.toFixed(1) : '-'}</span>
    </div>
  );
}
