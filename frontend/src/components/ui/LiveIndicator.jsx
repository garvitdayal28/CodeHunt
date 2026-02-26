export default function LiveIndicator({ connected = false, label = 'LIVE' }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-label-sm">
      <span
        className={`
          h-2 w-2 rounded-full
          ${connected ? 'bg-success animate-pulse-live' : 'bg-border'}
        `}
      />
      <span className={connected ? 'text-success' : 'text-text-secondary'}>
        {connected ? label : 'OFFLINE'}
      </span>
    </span>
  );
}
