import { Loader2, Check } from "lucide-react";
import { motion } from "motion/react";

const variants = {
  primary: "bg-primary text-white hover:bg-primary-hover shadow-sm",
  secondary: "bg-white text-ink border border-border hover:bg-surface-sunken",
  danger: "bg-danger text-white hover:bg-danger/90",
  ghost: "text-text-secondary hover:text-ink hover:bg-surface-sunken",
  blue: "bg-blue text-white hover:bg-blue-hover shadow-sm",
};

const sizes = {
  sm: "h-8 px-3 text-[13px] rounded-lg gap-1.5",
  md: "h-9 px-4 text-[14px] rounded-lg gap-2",
  lg: "h-11 px-5 text-[15px] rounded-xl gap-2 font-medium",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  success = false,
  icon: Icon,
  className = "",
  disabled,
  ...props
}) {
  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      className={`
        inline-flex items-center justify-center font-medium
        transition-all duration-150 ease-out cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : success ? (
        <Check className="h-4 w-4" />
      ) : Icon ? (
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      ) : null}
      {children}
    </motion.button>
  );
}
