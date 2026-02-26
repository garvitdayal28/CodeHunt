import { Star } from 'lucide-react';

export default function StarRatingInput({ value = 0, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="cursor-pointer"
          onClick={() => onChange(star)}
        >
          <Star
            className={`h-5 w-5 ${star <= value ? 'text-gold fill-gold' : 'text-text-placeholder'}`}
            strokeWidth={1.75}
          />
        </button>
      ))}
      {value > 0 && (
        <button
          type="button"
          className="text-[12px] text-text-secondary ml-2 underline cursor-pointer"
          onClick={() => onChange(0)}
        >
          clear
        </button>
      )}
    </div>
  );
}
