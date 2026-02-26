import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  Building2,
  CalendarCheck2,
  Edit3,
  Image as ImageIcon,
  Save,
  Star,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import api from "../../api/axios";
import BusinessEditableCard from "../../components/business/BusinessEditableCard";
import HotelBookingsTable from "../../components/hotel/HotelBookingsTable";
import ImageUploadInput from "../../components/hotel/ImageUploadInput";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input, { Select } from "../../components/ui/Input";
import StatCard from "../../components/ui/StatCard";
import {
  BUSINESS_TYPES,
  GUIDE_SERVICE_OPTIONS,
  buildBusinessProfilePayload,
  businessProfileToForm,
  createEmptyBusinessForm,
} from "../../constants/business";

function ProfileRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0">
      <span className="text-[13px] text-text-secondary">{label}</span>
      <span className="text-[13px] font-medium text-ink text-right">
        {value || "-"}
      </span>
    </div>
  );
}

function prettyBusinessType(type) {
  if (!type) return "-";
  return type
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function BusinessDashboard() {
  const [userUid, setUserUid] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [businessForm, setBusinessForm] = useState(createEmptyBusinessForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [hotelBookings, setHotelBookings] = useState([]);
  const [hotelRooms, setHotelRooms] = useState([]);
  const [hotelOpsLoading, setHotelOpsLoading] = useState(false);
  const [bookingActionLoadingId, setBookingActionLoadingId] = useState("");

  const isHotelBusiness = businessForm.businessType === "HOTEL";
  const isRestaurantBusiness = businessForm.businessType === "RESTAURANT";

  const updateBusinessField = (field, value) => {
    setBusinessForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetFromProfile = (profile) => {
    setUserUid(profile?.uid || "");
    setDisplayName(profile?.display_name || "");
    setBusinessForm(businessProfileToForm(profile?.business_profile));
  };

  const fetchProfile = useCallback(async () => {
    const res = await api.get("/business/profile");
    const data = res?.data?.data;
    resetFromProfile(data);
    return data;
  }, []);

  const loadHotelOperations = useCallback(async () => {
    try {
      setHotelOpsLoading(true);
      const [bookingsRes, roomsRes] = await Promise.all([
        api.get("/business/hotel/bookings"),
        api.get("/business/hotel/rooms"),
      ]);
      setHotelBookings(bookingsRes?.data?.data || []);
      setHotelRooms(roomsRes?.data?.data || []);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to load hotel operations data.",
      );
      setHotelBookings([]);
      setHotelRooms([]);
    } finally {
      setHotelOpsLoading(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const profile = await fetchProfile();
        if (profile?.business_profile?.business_type === "HOTEL") {
          await loadHotelOperations();
        }
      } catch (err) {
        const backendMessage = err?.response?.data?.message;
        setError(backendMessage || "Failed to load business profile.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [fetchProfile, loadHotelOperations]);

  const summaryRows = useMemo(
    () => [
      { label: "Profile name", value: displayName },
      {
        label: "Business type",
        value: prettyBusinessType(businessForm.businessType),
      },
      { label: "Business name", value: businessForm.businessName },
      { label: "Phone", value: businessForm.phone },
      { label: "City", value: businessForm.city },
      { label: "Address", value: businessForm.address },
    ],
    [displayName, businessForm],
  );

  const detailsRows = useMemo(() => {
    if (businessForm.businessType === "HOTEL") {
      return [
        { label: "Total rooms", value: businessForm.totalRooms },
        { label: "Amenities", value: businessForm.amenities },
        {
          label: "Gallery images",
          value: `${(businessForm.hotelImages || []).length}`,
        },
      ];
    }
    if (businessForm.businessType === "RESTAURANT") {
      return [
        { label: "Cuisine", value: businessForm.cuisine },
        { label: "Opening hours", value: businessForm.openingHours },
        { label: "Seating capacity", value: businessForm.seatingCapacity },
        {
          label: "Gallery images",
          value: `${(businessForm.restaurantImages || []).length}`,
        },
      ];
    }
    if (businessForm.businessType === "CAB_DRIVER") {
      return [
        { label: "Driver name", value: businessForm.driverName },
        { label: "Vehicle type", value: businessForm.vehicleType },
        { label: "Vehicle number", value: businessForm.vehicleNumber },
        { label: "License number", value: businessForm.licenseNumber },
        { label: "Service area", value: businessForm.serviceArea },
      ];
    }
    return [
      { label: "Guide/Service name", value: businessForm.guideName },
      { label: "Years experience", value: businessForm.yearsExperience },
      { label: "Languages", value: businessForm.languages },
      {
        label: "Service categories",
        value: (businessForm.serviceCategories || []).join(", "),
      },
      { label: "Certifications", value: businessForm.certifications },
    ];
  }, [businessForm]);

  const hotelStats = useMemo(() => {
    const totalInventory = hotelRooms.reduce(
      (sum, room) => sum + Number(room.total_rooms || 0),
      0,
    );
    const currentlyAvailable = hotelRooms.reduce(
      (sum, room) =>
        sum + Number(room.room_count_available ?? room.total_rooms ?? 0),
      0,
    );
    const confirmedArrivals = hotelBookings.filter((booking) =>
      ["CONFIRMED", "LATE_ARRIVAL"].includes(booking.status),
    ).length;
    const checkedIn = hotelBookings.filter(
      (booking) => booking.status === "CHECKED_IN",
    ).length;
    const checkedOut = hotelBookings.filter(
      (booking) => booking.status === "CHECKED_OUT",
    ).length;

    return [
      {
        title: "Total Inventory",
        value: totalInventory,
        icon: BedDouble,
        accent: "blue",
      },
      {
        title: "Available Rooms",
        value: currentlyAvailable,
        icon: Building2,
        accent: "success",
      },
      {
        title: "Pending Arrivals",
        value: confirmedArrivals,
        icon: CalendarCheck2,
        accent: "gold",
      },
      { title: "Checked In", value: checkedIn, icon: Star, accent: "primary" },
      { title: "Checked Out", value: checkedOut, icon: Star, accent: "danger" },
    ];
  }, [hotelBookings, hotelRooms]);

  const handleSave = async () => {
    try {
      setError("");
      setSuccess("");
      setSaving(true);

      const businessProfile = buildBusinessProfilePayload(businessForm);
      await api.put("/business/profile", {
        display_name: displayName,
        business_profile: businessProfile,
      });

      setEditing(false);
      setSuccess("Business details updated successfully.");
      if (businessForm.businessType === "HOTEL") {
        await loadHotelOperations();
      }
    } catch (err) {
      const backendMessage = err?.response?.data?.message;
      setError(backendMessage || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    try {
      setError("");
      const profile = await fetchProfile();
      if (profile?.business_profile?.business_type === "HOTEL") {
        await loadHotelOperations();
      }
      setEditing(false);
    } catch (err) {
      const backendMessage = err?.response?.data?.message;
      setError(backendMessage || "Failed to reset profile.");
    }
  };

  const handleBookingStatusUpdate = async (booking, status) => {
    const actionId = `${booking.itinerary_id}:${booking.id}:${status}`;
    try {
      setError("");
      setSuccess("");
      setBookingActionLoadingId(actionId);
      const res = await api.patch(
        `/business/hotel/bookings/${booking.itinerary_id}/${booking.id}/status`,
        { status },
      );
      const updated = res?.data?.data;
      setHotelBookings((prev) =>
        prev.map((row) =>
          row.id === booking.id && row.itinerary_id === booking.itinerary_id
            ? updated
            : row,
        ),
      );
      setSuccess(`Booking marked as ${status}.`);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to update booking status.",
      );
    } finally {
      setBookingActionLoadingId("");
    }
  };

  const toggleServiceCategory = (service) => {
    const next = businessForm.serviceCategories.includes(service)
      ? businessForm.serviceCategories.filter((item) => item !== service)
      : [...businessForm.serviceCategories, service];
    updateBusinessField("serviceCategories", next);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 bg-surface-sunken rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="h-56 bg-surface-sunken rounded-xl animate-pulse"
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
          <h1 className="text-display-md text-ink">Business Dashboard</h1>
          <p className="text-body-sm text-text-secondary mt-1">
            View your profile in cards and edit only when needed.
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
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-surface-sunken">
                  <Building2
                    className="h-4 w-4 text-text-muted"
                    strokeWidth={1.75}
                  />
                </div>
                <h3 className="text-label-lg text-ink">Basic Information</h3>
              </div>
              <div className="space-y-3">
                {summaryRows.map((row) => (
                  <ProfileRow
                    key={row.label}
                    label={row.label}
                    value={row.value}
                  />
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-label-lg text-ink mb-4">Business Details</h3>
              <div className="space-y-3">
                {detailsRows.map((row) => (
                  <ProfileRow
                    key={row.label}
                    label={row.label}
                    value={row.value}
                  />
                ))}
                <ProfileRow
                  label="Description"
                  value={businessForm.description}
                />
                {businessForm.businessType === "TOURIST_GUIDE_SERVICE" && (
                  <ProfileRow
                    label="Personal bio"
                    value={businessForm.personalBio}
                  />
                )}
              </div>
            </Card>
          </div>

          {isHotelBusiness && (
            <>
              {hotelOpsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, idx) => (
                    <div
                      key={idx}
                      className="h-24 bg-surface-sunken rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                  {hotelStats.map((stat, idx) => (
                    <StatCard
                      key={stat.title}
                      title={stat.title}
                      value={stat.value}
                      icon={stat.icon}
                      accent={stat.accent}
                      index={idx}
                    />
                  ))}
                </div>
              )}

              <Card>
                {(businessForm.hotelImages || []).length > 0 ? (
                  <div>
                    <h3 className="text-label-lg text-ink mb-3">
                      Hotel Gallery
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {(businessForm.hotelImages || []).map((url) => (
                        <img
                          key={url}
                          src={url}
                          alt="Hotel"
                          className="h-28 w-full object-cover rounded-lg border border-border"
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] text-text-secondary">
                    No hotel photos uploaded yet. Use edit mode to upload your
                    gallery.
                  </p>
                )}
              </Card>

              <Card>
                <HotelBookingsTable
                  title="Hotel Bookings"
                  mode="business"
                  bookings={hotelBookings}
                  onCheckIn={(row) =>
                    handleBookingStatusUpdate(row, "CHECKED_IN")
                  }
                  onCheckOut={(row) =>
                    handleBookingStatusUpdate(row, "CHECKED_OUT")
                  }
                  actionLoadingId={bookingActionLoadingId}
                  emptyMessage="No bookings available for this hotel."
                />
              </Card>
            </>
          )}

          {isRestaurantBusiness && (
            <Card>
              {(businessForm.restaurantImages || []).length > 0 ? (
                <div>
                  <h3 className="text-label-lg text-ink mb-3">
                    Restaurant Gallery
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {(businessForm.restaurantImages || []).map((url) => (
                      <img
                        key={url}
                        src={url}
                        alt="Restaurant"
                        className="h-28 w-full object-cover rounded-lg border border-border"
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-text-secondary">
                  No restaurant photos uploaded yet. Use edit mode to upload
                  your gallery.
                </p>
              )}
            </Card>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          <BusinessEditableCard title="Basic Information" icon={Building2}>
            <Input
              label="Profile name"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Select
              label="Business type"
              value={businessForm.businessType}
              onChange={(e) =>
                updateBusinessField("businessType", e.target.value)
              }
            >
              {BUSINESS_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
            <Input
              label="Business name"
              type="text"
              value={businessForm.businessName}
              onChange={(e) =>
                updateBusinessField("businessName", e.target.value)
              }
              required
            />
            <Input
              label="Phone"
              type="text"
              value={businessForm.phone}
              onChange={(e) => updateBusinessField("phone", e.target.value)}
              required
            />
            <Input
              label="City"
              type="text"
              value={businessForm.city}
              onChange={(e) => updateBusinessField("city", e.target.value)}
              required
            />
            <Input
              label="Address"
              type="text"
              value={businessForm.address}
              onChange={(e) => updateBusinessField("address", e.target.value)}
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
                value={businessForm.description}
                onChange={(e) =>
                  updateBusinessField("description", e.target.value)
                }
                placeholder="Tell travelers about your business."
              />
            </div>
          </BusinessEditableCard>

          <BusinessEditableCard title="Business Details" icon={Star}>
            {businessForm.businessType === "HOTEL" && (
              <>
                <Input
                  label="Total rooms"
                  type="number"
                  min="1"
                  value={businessForm.totalRooms}
                  onChange={(e) =>
                    updateBusinessField("totalRooms", e.target.value)
                  }
                  required
                />
                <Input
                  label="Amenities (comma separated)"
                  type="text"
                  value={businessForm.amenities}
                  onChange={(e) =>
                    updateBusinessField("amenities", e.target.value)
                  }
                  placeholder="Pool, Wifi, Parking"
                />
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <ImageIcon className="h-4 w-4 text-text-muted" />
                    <p className="text-[13px] font-medium text-ink">
                      Hotel Gallery
                    </p>
                  </div>
                  <ImageUploadInput
                    label="Hotel Images"
                    images={businessForm.hotelImages || []}
                    onChange={(images) =>
                      updateBusinessField("hotelImages", images)
                    }
                    uploadPath="/business/hotel/upload-image"
                    folder={
                      userUid
                        ? `tripallied/business/${userUid}/hotel`
                        : "tripallied/business/hotel"
                    }
                    maxFiles={20}
                  />
                </div>
              </>
            )}

            {businessForm.businessType === "RESTAURANT" && (
              <>
                <Input
                  label="Cuisine"
                  type="text"
                  value={businessForm.cuisine}
                  onChange={(e) =>
                    updateBusinessField("cuisine", e.target.value)
                  }
                  required
                />
                <Input
                  label="Opening hours"
                  type="text"
                  value={businessForm.openingHours}
                  onChange={(e) =>
                    updateBusinessField("openingHours", e.target.value)
                  }
                  required
                />
                <Input
                  label="Seating capacity"
                  type="number"
                  min="1"
                  value={businessForm.seatingCapacity}
                  onChange={(e) =>
                    updateBusinessField("seatingCapacity", e.target.value)
                  }
                  required
                />
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <ImageIcon className="h-4 w-4 text-text-muted" />
                    <p className="text-[13px] font-medium text-ink">
                      Restaurant Gallery
                    </p>
                  </div>
                  <ImageUploadInput
                    label="Restaurant Images"
                    images={businessForm.restaurantImages || []}
                    onChange={(images) =>
                      updateBusinessField("restaurantImages", images)
                    }
                    uploadPath="/business/restaurant/upload-image"
                    folder={
                      userUid
                        ? `tripallied/business/${userUid}/restaurant`
                        : "tripallied/business/restaurant"
                    }
                    maxFiles={20}
                  />
                </div>
              </>
            )}

            {businessForm.businessType === "CAB_DRIVER" && (
              <>
                <Input
                  label="Driver name"
                  type="text"
                  value={businessForm.driverName}
                  onChange={(e) =>
                    updateBusinessField("driverName", e.target.value)
                  }
                  required
                />
                <Input
                  label="Vehicle type"
                  type="text"
                  value={businessForm.vehicleType}
                  onChange={(e) =>
                    updateBusinessField("vehicleType", e.target.value)
                  }
                  required
                />
                <Input
                  label="Vehicle number"
                  type="text"
                  value={businessForm.vehicleNumber}
                  onChange={(e) =>
                    updateBusinessField("vehicleNumber", e.target.value)
                  }
                  required
                />
                <Input
                  label="License number"
                  type="text"
                  value={businessForm.licenseNumber}
                  onChange={(e) =>
                    updateBusinessField("licenseNumber", e.target.value)
                  }
                  required
                />
                <Input
                  label="Service area"
                  type="text"
                  value={businessForm.serviceArea}
                  onChange={(e) =>
                    updateBusinessField("serviceArea", e.target.value)
                  }
                  required
                />
              </>
            )}

            {businessForm.businessType === "TOURIST_GUIDE_SERVICE" && (
              <>
                <Input
                  label="Guide/Service name"
                  type="text"
                  value={businessForm.guideName}
                  onChange={(e) =>
                    updateBusinessField("guideName", e.target.value)
                  }
                  required
                />
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-medium text-ink">
                    Personal bio
                  </label>
                  <textarea
                    className="
                      block w-full min-h-24 px-3 py-2
                      bg-white border border-border
                      rounded-lg text-[14px] text-ink placeholder-text-placeholder
                      outline-none transition-all duration-150
                      focus:border-accent focus:ring-2 focus:ring-accent/20
                    "
                    value={businessForm.personalBio}
                    onChange={(e) =>
                      updateBusinessField("personalBio", e.target.value)
                    }
                    placeholder="Experience, specialties, background."
                  />
                </div>
                <Input
                  label="Years of experience"
                  type="number"
                  min="0"
                  value={businessForm.yearsExperience}
                  onChange={(e) =>
                    updateBusinessField("yearsExperience", e.target.value)
                  }
                  required
                />
                <Input
                  label="Languages (comma separated)"
                  type="text"
                  value={businessForm.languages}
                  onChange={(e) =>
                    updateBusinessField("languages", e.target.value)
                  }
                />
                <div className="space-y-2">
                  <label className="block text-[13px] font-medium text-ink">
                    Services offered
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {GUIDE_SERVICE_OPTIONS.map((service) => (
                      <label
                        key={service}
                        className="flex items-center gap-2 text-[13px] text-text-secondary"
                      >
                        <input
                          type="checkbox"
                          checked={businessForm.serviceCategories.includes(
                            service,
                          )}
                          onChange={() => toggleServiceCategory(service)}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                        />
                        {service}
                      </label>
                    ))}
                  </div>
                </div>
                <Input
                  label="Certifications (optional)"
                  type="text"
                  value={businessForm.certifications}
                  onChange={(e) =>
                    updateBusinessField("certifications", e.target.value)
                  }
                />
              </>
            )}
          </BusinessEditableCard>
        </motion.div>
      )}
    </motion.div>
  );
}
