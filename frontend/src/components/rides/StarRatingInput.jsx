import { Star } from "lucide-react";
import { motion } from "motion/react";

export default function StarRatingInput({ value = 0, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.button
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          key={star}
          type="button"
          className="cursor-pointer"
          onClick={() => onChange(star)}
        >
          <Star
            className={`h-6 w-6 transition-colors duration-200 ${star <= value ? "text-gold fill-gold" : "text-text-placeholder"}`}
            strokeWidth={1.75}
          />
        </motion.button>
      ))}
      {value > 0 && (
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          type="button"
          className="text-[12px] text-text-secondary ml-2 underline cursor-pointer"
          onClick={() => onChange(0)}
        >
          clear
        </motion.button>
      )}
    </div>
  );
}
