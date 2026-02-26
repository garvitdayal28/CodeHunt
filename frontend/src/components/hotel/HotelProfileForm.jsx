import Input from '../ui/Input';

export default function HotelProfileForm({ form, onChange }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input
        label="Hotel name"
        type="text"
        value={form.name}
        onChange={(e) => onChange('name', e.target.value)}
        required
      />
      <Input
        label="Location"
        type="text"
        value={form.location}
        onChange={(e) => onChange('location', e.target.value)}
        required
      />
      <Input
        label="Address"
        type="text"
        value={form.address}
        onChange={(e) => onChange('address', e.target.value)}
      />
      <Input
        label="Price per night"
        type="number"
        min="0"
        value={form.price_per_night}
        onChange={(e) => onChange('price_per_night', e.target.value)}
      />
      <Input
        label="Rating"
        type="number"
        min="0"
        max="5"
        step="0.1"
        value={form.rating}
        onChange={(e) => onChange('rating', e.target.value)}
      />
      <Input
        label="Total rooms"
        type="number"
        min="1"
        value={form.total_rooms}
        onChange={(e) => onChange('total_rooms', e.target.value)}
      />
      <Input
        label="Amenities (comma separated)"
        type="text"
        className="md:col-span-2"
        value={form.amenities}
        onChange={(e) => onChange('amenities', e.target.value)}
      />

      <div className="space-y-1.5 md:col-span-2">
        <label className="block text-[13px] font-medium text-ink">Description</label>
        <textarea
          className="
            block w-full min-h-24 px-3 py-2
            bg-white border border-border
            rounded-lg text-[14px] text-ink placeholder-text-placeholder
            outline-none transition-all duration-150
            focus:border-accent focus:ring-2 focus:ring-accent/20
          "
          value={form.description}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Describe your property and what makes it special."
        />
      </div>
    </div>
  );
}
