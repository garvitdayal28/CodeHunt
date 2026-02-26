import { useEffect, useMemo, useState } from "react";

import api from "../../api/axios";
import DataTable from "../../components/ui/DataTable";
import StatusBadge from "../../components/ui/StatusBadge";

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function formatCurrency(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return "-";
  return `INR ${parsed.toLocaleString()}`;
}

export default function GuideBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadBookings = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/business/guide/bookings");
        setBookings(res?.data?.data || []);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load guide bookings.");
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, []);

  const columns = useMemo(
    () => [
      {
        key: "traveler_name",
        header: "Traveler",
        render: (value) => value || "-",
      },
      {
        key: "tour_name",
        header: "Service",
        render: (value, row) => (
          <div>
            <p className="text-[13px] text-ink font-medium">{value || "-"}</p>
            <p className="text-[12px] text-text-secondary">
              {row.service_type || "GUIDE_SERVICE"}
            </p>
          </div>
        ),
      },
      {
        key: "itinerary_destination",
        header: "Destination",
        render: (value) => value || "-",
      },
      {
        key: "scheduled_time",
        header: "Schedule",
        render: (value) => formatDateTime(value),
      },
      {
        key: "participants",
        header: "People",
        render: (value) => Number(value || 1),
      },
      {
        key: "total_price",
        header: "Amount",
        render: (value) => formatCurrency(value),
      },
      {
        key: "status",
        header: "Status",
        render: (value) => <StatusBadge status={value} />,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-md text-ink">Service Bookings</h1>
        <p className="text-body-sm text-text-secondary mt-1">
          View all bookings made for your guide/activity services.
        </p>
      </div>

      {error && (
        <div className="bg-danger-soft border border-danger/20 rounded-lg p-3">
          <p className="text-[13px] text-danger">{error}</p>
        </div>
      )}

      <DataTable
        columns={columns}
        data={bookings}
        loading={loading}
        emptyMessage="No guide service bookings yet."
      />
    </div>
  );
}
