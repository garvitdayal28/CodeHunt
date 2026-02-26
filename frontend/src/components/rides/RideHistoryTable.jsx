import { Calendar, Clock, MapPin, Navigation, User } from "lucide-react";
import { motion } from "motion/react";
import Card from "../ui/Card";
import { formatDate } from "../../utils/dateUtils";

function StatusBadge({ status }) {
  const getStatusStyles = () => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-700 border-green-200";
      case "CANCELLED":
        return "bg-red-100 text-red-700 border-red-200";
      case "EXPIRED":
        return "bg-gray-100 text-gray-700 border-gray-200";
      case "IN_PROGRESS":
      case "DRIVER_EN_ROUTE":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-orange-100 text-orange-700 border-orange-200";
    }
  };

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${getStatusStyles()}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function RideHistoryTable({
  title,
  rides = [],
  travelerView = true,
}) {
  return (
    <Card className="p-0! overflow-hidden">
      <div className="p-5 border-b border-border bg-surface">
        <h3 className="text-label-lg text-ink font-semibold">{title}</h3>
      </div>

      {rides.length === 0 ? (
        <div className="p-8 text-center flex flex-col items-center justify-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface-hover mb-3">
            <Navigation className="w-6 h-6 text-text-secondary" />
          </div>
          <p className="text-[14px] text-text-secondary">
            No rides found in your history.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] whitespace-nowrap">
            <thead className="bg-surface-hover/50">
              <tr className="text-text-secondary border-b border-border">
                <th className="py-3 px-5 font-medium">Date & Time</th>
                <th className="py-3 px-5 font-medium">Route Details</th>
                <th className="py-3 px-5 font-medium">
                  {travelerView ? "Driver" : "Traveler"}
                </th>
                <th className="py-3 px-5 font-medium">Status</th>
                <th className="py-3 px-5 font-medium text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {rides.map((ride, index) => {
                const { date, time } = formatDate(ride.created_at);
                const personName = travelerView
                  ? ride.driver_name
                  : ride.traveler_name;

                return (
                  <motion.tr
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    key={ride.id}
                    className="hover:bg-surface-hover/30 transition-colors"
                  >
                    <td className="py-4 px-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-ink font-medium">
                          <Calendar className="w-3.5 h-3.5 text-text-secondary" />
                          {date}
                        </div>
                        <div className="flex items-center gap-1.5 text-text-secondary text-[12px]">
                          <Clock className="w-3.5 h-3.5" />
                          {time}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex flex-col gap-2 max-w-75 whitespace-normal">
                        <div className="flex items-start gap-2">
                          <div className="mt-1 shrink-0">
                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                          </div>
                          <span
                            className="text-ink line-clamp-2 leading-tight"
                            title={ride?.source?.address}
                          >
                            {ride?.source?.address || "-"}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 shrink-0">
                            <MapPin className="w-3 h-3 text-red-500 -ml-0.5" />
                          </div>
                          <span
                            className="text-text-secondary line-clamp-2 leading-tight"
                            title={ride?.destination?.address}
                          >
                            {ride?.destination?.address || "-"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-text-secondary" />
                        </div>
                        <span className="text-ink font-medium">
                          {personName || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <StatusBadge status={ride.status} />
                    </td>
                    <td className="py-4 px-5 text-right">
                      {ride.quoted_price ? (
                        <div className="flex items-center justify-end gap-1 text-ink font-semibold">
                          <span className="text-[11px] text-text-secondary font-normal">
                            {ride.currency || "INR"}
                          </span>
                          {ride.quoted_price}
                        </div>
                      ) : (
                        <span className="text-text-secondary">-</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
