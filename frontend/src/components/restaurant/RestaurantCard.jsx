import { MapPin, UtensilsCrossed, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Button from "../ui/Button";

export default function RestaurantCard({ restaurant, onViewMenu }) {
  const minPrice = restaurant.price_range?.min;
  const maxPrice = restaurant.price_range?.max;

  let priceText = "Prices unavailable";
  if (minPrice > 0 && maxPrice > 0) {
    if (minPrice === maxPrice) {
      priceText = `₹${minPrice.toLocaleString()}`;
    } else {
      priceText = `₹${minPrice.toLocaleString()} - ₹${maxPrice.toLocaleString()}`;
    }
  } else if (minPrice > 0) {
    priceText = `From ₹${minPrice.toLocaleString()}`;
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <div
        className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full cursor-pointer"
        onClick={() => onViewMenu(restaurant)}
      >
        {/* Image Container */}
        <div className="relative h-48 w-full bg-surface-sunken overflow-hidden">
          {restaurant.image_url ? (
            <img
              src={restaurant.image_url}
              alt={restaurant.name}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-text-placeholder">
              <UtensilsCrossed className="h-10 w-10" />
            </div>
          )}

          {restaurant.cuisine && (
            <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[12px] font-medium text-ink flex items-center gap-1.5 shadow-sm">
              <UtensilsCrossed className="h-3 w-3 text-primary" />
              <span className="truncate max-w-[120px]">
                {restaurant.cuisine}
              </span>
            </div>
          )}
        </div>

        {/* Content Container */}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="text-[17px] font-semibold text-ink line-clamp-1 group-hover:text-primary transition-colors">
            {restaurant.name}
          </h3>

          <div className="flex items-start gap-1.5 mt-2 text-text-secondary">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="text-[13px] line-clamp-2">
              {restaurant.address
                ? `${restaurant.address}, ${restaurant.location}`
                : restaurant.location}
            </span>
          </div>

          <div className="mt-4 pt-4 border-t border-border flex items-end justify-between mt-auto">
            <div>
              <p className="text-[12px] text-text-secondary mb-0.5">
                Approx. Cost
              </p>
              <p className="text-[15px] font-semibold text-ink">{priceText}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewMenu(restaurant);
              }}
              className="px-3 shrink-0"
            >
              View Menu <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
