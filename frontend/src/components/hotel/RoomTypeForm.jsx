import Input from '../ui/Input';
import ImageUploadInput from './ImageUploadInput';

export const EMPTY_ROOM_FORM = {
  name: '',
  description: '',
  price_per_day: '',
  total_rooms: '',
  room_count_available: '',
  beds: '',
  max_guests: '',
  area_sqft: '',
  amenities: '',
  images: [],
};

export default function RoomTypeForm({ value, onChange, uploadFolder, uploadPath }) {
  const update = (field, fieldValue) => {
    onChange((prev) => ({ ...prev, [field]: fieldValue }));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          label="Room Type Name"
          value={value.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="Deluxe King Room"
          required
        />
        <Input
          label="Price per day"
          type="number"
          min="0"
          value={value.price_per_day}
          onChange={(e) => update('price_per_day', e.target.value)}
          placeholder="2499"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          label="Total rooms of this type"
          type="number"
          min="1"
          value={value.total_rooms}
          onChange={(e) => update('total_rooms', e.target.value)}
          placeholder="12"
          required
        />
        <Input
          label="Available rooms now"
          type="number"
          min="0"
          value={value.room_count_available}
          onChange={(e) => update('room_count_available', e.target.value)}
          placeholder="10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input
          label="Beds"
          type="number"
          min="1"
          value={value.beds}
          onChange={(e) => update('beds', e.target.value)}
          placeholder="1"
          required
        />
        <Input
          label="Max Guests"
          type="number"
          min="1"
          value={value.max_guests}
          onChange={(e) => update('max_guests', e.target.value)}
          placeholder="2"
        />
        <Input
          label="Area (sqft)"
          type="number"
          min="1"
          value={value.area_sqft}
          onChange={(e) => update('area_sqft', e.target.value)}
          placeholder="280"
        />
      </div>

      <Input
        label="Amenities (comma separated)"
        value={value.amenities}
        onChange={(e) => update('amenities', e.target.value)}
        placeholder="AC, TV, Wifi, Balcony"
      />

      <div className="space-y-1.5">
        <label className="block text-[13px] font-medium text-ink">Description</label>
        <textarea
          className="
            block w-full min-h-24 px-3 py-2
            bg-white border border-border rounded-lg
            text-[14px] text-ink placeholder-text-placeholder
            outline-none transition-all duration-150
            focus:border-accent focus:ring-2 focus:ring-accent/20
          "
          value={value.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Spacious room with city view, work desk and lounge seating."
        />
      </div>

      <ImageUploadInput
        label="Room Images"
        images={value.images || []}
        onChange={(imgs) => update('images', imgs)}
        folder={uploadFolder}
        uploadPath={uploadPath}
        maxFiles={10}
      />
    </div>
  );
}
