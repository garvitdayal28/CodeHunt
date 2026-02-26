import { motion } from "motion/react";
import Skeleton from "./Skeleton";

export default function Card({
  children,
  className = "",
  loading = false,
  skeletonClassName = "h-40",
  ...props
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        card-surface bg-white border border-border rounded-xl shadow-xs
        p-5 transition-shadow duration-200
        ${className}
      `}
      {...props}
    >
      {loading ? <Skeleton className={skeletonClassName} rounded="lg" /> : children}
    </motion.div>
  );
}
