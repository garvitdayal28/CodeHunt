import ImageUploadInput from '../hotel/ImageUploadInput';
import Input, { Select } from '../ui/Input';

export default function GuideServiceForm({ value, onChange, uploadFolder, uploadPath }) {
  const update = (field, fieldValue) => {
    onChange((prev) => ({ ...prev, [field]: fieldValue }));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Select
          label="Service Type"
          value={value.service_type}
          onChange={(e) => update('service_type', e.target.value)}
        >
          <option value="ACTIVITY">Activity</option>
          <option value="GUIDED_TOUR">Guided Tour</option>
        </Select>
        <Input
          label="Package Name"
          value={value.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="Old City Night Walk"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          label="Location"
          value={value.location}
          onChange={(e) => update('location', e.target.value)}
          placeholder="Jaipur, Rajasthan"
          required
        />
        <Input
          label="Duration (hours)"
          type="number"
          min="0.5"
          step="0.5"
          value={value.duration_hours}
          onChange={(e) => update('duration_hours', e.target.value)}
          placeholder="3"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Input
          label="Price (INR)"
          type="number"
          min="0"
          value={value.price}
          onChange={(e) => update('price', e.target.value)}
          placeholder="1499"
          required
        />
        <Select
          label="Price Unit"
          value={value.price_unit}
          onChange={(e) => update('price_unit', e.target.value)}
        >
          <option value="PER_PERSON">Per Person</option>
          <option value="PER_GROUP">Per Group</option>
        </Select>
        <Input
          label="Max Group Size"
          type="number"
          min="1"
          value={value.max_group_size}
          onChange={(e) => update('max_group_size', e.target.value)}
          placeholder="10"
        />
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium text-ink">Visibility</label>
          <label className="h-10 px-3 rounded-lg border border-border bg-white flex items-center gap-2 text-[13px] text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={value.is_active}
              onChange={(e) => update('is_active', e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
            />
            Active package
          </label>
        </div>
      </div>

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
          placeholder="Short overview of what travelers can expect."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input
          label="Categories (comma separated)"
          value={value.category}
          onChange={(e) => update('category', e.target.value)}
          placeholder="Adventure, Culture"
        />
        <Input
          label="Highlights (comma separated)"
          value={value.highlights}
          onChange={(e) => update('highlights', e.target.value)}
          placeholder="Sunrise point, Local snacks"
        />
        <Input
          label="Inclusions (comma separated)"
          value={value.inclusions}
          onChange={(e) => update('inclusions', e.target.value)}
          placeholder="Guide fees, Entry tickets"
        />
      </div>

      {value.service_type === 'ACTIVITY' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select
            label="Difficulty Level"
            value={value.difficulty_level}
            onChange={(e) => update('difficulty_level', e.target.value)}
          >
            <option value="EASY">Easy</option>
            <option value="MODERATE">Moderate</option>
            <option value="HARD">Hard</option>
          </Select>
          <Input
            label="Minimum Age"
            type="number"
            min="0"
            value={value.min_age}
            onChange={(e) => update('min_age', e.target.value)}
            placeholder="12"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Meeting Point"
            value={value.meeting_point}
            onChange={(e) => update('meeting_point', e.target.value)}
            placeholder="City Palace Main Gate"
          />
          <Input
            label="Languages (comma separated)"
            value={value.languages}
            onChange={(e) => update('languages', e.target.value)}
            placeholder="English, Hindi"
          />
        </div>
      )}

      <ImageUploadInput
        label="Service Images"
        images={value.images || []}
        onChange={(imgs) => update('images', imgs)}
        folder={uploadFolder}
        uploadPath={uploadPath}
        maxFiles={8}
      />
    </div>
  );
}
