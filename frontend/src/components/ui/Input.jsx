import { motion, AnimatePresence } from "motion/react";

const stateStyles = {
  default: "border-border focus:border-accent focus:ring-accent/20",
  error: "border-danger focus:border-danger focus:ring-danger/20",
  success: "border-success/40 focus:border-success focus:ring-success/20",
};

function FieldMeta({ error, hint }) {
  return (
    <AnimatePresence mode="wait">
      {error ? (
        <motion.p
          key="error"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="text-[13px] text-danger"
        >
          {error}
        </motion.p>
      ) : hint ? (
        <motion.p
          key="hint"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="text-[12px] text-text-secondary"
        >
          {hint}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}

export default function Input({
  label,
  error,
  hint,
  icon: Icon,
  type = "text",
  className = "",
  inputClassName = "",
  inputSize = "md",
  requiredMark = false,
  state = "default",
  ...props
}) {
  const heightClass = inputSize === "lg" ? "h-11" : "h-10";
  const visualState = error ? "error" : state;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-[13px] font-medium text-ink">
          {label}
          {requiredMark ? <span className="ml-1 text-danger">*</span> : null}
        </label>
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
            ${Icon ? "pl-10" : ""}
            bg-white border
            ${stateStyles[visualState] || stateStyles.default}
            ${inputSize === "lg" ? "rounded-xl text-[15px]" : "rounded-lg text-[14px]"}
            text-ink placeholder-text-placeholder
            outline-none transition-all duration-150
            focus:ring-2
            ${inputClassName}
          `}
          {...props}
        />
      </div>
      <FieldMeta error={error} hint={hint} />
    </div>
  );
}

export function Select({
  label,
  error,
  hint,
  children,
  className = "",
  inputClassName = "",
  inputSize = "md",
  requiredMark = false,
  state = "default",
  ...props
}) {
  const heightClass = inputSize === "lg" ? "h-11" : "h-10";
  const visualState = error ? "error" : state;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-[13px] font-medium text-ink">
          {label}
          {requiredMark ? <span className="ml-1 text-danger">*</span> : null}
        </label>
      )}
      <select
        className={`
          block w-full ${heightClass} px-3
          bg-white border
          ${stateStyles[visualState] || stateStyles.default}
          ${inputSize === "lg" ? "rounded-xl text-[15px]" : "rounded-lg text-[14px]"}
          text-ink outline-none transition-all duration-150 cursor-pointer
          focus:ring-2
          ${inputClassName}
        `}
        {...props}
      >
        {children}
      </select>
      <FieldMeta error={error} hint={hint} />
    </div>
  );
}

export function Textarea({
  label,
  error,
  hint,
  className = "",
  inputClassName = "",
  requiredMark = false,
  state = "default",
  rows = 4,
  ...props
}) {
  const visualState = error ? "error" : state;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-[13px] font-medium text-ink">
          {label}
          {requiredMark ? <span className="ml-1 text-danger">*</span> : null}
        </label>
      )}
      <textarea
        rows={rows}
        className={`
          block w-full px-3 py-2
          bg-white border rounded-lg text-[14px] text-ink placeholder-text-placeholder
          outline-none transition-all duration-150 focus:ring-2
          ${stateStyles[visualState] || stateStyles.default}
          ${inputClassName}
        `}
        {...props}
      />
      <FieldMeta error={error} hint={hint} />
    </div>
  );
}
