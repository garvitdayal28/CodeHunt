import { useEffect, useRef, useState } from 'react';

const accentColors = {
  primary: 'border-t-primary',
  blue:    'border-t-blue',
  gold:    'border-t-gold',
  danger:  'border-t-danger',
  success: 'border-t-success',
};

export default function StatCard({ title, value, icon: Icon, accent = 'primary', index = 0, className = '' }) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValue = useRef(value);

  useEffect(() => {
    if (typeof value !== 'number') { setDisplayValue(value); return; }
    const start = prevValue.current || 0;
    const end = value;
    const duration = 500;
    const startTime = performance.now();
    const animate = (t) => {
      const p = Math.min((t - startTime) / duration, 1);
      setDisplayValue(Math.round(start + (end - start) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    prevValue.current = value;
  }, [value]);

  return (
    <div className={`
      card-surface bg-white border border-border rounded-xl shadow-xs
      border-t-2 ${accentColors[accent]}
      p-5 animate-fade-in-up stagger-${index + 1} ${className}
    `}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-body-sm text-text-secondary">{title}</span>
        {Icon && (
          <div className="p-1.5 rounded-lg bg-surface-sunken">
            <Icon className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
          </div>
        )}
      </div>
      <div className="text-[28px] font-semibold text-ink tracking-tight">
        {typeof value === 'number' ? displayValue.toLocaleString() : value}
      </div>
    </div>
  );
}
