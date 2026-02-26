import { useEffect, useMemo, useState } from "react";
import { Building2, Edit3, MapPin, Save, Star, Wallet } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import api from "../../api/axios";
import HotelEditableCard from "../../components/hotel/HotelEditableCard";
import HotelInfoCard from "../../components/hotel/HotelInfoCard";
import ImageUploadInput from "../../components/hotel/ImageUploadInput";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

function toFormState(profile) {
  return {
    name: profile?.name || "",
    location: profile?.location || "",
    address: profile?.address || "",
    description: profile?.description || "",
    price_per_night: profile?.price_per_night?.toString() || "",
    rating: profile?.rating?.toString() || "",
    total_rooms: profile?.total_rooms?.toString() || "",
    amenities: (profile?.amenities || []).join(", "),
    image_urls: profile?.image_urls || [],
  };
}

export default function HotelDashboard() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(toFormState(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get("/admin/hotel/profile");
        const data = res?.data?.data || {};
        setProfile(data);
        setForm(toFormState(data));
      } catch (err) {
        const message = err?.response?.data?.message;
        setError(message || "Failed to load hotel profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const cards = useMemo(
    () => [
      {
        title: "Property",
        icon: Building2,
        fields: [
          { label: "Hotel Name", value: profile?.name },
          { label: "Address", value: profile?.address },
          { label: "Description", value: profile?.description },
        ],
      },
      {
        title: "Location & Rating",
        icon: MapPin,
        fields: [
          { label: "Location", value: profile?.location },
          {
            label: "Rating",
            value: profile?.rating ? `${profile.rating}/5` : "-",
          },
        ],
      },
      {
        title: "Pricing & Rooms",
        icon: Wallet,
        fields: [
          {
            label: "Price Per Night",
            value: profile?.price_per_night
              ? `INR ${profile.price_per_night}`
              : "-",
          },
          { label: "Total Rooms", value: profile?.total_rooms },
        ],
      },
      {
        title: "Amenities",
        icon: Star,
        fields: [
          {
            label: "Available",
            value: (profile?.amenities || []).join(", ") || "-",
          },
        ],
      },
      {
        title: "Gallery",
        icon: Star,
        fields: [
          {
            label: "Hotel Images",
            value: `${(profile?.image_urls || []).length} uploaded`,
          },
        ],
      },
    ],
    [profile],
  );

  const handleSave = async () => {
    try {
      setError("");
      setSuccess("");
      setSaving(true);

      const payload = {
        name: form.name,
        location: form.location,
        address: form.address,
        description: form.description,
        price_per_night: form.price_per_night,
        rating: form.rating,
        total_rooms: form.total_rooms,
        amenities: form.amenities,
        image_urls: form.image_urls,
      };

      const res = await api.put("/admin/hotel/profile", payload);
      const updated = res?.data?.data || {};
      setProfile(updated);
      setForm(toFormState(updated));
      setEditing(false);
      setSuccess("Hotel profile updated successfully.");
    } catch (err) {
      const message = err?.response?.data?.message;
      setError(message || "Failed to update hotel profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(toFormState(profile));
    setEditing(false);
    setError("");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 bg-surface-sunken rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-48 bg-surface-sunken rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-display-md text-ink">Hotel Dashboard</h1>
          <p className="text-body-sm text-text-secondary mt-1">
            View your property profile in cards. Switch to edit mode when
            needed.
          </p>
        </div>
        {!editing ? (
          <Button icon={Edit3} onClick={() => setEditing(true)}>
            Edit profile
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button icon={Save} loading={saving} onClick={handleSave}>
              Save
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence mode="popLayout">
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="bg-danger-soft border border-danger/20 rounded-lg p-3 overflow-hidden"
          >
            <p className="text-[13px] text-danger">{error}</p>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="bg-success/10 border border-success/20 rounded-lg p-3 overflow-hidden"
          >
            <p className="text-[13px] text-success">{success}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {!editing ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {cards.map((card) => (
              <HotelInfoCard
                key={card.title}
                title={card.title}
                icon={card.icon}
                fields={card.fields}
              />
            ))}
          </div>
          {(profile?.image_urls || []).length > 0 && (
            <div className="rounded-xl border border-border bg-white p-5">
              <h3 className="text-label-lg text-ink mb-3">Hotel Gallery</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {(profile?.image_urls || []).map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt="Hotel"
                    className="h-28 w-full object-cover rounded-lg border border-border"
                  />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          <HotelEditableCard title="Property" icon={Building2}>
            <Input
              label="Hotel name"
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
            />
            <Input
              label="Address"
              type="text"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-ink">
                Description
              </label>
              <textarea
                className="
                  block w-full min-h-24 px-3 py-2
                  bg-white border border-border
                  rounded-lg text-[14px] text-ink placeholder-text-placeholder
                  outline-none transition-all duration-150
                  focus:border-accent focus:ring-2 focus:ring-accent/20
                "
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Describe your property and what makes it special."
              />
            </div>
          </HotelEditableCard>

          <HotelEditableCard title="Location & Rating" icon={MapPin}>
            <Input
              label="Location"
              type="text"
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              required
            />
            <Input
              label="Rating"
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={form.rating}
              onChange={(e) => updateField("rating", e.target.value)}
            />
          </HotelEditableCard>

          <HotelEditableCard title="Pricing & Rooms" icon={Wallet}>
            <Input
              label="Price per night"
              type="number"
              min="0"
              value={form.price_per_night}
              onChange={(e) => updateField("price_per_night", e.target.value)}
            />
            <Input
              label="Total rooms"
              type="number"
              min="1"
              value={form.total_rooms}
              onChange={(e) => updateField("total_rooms", e.target.value)}
            />
          </HotelEditableCard>

          <HotelEditableCard title="Amenities" icon={Star}>
            <Input
              label="Amenities (comma separated)"
              type="text"
              value={form.amenities}
              onChange={(e) => updateField("amenities", e.target.value)}
              placeholder="Wifi, Pool, Parking"
            />
          </HotelEditableCard>

          <HotelEditableCard title="Gallery" icon={Star}>
            <ImageUploadInput
              label="Hotel Images"
              images={form.image_urls || []}
              onChange={(imgs) => updateField("image_urls", imgs)}
              folder={
                profile?.id
                  ? `tripallied/properties/${profile.id}/hotel`
                  : "tripallied/hotel"
              }
              maxFiles={20}
            />
          </HotelEditableCard>
        </motion.div>
      )}
    </motion.div>
  );
}
