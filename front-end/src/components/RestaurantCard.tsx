import { Restaurant } from "@/types";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Heart, MapPin, Star, DollarSign, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface RestaurantCardProps {
  restaurant: Restaurant;
  onToggleFavorite?: (restaurant: Restaurant) => void;
  onSelect?: (restaurant: Restaurant) => void;
  isSelected?: boolean;
}

// === THÊM MỚI ===
// Định nghĩa ánh xạ giá tiền ở đây
const priceRangeMap: { [key: number]: string } = {
  1: "1.000đ – 100.000đ",
  2: "100.000đ – 500.000đ",
  3: "500.000đ – 2.000.000đ",
  4: "2.000.000đ trở lên",
};
// ================

const RestaurantCard = ({
  restaurant,
  onToggleFavorite,
  onSelect,
  isSelected,
}: RestaurantCardProps) => {
  const navigate = useNavigate();

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(restaurant);
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/restaurant/${restaurant.id}`);
  };

  return (
    <Card
      className={`overflow-hidden hover:shadow-hover transition-all duration-300 cursor-pointer ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={() => onSelect?.(restaurant)}
    >
      <div className="relative h-48 bg-muted overflow-hidden">
        {/* ... (Phần ảnh và nút yêu thích giữ nguyên) ... */}
        {restaurant.photo_url ? (
          <img
            src={restaurant.photo_url}
            alt={restaurant.name}
            className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
            <MapPin className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
        {onToggleFavorite && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2 bg-white/90 hover:bg-white"
            onClick={handleFavoriteClick}
          >
            <Heart
              className={`h-5 w-5 ${
                restaurant.is_favorite 
                  ? "fill-red-500 text-red-500" 
                  : "text-foreground"
              }`}
            />
          </Button>
        )}
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-lg line-clamp-1">{restaurant.name}</h3>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="line-clamp-1">{restaurant.address}</span>
        </div>

        <div className="flex items-center gap-4 text-sm">
          {restaurant.rating && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
              <span className="font-medium">{restaurant.rating}</span>
            </div>
          )}
          
          {/* === BẮT ĐẦU THAY ĐỔI === */}
          {restaurant.price_level && priceRangeMap[restaurant.price_level] && (
            // Thêm 'gap-1' để có khoảng cách giữa các icon và văn bản
            <div className="flex items-center gap-1">
              {/* Giữ nguyên logic render các icon */}
              <div className="flex items-center">
                {Array.from({ length: restaurant.price_level }).map((_, i) => (
                  <DollarSign key={i} className="h-4 w-4 text-green-600" />
                ))}
              </div>
              {/* Thêm văn bản giá tiền */}
              <span className="text-xs text-muted-foreground ml-1">
                ({priceRangeMap[restaurant.price_level]})
              </span>
            </div>
          )}
          {/* === KẾT THÚC THAY ĐỔI === */}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full !mt-4"
          onClick={handleViewDetails}
        >
          <Eye className="mr-2 h-4 w-4" />
          Xem chi tiết
        </Button>
      </div>
    </Card>
  );
};

export default RestaurantCard;