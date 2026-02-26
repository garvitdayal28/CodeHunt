import { Car, MessageSquare, Star } from 'lucide-react';

import Card from '../ui/Card';

function MetricCard({ title, value, icon: Icon }) {
  return (
    <Card className="bg-surface-sunken">
      <div className="flex items-center gap-2 text-[13px] text-text-secondary">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      <p className="text-[18px] font-semibold text-ink mt-1">{value}</p>
    </Card>
  );
}

export default function RatingsSummaryCards({ summary }) {
  const average = summary?.average_stars != null ? Number(summary.average_stars).toFixed(2) : '-';
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <MetricCard title="Average Rating" value={average} icon={Star} />
      <MetricCard title="Rated Rides" value={summary?.rated_rides ?? 0} icon={Car} />
      <MetricCard title="Text Feedback" value={summary?.text_feedback_count ?? 0} icon={MessageSquare} />
      <MetricCard title="Total Rides" value={summary?.total_rides ?? 0} icon={Car} />
    </div>
  );
}
