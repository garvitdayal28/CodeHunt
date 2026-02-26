export default function Input({
  label,
  error,
  icon: Icon,
  type = 'text',
  className = '',
  inputSize = 'md',
  ...props
}) {
  const heightClass = inputSize === 'lg' ? 'h-11' : 'h-10';
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-[13px] font-medium text-ink">{label}</label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
          </div>
        )}
        <input
          type={type}
          className={`
            block w-full ${heightClass} px-3
            ${Icon ? 'pl-10' : ''}
            bg-white border
            ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-border focus:border-accent focus:ring-accent/20'}
            ${inputSize === 'lg' ? 'rounded-xl text-[15px]' : 'rounded-lg text-[14px]'}
            text-ink placeholder-text-placeholder
            outline-none transition-all duration-150
            focus:ring-2
          `}
          {...props}
        />
      </div>
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}

export function Select({ label, error, children, className = '', inputSize = 'md', ...props }) {
  const heightClass = inputSize === 'lg' ? 'h-11' : 'h-10';
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-[13px] font-medium text-ink">{label}</label>
      )}
      <select
        className={`
          block w-full ${heightClass} px-3
          bg-white border border-border
          ${inputSize === 'lg' ? 'rounded-xl text-[15px]' : 'rounded-lg text-[14px]'}
          text-ink outline-none transition-all duration-150 cursor-pointer
          focus:border-accent focus:ring-2 focus:ring-accent/20
        `}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}
