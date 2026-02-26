export default function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`
        card-surface bg-white border border-border rounded-xl shadow-xs
        p-5 transition-shadow duration-200
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
