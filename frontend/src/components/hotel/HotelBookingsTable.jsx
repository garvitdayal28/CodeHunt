import Button from '../ui/Button';
import DataTable from '../ui/DataTable';
import StatusBadge from '../ui/StatusBadge';

function formatCurrency(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return '-';
  return `INR ${parsed.toLocaleString()}`;
}

function formatDateRange(checkIn, checkOut) {
  if (!checkIn || !checkOut) return '-';
  return `${checkIn} to ${checkOut}`;
}

function renderActionColumn(row, onCheckIn, onCheckOut, actionLoadingId) {
  if (row.status === 'CONFIRMED' || row.status === 'LATE_ARRIVAL') {
    return (
      <Button
        size="sm"
        onClick={() => onCheckIn(row)}
        loading={actionLoadingId === `${row.itinerary_id}:${row.id}:CHECKED_IN`}
      >
        Check-in
      </Button>
    );
  }
  if (row.status === 'CHECKED_IN') {
    return (
      <Button
        size="sm"
        onClick={() => onCheckOut(row)}
        loading={actionLoadingId === `${row.itinerary_id}:${row.id}:CHECKED_OUT`}
      >
        Check-out
      </Button>
    );
  }
  return <span className="text-[12px] text-text-muted">-</span>;
}

export default function HotelBookingsTable({
  title,
  bookings = [],
  mode = 'traveler',
  emptyMessage = 'No hotel bookings found.',
  onCheckIn,
  onCheckOut,
  actionLoadingId = '',
}) {
  const columns = [
    { key: 'property_name', header: 'Hotel' },
    {
      key: 'room_type',
      header: 'Room',
      render: (_, row) => (
        <div>
          <p className="text-[13px] text-ink font-medium">{row.room_type || '-'}</p>
          <p className="text-[12px] text-text-secondary">{row.rooms_booked || 1} room(s)</p>
        </div>
      ),
    },
    {
      key: 'stay',
      header: 'Stay',
      render: (_, row) => formatDateRange(row.check_in_date, row.check_out_date),
    },
    {
      key: 'guests',
      header: 'Guests',
      render: (_, row) => `${row.adults ?? 0}A / ${row.children ?? 0}C`,
    },
    {
      key: 'total_price',
      header: 'Amount',
      render: (value, row) => formatCurrency(value ?? row.price_per_day),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => <StatusBadge status={value} />,
    },
  ];

  if (mode === 'business') {
    columns.unshift({
      key: 'traveler_name',
      header: 'Traveler',
      render: (value) => value || '-',
    });
    columns.push({
      key: 'actions',
      header: 'Action',
      render: (_, row) => renderActionColumn(row, onCheckIn, onCheckOut, actionLoadingId),
    });
  }

  return (
    <div className="space-y-3">
      {title && <h3 className="text-label-lg text-ink">{title}</h3>}
      <DataTable columns={columns} data={bookings} emptyMessage={emptyMessage} />
    </div>
  );
}
