import { MapPin, Search, UtensilsCrossed } from 'lucide-react';
import Button from '../ui/Button';

export default function RestaurantFiltersBar({ value, onChange, onSubmit, loading }) {
    const update = (field, val) => {
        onChange((prev) => ({ ...prev, [field]: val }));
    };

    return (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-2 flex flex-col lg:flex-row gap-2">
            <div className="flex-1 min-w-[300px] flex items-center gap-3 px-4 h-12 rounded-xl bg-surface-sunken">
                <MapPin className="h-5 w-5 text-text-muted shrink-0" />
                <div className="flex-1 h-full flex flex-col justify-center">
                    <label className="text-[11px] font-medium text-text-secondary uppercase tracking-wider mb-0.5">
                        Location
                    </label>
                    <input
                        type="text"
                        className="w-full bg-transparent text-[14px] text-ink font-medium outline-none placeholder-text-muted"
                        placeholder="City, area, or landmark"
                        value={value.destination}
                        onChange={(e) => update('destination', e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSubmit(e)}
                    />
                </div>
            </div>

            <div className="flex-1 lg:max-w-[250px] flex items-center gap-3 px-4 h-12 rounded-xl bg-surface-sunken">
                <UtensilsCrossed className="h-5 w-5 text-text-muted shrink-0" />
                <div className="flex-1 h-full flex flex-col justify-center">
                    <label className="text-[11px] font-medium text-text-secondary uppercase tracking-wider mb-0.5">
                        Cuisine
                    </label>
                    <input
                        type="text"
                        className="w-full bg-transparent text-[14px] text-ink font-medium outline-none placeholder-text-muted"
                        placeholder="e.g. Italian, North Indian"
                        value={value.cuisine}
                        onChange={(e) => update('cuisine', e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSubmit(e)}
                    />
                </div>
            </div>

            <Button
                className="h-12 lg:w-[140px] rounded-xl flex items-center justify-center gap-2"
                onClick={onSubmit}
                loading={loading}
            >
                <Search className="h-4 w-4" />
                Search
            </Button>
        </div>
    );
}
