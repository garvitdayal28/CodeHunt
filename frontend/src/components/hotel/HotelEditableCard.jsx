import { motion } from "motion/react";
import Card from "../ui/Card";

export default function HotelEditableCard({ title, icon: Icon, children }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card className="h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          {Icon && (
            <div className="p-1.5 rounded-lg bg-surface-sunken">
              <Icon className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
            </div>
          )}
          <h3 className="text-label-lg text-ink">{title}</h3>
        </div>
        <div className="space-y-3 flex-1">{children}</div>
      </Card>
    </motion.div>
  );
}
