import {
  Leaf,
  Drumstick,
  IndianRupee,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { motion } from "motion/react";

import Button from "../ui/Button";
import Card from "../ui/Card";

export default function MenuItemCard({
  item,
  onEdit,
  onDelete,
  showActions = true,
  variant = "owner",
}) {
  const image = item.cover_image || item.images?.[0];
  const canManage =
    showActions &&
    variant !== "traveler" &&
    typeof onEdit === "function" &&
    typeof onDelete === "function";

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card className="flex flex-col h-full hover:shadow-md transition-shadow p-4 lg:p-5">
        {/* Header: Identity & Price */}
        <div className="flex justify-between items-start gap-3 mb-3">
          <div className="flex gap-3">
            <div
              className={`mt-0.5 shrink-0 flex items-center justify-center h-8 w-8 rounded-full ${item.is_veg
                  ? "bg-green-100 text-green-600"
                  : "bg-red-100 text-red-600"
                }`}
            >
              {item.is_veg ? (
                <Leaf className="h-4 w-4" strokeWidth={2.5} />
              ) : (
                <Drumstick className="h-4 w-4" strokeWidth={2.5} />
              )}
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-ink leading-tight">
                {item.name}
              </h3>
              {item.description && (
                <p className="text-[13px] text-text-secondary mt-0.5 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[16px] font-semibold text-ink flex items-center justify-end whitespace-nowrap">
              <IndianRupee className="h-4 w-4 mr-0.5" />
              {Number(item.price || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Hero Image */}
        {image && (
          <div className="w-full relative rounded-xl overflow-hidden mb-4 bg-surface-sunken shrink-0">
            <img
              src={image}
              alt={item.name}
              className="w-full h-40 object-cover"
            />
          </div>
        )}

        {/* Badges / Tags */}
        <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium mb-auto">
          {item.category && (
            <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 border border-transparent">
              {item.category}
            </span>
          )}
          {item.servings && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border text-text-secondary">
              <Users className="h-3.5 w-3.5" />
              {item.servings}
            </span>
          )}
          <span
            className={`px-3 py-1 rounded-full ${item.is_veg
                ? "bg-green-50 text-green-600 border border-green-200/50"
                : "bg-red-50 text-red-600 border border-red-200/50"
              }`}
          >
            {item.is_veg ? "Veg" : "Non-Veg"}
          </span>
          {item.is_available === false && (
            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700">
              Unavailable
            </span>
          )}
        </div>

        {/* Action Buttons (Only render if authorized) */}
        {canManage && (
          <div className="flex items-center gap-3 pt-4 mt-5 border-t border-border">
            <Button
              variant="secondary"
              icon={Pencil}
              onClick={() => onEdit(item)}
              className="rounded-xl flex-1 text-[13px] h-10"
            >
              Edit
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              onClick={() => onDelete(item.id)}
              className="rounded-xl flex-1 text-[13px] h-10"
            >
              Delete
            </Button>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
