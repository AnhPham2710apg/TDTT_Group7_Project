import React from "react"; // 1. Import React
import { Restaurant } from "@/types";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Heart, MapPin, Star, DollarSign, Eye, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";

// 2. Định nghĩa Interface cho Props
interface RestaurantCardProps {
  restaurant: Restaurant;
  // Cập nhật type cho phép trả về Promise<void> hoặc void để linh hoạt
  onToggleFavorite?: (restaurant: Restaurant) => void | Promise<void>;
  onSelect?: (restaurant: Restaurant) => void;
  isSelected?: boolean;
}

const priceRangeMap: { [key: number]: string } = {
  1: "1.000đ – 100.000đ",
  2: "100.000đ – 500.000đ",
  3: "500.000đ – 2.000.000đ",
  4: "2.000.000đ trở lên",
};

const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  onToggleFavorite,
  // Bỏ onSelect và isSelected cũ đi vì ta dùng Context
}) => {
  const navigate = useNavigate();
  const { isInCart, addToCart, removeFromCart } = useCart(); // Dùng hook

  const inCart = isInCart(restaurant.id); // Kiểm tra trạng thái

  const handleCartAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inCart) {
      removeFromCart(restaurant.id);
    } else {
      addToCart(restaurant);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(restaurant);
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/restaurant/${restaurant.id}`);
  };

  return (
    <Card className="overflow-hidden hover:shadow-hover transition-all duration-300">
      <div className="relative h-48 bg-muted overflow-hidden">
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
        
        {/* Kiểm tra onToggleFavorite tồn tại mới hiện nút tim */}
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
          
          {restaurant.price_level && priceRangeMap[restaurant.price_level] && (
            <div className="flex items-center gap-1">
              <div className="flex items-center">
                {Array.from({ length: restaurant.price_level }).map((_, i) => (
                  <DollarSign key={i} className="h-4 w-4 text-green-600" />
                ))}
              </div>
              <span className="text-xs text-muted-foreground ml-1">
                ({priceRangeMap[restaurant.price_level]})
              </span>
            </div>
          )}
          {/* === PHẦN BUTTON ACTION MỚI === */}
        
        </div>
        <div className="flex gap-2 mt-4">
          {/* Nút Add/Remove Cart */}
          <Button
            variant={inCart ? "destructive" : "secondary"} // Đỏ nếu xóa, Xám nếu thêm
            size="sm"
            className="w-12 px-0 flex-shrink-0" // Nút vuông nhỏ
            onClick={handleCartAction}
            title={inCart ? "Xóa khỏi danh sách" : "Thêm vào danh sách"}
          >
            {inCart ? <Trash2 className="h-4 w-4" /> : <Plus className="h-5 w-5" />}
          </Button>

          {/* Nút Xem chi tiết */}
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleViewDetails}
          >
            <Eye className="mr-2 h-4 w-4" />
            Xem chi tiết
          </Button>
        </div>
      </div>  
    </Card>
  );
};

export default RestaurantCard;