import { Leaf, Drumstick, IndianRupee, Pencil, Trash2, Users } from 'lucide-react';

import Button from '../ui/Button';
import Card from '../ui/Card';

export default function MenuItemCard({ item, onEdit, onDelete }) {
    const image = item.cover_image || item.images?.[0];

    return (
        <Card className="space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                    <span
                        className={`mt-0.5 shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full ${item.is_veg ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                            }`}
                    >
                        {item.is_veg ? (
                            <Leaf className="h-3.5 w-3.5" />
                        ) : (
                            <Drumstick className="h-3.5 w-3.5" />
                        )}
                    </span>
                    <div>
                        <h3 className="text-label-lg text-ink">{item.name}</h3>
                        <p className="text-[13px] text-text-secondary mt-0.5">
                            {item.description || 'No description provided.'}
                        </p>
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-[16px] font-semibold text-ink flex items-center gap-0.5 justify-end">
                        <IndianRupee className="h-3.5 w-3.5" />
                        {Number(item.price || 0).toLocaleString()}
                    </p>
                </div>
            </div>

            {image && (
                <img
                    src={image}
                    alt={item.name}
                    className="h-36 w-full object-cover rounded-lg border border-border"
                />
            )}

            {item.images?.length > 1 && (
                <div className="grid grid-cols-4 gap-1.5">
                    {item.images.slice(1, 5).map((url) => (
                        <img
                            key={url}
                            src={url}
                            alt={item.name}
                            className="h-16 w-full object-cover rounded-md border border-border"
                        />
                    ))}
                </div>
            )}

            <div className="flex flex-wrap gap-2 text-[12px]">
                {item.category && (
                    <span className="px-2 py-1 rounded-full bg-primary-soft text-primary">
                        {item.category}
                    </span>
                )}
                {item.servings && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-border text-text-secondary">
                        <Users className="h-3 w-3" />
                        {item.servings}
                    </span>
                )}
                <span
                    className={`px-2 py-1 rounded-full ${item.is_veg
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                >
                    {item.is_veg ? 'Veg' : 'Non-Veg'}
                </span>
                {item.is_available === false && (
                    <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Unavailable
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2 pt-1">
                <Button variant="secondary" icon={Pencil} onClick={() => onEdit(item)}>Edit</Button>
                <Button variant="danger" icon={Trash2} onClick={() => onDelete(item.id)}>Delete</Button>
            </div>
        </Card>
    );
}
