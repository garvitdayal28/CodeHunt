import { Filter, Search } from 'lucide-react';

import Button from '../ui/Button';
import Input, { Select } from '../ui/Input';

const SORT_OPTIONS = [
  { value: 'price_asc', label: 'Price: Low to high' },
  { value: 'price_desc', label: 'Price: High to low' },
  { value: 'rooms_desc', label: 'Availability: High to low' },
  { value: 'name_asc', label: 'Name: A to Z' },
  { value: 'name_desc', label: 'Name: Z to A' },
];

export default function HotelFiltersBar({ value, onChange, onSubmit, loading = false }) {
  const update = (field, fieldValue) => {
    onChange((prev) => ({ ...prev, [field]: fieldValue }));
  };

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border bg-white p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Input
          label="City"
          icon={Search}
          value={value.destination}
          onChange={(e) => update('destination', e.target.value)}
          placeholder="Jabalpur"
          required
        />
        <Input
          label="Check-in"
          type="date"
          value={value.checkin}
          onChange={(e) => update('checkin', e.target.value)}
          min={new Date().toISOString().split('T')[0]}
        />
        <Input
          label="Check-out"
          type="date"
          value={value.checkout}
          onChange={(e) => update('checkout', e.target.value)}
          min={value.checkin || new Date().toISOString().split('T')[0]}
        />
        <Select
          label="Sort by"
          value={value.sortBy}
          onChange={(e) => update('sortBy', e.target.value)}
        >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Input
          label="Rooms"
          type="number"
          min="1"
          value={value.rooms}
          onChange={(e) => update('rooms', e.target.value)}
        />
        <Input
          label="Adults"
          type="number"
          min="0"
          value={value.adults}
          onChange={(e) => update('adults', e.target.value)}
        />
        <Input
          label="Children"
          type="number"
          min="0"
          value={value.children}
          onChange={(e) => update('children', e.target.value)}
        />
        <Input
          label="Min price"
          type="number"
          min="0"
          value={value.priceMin}
          onChange={(e) => update('priceMin', e.target.value)}
          placeholder="1000"
        />
        <Input
          label="Max price"
          type="number"
          min="0"
          value={value.priceMax}
          onChange={(e) => update('priceMax', e.target.value)}
          placeholder="8000"
        />
        <div className="flex items-end">
          <Button type="submit" className="w-full" loading={loading} icon={Filter}>
            Apply Filters
          </Button>
        </div>
      </div>
    </form>
  );
}
