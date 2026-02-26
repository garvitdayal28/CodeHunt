import {
  Clock3,
  IndianRupee,
  MapPin,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";

import Button from "../ui/Button";
import Card from "../ui/Card";

function prettyLabel(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export default function GuideServiceCard({ service, onEdit, onDelete }) {
  const coverImage = service.cover_image || service.images?.[0];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card className="space-y-3 h-full flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-label-lg text-ink">{service.name}</h3>
            <p className="text-[13px] text-text-secondary mt-1">
              {service.description || "No description provided."}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="inline-flex items-center gap-0.5 text-[16px] font-semibold text-ink">
              <IndianRupee className="h-3.5 w-3.5" />
              {Number(service.price || 0).toLocaleString()}
            </p>
            <p className="text-[12px] text-text-secondary">
              {prettyLabel(service.price_unit || "PER_PERSON")}
            </p>
          </div>
        </div>

        {coverImage && (
          <img
            src={coverImage}
            alt={service.name}
            className="h-36 w-full object-cover rounded-lg border border-border"
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px]">
          <div className="rounded-lg border border-border bg-surface-sunken/40 p-2">
            <span className="inline-flex items-center gap-1 text-text-secondary">
              <MapPin className="h-3.5 w-3.5" />
              Location
            </span>
            <p className="text-ink font-medium mt-1">
              {service.location || "-"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-sunken/40 p-2">
            <span className="inline-flex items-center gap-1 text-text-secondary">
              <Clock3 className="h-3.5 w-3.5" />
              Duration
            </span>
            <p className="text-ink font-medium mt-1">
              {service.duration_hours || "-"}h
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-sunken/40 p-2">
            <span className="inline-flex items-center gap-1 text-text-secondary">
              <Users className="h-3.5 w-3.5" />
              Group Size
            </span>
            <p className="text-ink font-medium mt-1">
              {service.max_group_size || "-"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="px-2 py-1 rounded-full bg-primary-soft text-primary text-[11px] font-medium">
            {prettyLabel(service.service_type)}
          </span>
          <span
            className={`px-2 py-1 rounded-full text-[11px] font-medium ${
              service.is_active
                ? "bg-success/10 text-success border border-success/20"
                : "bg-warning/10 text-warning border border-warning/25"
            }`}
          >
            {service.is_active ? "Active" : "Inactive"}
          </span>
          {(service.category || []).slice(0, 4).map((item) => (
            <span
              key={`${service.id}-${item}`}
              className="px-2 py-1 rounded-full bg-surface-sunken text-text-secondary text-[11px]"
            >
              {item}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-1 mt-auto">
          <Button
            variant="secondary"
            icon={Pencil}
            onClick={() => onEdit(service)}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            icon={Trash2}
            onClick={() => onDelete(service.id)}
          >
            Delete
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
