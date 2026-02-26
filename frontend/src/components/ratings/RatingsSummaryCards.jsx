import { Car, MessageSquare, Star } from "lucide-react";
import { motion } from "motion/react";

import Card from "../ui/Card";

function MetricCard({ title, value, icon: Icon, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ scale: 1.02 }}
    >
      <Card className="bg-surface-sunken h-full">
        <div className="flex items-center gap-2 text-[13px] text-text-secondary">
          {Icon && <Icon className="h-4 w-4" />}
          {title}
        </div>
        <p className="text-[24px] font-semibold text-ink mt-2">{value}</p>
      </Card>
    </motion.div>
  );
}

export default function RatingsSummaryCards({ summary }) {
  const average =
    summary?.average_stars != null
      ? Number(summary.average_stars).toFixed(2)
      : "-";
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <MetricCard
        title="Average Rating"
        value={average}
        icon={Star}
        delay={0.1}
      />
      <MetricCard
        title="Rated Rides"
        value={summary?.rated_rides ?? 0}
        icon={Car}
        delay={0.2}
      />
      <MetricCard
        title="Text Feedback"
        value={summary?.text_feedback_count ?? 0}
        icon={MessageSquare}
        delay={0.3}
      />
      <MetricCard
        title="Total Rides"
        value={summary?.total_rides ?? 0}
        icon={Car}
        delay={0.4}
      />
    </div>
  );
}
