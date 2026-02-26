import Input, { Select, Textarea } from '../ui/Input';
import ImageUploadInput from '../hotel/ImageUploadInput';

export const EMPTY_MENU_FORM = {
    name: '',
    description: '',
    price: '',
    is_veg: true,
    servings: '',
    category: '',
    images: [],
    is_available: true,
};

export default function MenuItemForm({ value, onChange, uploadFolder, uploadPath }) {
    const update = (field, fieldValue) => {
        onChange((prev) => ({ ...prev, [field]: fieldValue }));
    };

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                    label="Dish Name"
                    value={value.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="Paneer Tikka"
                    required
                />
                <Input
                    label="Price (INR)"
                    type="number"
                    min="0"
                    value={value.price}
                    onChange={(e) => update('price', e.target.value)}
                    placeholder="299"
                    required
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select
                    label="Type"
                    value={value.is_veg ? 'veg' : 'non-veg'}
                    onChange={(e) => update('is_veg', e.target.value === 'veg')}
                >
                    <option value="veg">Veg</option>
                    <option value="non-veg">Non-Veg</option>
                </Select>
                <Input
                    label="Servings"
                    value={value.servings}
                    onChange={(e) => update('servings', e.target.value)}
                    placeholder="Serves 2"
                />
                <Input
                    label="Category"
                    value={value.category}
                    onChange={(e) => update('category', e.target.value)}
                    placeholder="Starters, Main Course"
                />
            </div>

            <Textarea
                label="Description"
                value={value.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Rich and creamy paneer marinated in spices, grilled to perfection."
            />

            <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-[13px] text-text-secondary cursor-pointer">
                    <input
                        type="checkbox"
                        checked={value.is_available}
                        onChange={(e) => update('is_available', e.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                    />
                    Available on menu
                </label>
            </div>

            <ImageUploadInput
                label="Dish Images"
                images={value.images || []}
                onChange={(imgs) => update('images', imgs)}
                folder={uploadFolder}
                uploadPath={uploadPath}
                maxFiles={5}
            />
        </div>
    );
}
