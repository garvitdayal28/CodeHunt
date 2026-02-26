import { BedDouble, DoorOpen, Users } from "lucide-react";
import { motion } from "motion/react";

import Button from "../ui/Button";
import Card from "../ui/Card";

function formatPrice(value) {
  return `INR ${Number(value || 0).toLocaleString()}`;
}

export default function HotelRoomCard({
  room,
  selected = false,
  onSelect,
  roomsRequested = 1,
}) {
  const image = room.cover_image || room.images?.[0];
  const isUnavailable = room.available_rooms < roomsRequested;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card
        className={`space-y-3 h-full flex flex-col ${selected ? "ring-2 ring-primary/30 border-primary" : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-label-lg text-ink">{room.name}</h3>
            <p className="text-[13px] text-text-secondary mt-1">
              {room.description || "No description provided."}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[18px] font-semibold text-ink">
              {formatPrice(room.price_per_day)}
            </p>
            <p className="text-[12px] text-text-secondary">per day</p>
          </div>
        </div>

        {image && (
          <img
            src={image}
            alt={room.name}
            className="h-32 w-full object-cover rounded-lg border border-border"
          />
        )}

        <div className="grid grid-cols-3 gap-2 text-[12px]">
          <div className="rounded-lg border border-border bg-surface-sunken/40 p-2">
            <span className="inline-flex items-center gap-1.5 text-text-secondary">
              <DoorOpen className="h-3.5 w-3.5" />
              Available
            </span>
            <p className="text-ink font-medium mt-1">{room.available_rooms}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-sunken/40 p-2">
            <span className="inline-flex items-center gap-1.5 text-text-secondary">
              <BedDouble className="h-3.5 w-3.5" />
              Beds
            </span>
            <p className="text-ink font-medium mt-1">{room.beds || "-"}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-sunken/40 p-2">
            <span className="inline-flex items-center gap-1.5 text-text-secondary">
              <Users className="h-3.5 w-3.5" />
              Max Guests
            </span>
            <p className="text-ink font-medium mt-1">
              {room.max_guests || "-"}
            </p>
          </div>
        </div>

        {(room.amenities || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {(room.amenities || []).slice(0, 8).map((amenity) => (
              <span
                key={amenity}
                className="text-[11px] px-2 py-1 rounded-full bg-primary-soft text-primary"
              >
                {amenity}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-2">
          <span
            className={`text-[12px] font-medium ${isUnavailable ? "text-danger" : "text-success"}`}
          >
            {isUnavailable
              ? "Not enough availability"
              : room.availability_status || "Available"}
          </span>
          <Button
            size="sm"
            variant={selected ? "secondary" : "primary"}
            onClick={() => onSelect(room)}
            disabled={isUnavailable}
          >
            {selected ? "Selected" : "Select Room"}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
