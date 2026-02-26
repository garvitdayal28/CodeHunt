import { motion } from "motion/react";

export default function Card({ children, className = "", ...props }) {
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
      {children}
    </motion.div>
  );
}
