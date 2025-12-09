import React, { useState } from "react"; 
import { Restaurant } from "@/types";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Heart, MapPin, Star, DollarSign, Eye, Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";

interface RestaurantCardProps {
  restaurant: Restaurant;
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

const getOptimizedImageUrl = (url: string) => {
  if (!url) return "";
  if (url.includes("googleusercontent.com")) {
    const baseUrl = url.split("=")[0]; 
    return `${baseUrl}=w400-h400-c`; 
  }
  return url;
};

const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  onToggleFavorite,
}) => {
  const navigate = useNavigate();
  const { isInCart, addToCart, removeFromCart } = useCart();
  const inCart = isInCart(restaurant.id);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleCartAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inCart) removeFromCart(restaurant.id)
    else addToCart(restaurant)
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

  const optimizedSrc = getOptimizedImageUrl(restaurant.photo_url || "");

  return (
    <Card 
      className="group overflow-hidden hover:shadow-hover transition-all duration-300 
      flex flex-row md:flex-col h-auto"
    >
      {/* 1. KHUNG CHỨA ẢNH (Image Container) */}
      <div className="relative w-[110px] h-[110px] md:w-full md:h-48 bg-muted/30 shrink-0 p-2 md:p-0 overflow-hidden">
        
        {/* --- KHỐI ZOOM (SCALING WRAPPER) ---
            - Mobile: Chứa ảnh + Nút Tim Mobile (để cùng zoom).
            - PC: Chỉ chứa ảnh.
        */}
        <div className="relative w-full h-full rounded-lg md:rounded-none overflow-hidden transition-transform duration-700 group-hover:scale-110">
            
            {/* Skeleton & Image */}
            <div className={`absolute inset-0 flex items-center justify-center bg-gray-200 z-10 ${!imageLoaded ? "animate-pulse" : "hidden"}`}>
              <ImageIcon className="h-6 w-6 md:h-8 md:w-8 text-gray-400" />
            </div>

            {optimizedSrc && !imageError ? (
              <img
                src={optimizedSrc}
                alt={restaurant.name}
                className={`w-full h-full object-cover transition-opacity duration-500 
                  ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                <MapPin className="h-8 w-8 md:h-16 md:w-16 text-muted-foreground/30" />
              </div>
            )}

            {/* --- [A] NÚT TIM MOBILE (CHỈ HIỆN TRÊN MOBILE) --- 
                - Vị trí: absolute top-1 left-1 (Góc trái trên của ảnh).
                - Nằm TRONG div scale-110 nên sẽ phóng to theo ảnh.
                - Style: Trắng mờ (bg-white/70 backdrop-blur).
            */}
            {onToggleFavorite && (
              <Button
                size="icon"
                variant="ghost"
                className="md:hidden absolute top-1 left-1 z-20 h-6 w-6 rounded-full 
                           bg-white/70 backdrop-blur-[2px] hover:bg-white text-foreground shadow-sm"
                onClick={handleFavoriteClick}
              >
                <Heart className={`h-3.5 w-3.5 ${restaurant.is_favorite ? "fill-red-500 text-red-500" : "text-foreground"}`} />
              </Button>
            )}
        </div>

        {/* --- [B] NÚT TIM PC (CHỈ HIỆN TRÊN PC) --- 
            - Vị trí: absolute top-2 right-2 (Góc phải trên như cũ).
            - Nằm NGOÀI div scale-110 nên đứng yên, độc lập với ảnh.
            - Style: Trắng rõ (bg-white/90).
        */}
        {onToggleFavorite && (
          <Button
            size="icon"
            variant="ghost"
            className="hidden md:flex absolute top-2 right-2 z-20 h-9 w-9 rounded-full 
                       bg-white/90 hover:bg-white text-foreground shadow-sm"
            onClick={handleFavoriteClick}
          >
            <Heart className={`h-5 w-5 ${restaurant.is_favorite ? "fill-red-500 text-red-500" : "text-foreground"}`} />
          </Button>
        )}
      </div>

      {/* 2. PHẦN THÔNG TIN (Content Section) */}
      <div className="flex-1 p-2 md:p-4 flex flex-col min-w-0"> 
        <div className="space-y-1 md:space-y-2">
          <h3 className="font-semibold text-sm md:text-lg truncate leading-tight text-foreground" title={restaurant.name}>
              {restaurant.name}
          </h3>

          <div className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground">
            <MapPin className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
            <span className="truncate">{restaurant.address}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm">
            {restaurant.rating && (
              <div className="flex items-center gap-1 bg-yellow-50 px-1.5 rounded-md border border-yellow-100 md:border-none md:bg-transparent md:p-0 shrink-0">
                <Star className="h-3 w-3 md:h-4 md:w-4 fill-yellow-500 text-yellow-500" />
                <span className="font-medium text-yellow-700">{restaurant.rating}</span>
              </div>
            )}
            
            {restaurant.price_level && priceRangeMap[restaurant.price_level] && (
              <div className="flex items-center gap-1 text-muted-foreground min-w-0">
                <div className="hidden md:flex shrink-0">
                   {Array.from({ length: restaurant.price_level }).map((_, i) => (
                    <DollarSign key={i} className="h-4 w-4 text-green-600" />
                  ))}
                </div>
                <span className="text-xs truncate block">
                  <span className="md:hidden text-muted-foreground/50 mr-1">•</span> 
                  {priceRangeMap[restaurant.price_level]}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-2 md:mt-4 justify-end md:justify-start items-center">
          <Button
            variant={inCart ? "destructive" : "secondary"} 
            size="sm"
            className="h-7 w-7 px-0 md:h-9 md:w-12 md:px-0 flex-shrink-0 shadow-sm"
            onClick={handleCartAction}
            title={inCart ? "Xóa khỏi danh sách" : "Thêm vào danh sách"}
          >
            {inCart ? <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" /> : <Plus className="h-4 w-4 md:h-5 md:w-5" />}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2 md:h-9 md:text-sm md:flex-1 hover:bg-gray/90 hover:text-green-600 truncate"
            onClick={handleViewDetails}
          >
            <Eye className="mr-1 h-3 w-3 md:h-4 md:w-4" />
            <span className="md:inline">Chi tiết</span>
          </Button>
        </div>
      </div>  
    </Card>
  );
};

export default RestaurantCard;