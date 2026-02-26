import { BedDouble, DoorOpen, Pencil, Trash2, Users } from "lucide-react";
import { motion } from "motion/react";

import Button from "../ui/Button";
import Card from "../ui/Card";

export default function RoomTypeCard({ room, onEdit, onDelete }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card className="space-y-3 h-full flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-label-lg text-ink">{room.name}</h3>
            <p className="text-[13px] text-text-secondary mt-1">
              {room.description || "No description provided."}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[16px] font-semibold text-ink">
              INR {room.price_per_day}
            </p>
            <p className="text-[12px] text-text-secondary">per day</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[12px]">
          <div className="rounded-lg border border-border bg-surface-sunken/40 p-2">
            <span className="inline-flex items-center gap-1.5 text-text-secondary">
              <DoorOpen className="h-3.5 w-3.5" />
              Rooms
            </span>
            <p className="text-ink font-medium mt-1">{room.total_rooms}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-sunken/40 p-2">
            <span className="inline-flex items-center gap-1.5 text-text-secondary">
              <BedDouble className="h-3.5 w-3.5" />
              Beds
            </span>
            <p className="text-ink font-medium mt-1">{room.beds}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-sunken/40 p-2">
            <span className="inline-flex items-center gap-1.5 text-text-secondary">
              <Users className="h-3.5 w-3.5" />
              Guests
            </span>
            <p className="text-ink font-medium mt-1">
              {room.max_guests || "-"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-sunken/40 p-2">
            <span className="inline-flex items-center gap-1.5 text-text-secondary">
              Available
            </span>
            <p className="text-ink font-medium mt-1">
              {room.room_count_available ?? room.total_rooms}
            </p>
          </div>
        </div>

        {room.images?.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {room.images.slice(0, 4).map((url) => (
              <img
                key={url}
                src={url}
                alt={room.name}
                className="h-24 w-full object-cover rounded-lg border border-border"
              />
            ))}
          </div>
        )}

        {(room.amenities || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {room.amenities.slice(0, 8).map((amenity) => (
              <span
                key={amenity}
                className="text-[11px] px-2 py-1 rounded-full bg-primary-soft text-primary"
              >
                {amenity}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1 mt-auto">
          <Button
            variant="secondary"
            icon={Pencil}
            onClick={() => onEdit(room)}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            icon={Trash2}
            onClick={() => onDelete(room.id)}
          >
            Delete
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
