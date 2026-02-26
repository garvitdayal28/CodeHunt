import Input, { Select } from '../ui/Input';
import { BUSINESS_TYPES, GUIDE_SERVICE_OPTIONS } from '../../constants/business';

export default function BusinessProfileFormFields({ form, onChange, disabled = false }) {
  const handleCheckboxToggle = (service) => {
    const next = form.serviceCategories.includes(service)
      ? form.serviceCategories.filter((item) => item !== service)
      : [...form.serviceCategories, service];
    onChange('serviceCategories', next);
  };

  return (
    <div className="space-y-4">
      <Select
        label="Business type"
        value={form.businessType}
        onChange={(e) => onChange('businessType', e.target.value)}
        disabled={disabled}
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
        required
        value={form.businessName}
        onChange={(e) => onChange('businessName', e.target.value)}
        disabled={disabled}
      />
      <Input
        label="Phone"
        type="text"
        required
        value={form.phone}
        onChange={(e) => onChange('phone', e.target.value)}
        disabled={disabled}
      />
      <Input
        label="City"
        type="text"
        required
        value={form.city}
        onChange={(e) => onChange('city', e.target.value)}
        disabled={disabled}
      />
      <Input
        label="Address"
        type="text"
        required={form.businessType === 'HOTEL' || form.businessType === 'RESTAURANT'}
        value={form.address}
        onChange={(e) => onChange('address', e.target.value)}
        disabled={disabled}
      />

      <div className="space-y-1.5">
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
          placeholder="Tell travelers about your business."
          disabled={disabled}
        />
      </div>

      {form.businessType === 'HOTEL' && (
        <>
          <Input
            label="Total rooms"
            type="number"
            min="1"
            required
            value={form.totalRooms}
            onChange={(e) => onChange('totalRooms', e.target.value)}
            disabled={disabled}
          />
          <Input
            label="Amenities (comma separated)"
            type="text"
            value={form.amenities}
            onChange={(e) => onChange('amenities', e.target.value)}
            placeholder="Pool, Wifi, Parking"
            disabled={disabled}
          />
        </>
      )}

      {form.businessType === 'RESTAURANT' && (
        <>
          <Input
            label="Cuisine"
            type="text"
            required
            value={form.cuisine}
            onChange={(e) => onChange('cuisine', e.target.value)}
            placeholder="Indian, Continental"
            disabled={disabled}
          />
          <Input
            label="Opening hours"
            type="text"
            required
            value={form.openingHours}
            onChange={(e) => onChange('openingHours', e.target.value)}
            placeholder="09:00 AM - 11:00 PM"
            disabled={disabled}
          />
          <Input
            label="Seating capacity"
            type="number"
            min="1"
            required
            value={form.seatingCapacity}
            onChange={(e) => onChange('seatingCapacity', e.target.value)}
            disabled={disabled}
          />
        </>
      )}

      {form.businessType === 'CAB_DRIVER' && (
        <>
          <Input
            label="Driver name"
            type="text"
            required
            value={form.driverName}
            onChange={(e) => onChange('driverName', e.target.value)}
            disabled={disabled}
          />
          <Input
            label="Vehicle type"
            type="text"
            required
            value={form.vehicleType}
            onChange={(e) => onChange('vehicleType', e.target.value)}
            placeholder="Sedan, SUV, Hatchback"
            disabled={disabled}
          />
          <Input
            label="Vehicle number"
            type="text"
            required
            value={form.vehicleNumber}
            onChange={(e) => onChange('vehicleNumber', e.target.value)}
            disabled={disabled}
          />
          <Input
            label="License number"
            type="text"
            required
            value={form.licenseNumber}
            onChange={(e) => onChange('licenseNumber', e.target.value)}
            disabled={disabled}
          />
          <Input
            label="Service area"
            type="text"
            required
            value={form.serviceArea}
            onChange={(e) => onChange('serviceArea', e.target.value)}
            placeholder="Goa, North Goa, South Goa"
            disabled={disabled}
          />
        </>
      )}

      {form.businessType === 'TOURIST_GUIDE_SERVICE' && (
        <>
          <Input
            label="Guide/Service name"
            type="text"
            required
            value={form.guideName}
            onChange={(e) => onChange('guideName', e.target.value)}
            disabled={disabled}
          />
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-ink">Personal info / bio</label>
            <textarea
              className="
                block w-full min-h-24 px-3 py-2
                bg-white border border-border
                rounded-lg text-[14px] text-ink placeholder-text-placeholder
                outline-none transition-all duration-150
                focus:border-accent focus:ring-2 focus:ring-accent/20
              "
              value={form.personalBio}
              onChange={(e) => onChange('personalBio', e.target.value)}
              placeholder="Experience, specialties, background."
              disabled={disabled}
            />
          </div>
          <Input
            label="Years of experience"
            type="number"
            min="0"
            required
            value={form.yearsExperience}
            onChange={(e) => onChange('yearsExperience', e.target.value)}
            disabled={disabled}
          />
          <Input
            label="Languages (comma separated)"
            type="text"
            value={form.languages}
            onChange={(e) => onChange('languages', e.target.value)}
            placeholder="English, Hindi"
            disabled={disabled}
          />

          <div className="space-y-2">
            <label className="block text-[13px] font-medium text-ink">Services offered</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {GUIDE_SERVICE_OPTIONS.map((service) => (
                <label key={service} className="flex items-center gap-2 text-[13px] text-text-secondary">
                  <input
                    type="checkbox"
                    checked={form.serviceCategories.includes(service)}
                    onChange={() => handleCheckboxToggle(service)}
                    disabled={disabled}
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
            value={form.certifications}
            onChange={(e) => onChange('certifications', e.target.value)}
            placeholder="PADI, First Aid, Trek Leader, etc."
            disabled={disabled}
          />
        </>
      )}
    </div>
  );
}
