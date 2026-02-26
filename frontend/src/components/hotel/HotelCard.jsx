import { MapPin, Users } from 'lucide-react';

import Button from '../ui/Button';
import Card from '../ui/Card';

function formatPrice(value) {
  if (value === null || value === undefined) return '-';
  return `INR ${Number(value).toLocaleString()}`;
}

export default function HotelCard({ hotel, onViewRooms }) {
  const image = hotel.image_url || hotel.image_urls?.[0];

  return (
    <Card className="p-0 overflow-hidden">
      <div className="h-44 bg-surface-sunken">
        {image ? (
          <img src={image} alt={hotel.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-[13px] text-text-muted">
            No image
          </div>
        )}
      </div>
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-label-lg text-ink">{hotel.name}</h3>
          <p className="text-[13px] text-text-secondary mt-1 inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {hotel.location || '-'}
          </p>
        </div>

        {(hotel.amenities || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {(hotel.amenities || []).slice(0, 4).map((amenity) => (
              <span key={amenity} className="text-[11px] px-2 py-0.5 rounded-md bg-surface-sunken text-text-secondary">
                {amenity}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-3">
          <div>
            <p className="text-[17px] font-semibold text-ink">
              {formatPrice(hotel.price_range?.min || hotel.price_per_night)}
            </p>
            <p className="text-[12px] text-text-secondary mt-0.5">
              per night
            </p>
          </div>
          <div className="text-right">
            <p className="text-[12px] text-text-secondary inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {hotel.total_available_rooms ?? 0} available
            </p>
            <Button size="sm" className="mt-2" onClick={() => onViewRooms(hotel)}>
              View Rooms
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
