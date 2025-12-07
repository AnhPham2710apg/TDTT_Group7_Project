import React, { useState } from "react"; 
import { Restaurant } from "@/types";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
// Thêm icon Image để làm Skeleton
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

// --- 1. HÀM TỐI ƯU URL ẢNH ---
// Hàm này giúp giảm dung lượng ảnh từ vài MB xuống vài chục KB
const getOptimizedImageUrl = (url: string) => {
  if (!url) return "";
  
  // Nếu là ảnh từ Google (thường gặp nhất trong Food Tour app)
  if (url.includes("googleusercontent.com")) {
    // Cắt bỏ các tham số cũ và ép về size chiều rộng 400px
    const baseUrl = url.split("=")[0]; 
    return `${baseUrl}=w400-h300-c`; // w=400, h=300, c=crop (cắt cho vừa khung)
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

  // --- 2. STATE QUẢN LÝ TRẠNG THÁI ẢNH ---
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleCartAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inCart)
      removeFromCart(restaurant.id)
    else
      addToCart(restaurant)
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

  // Lấy URL đã được tối ưu
  const optimizedSrc = getOptimizedImageUrl(restaurant.photo_url || "");
  // Reset lại state khi restaurant thay đổi (đề phòng trường hợp tái sử dụng component trong list ảo)
  // useEffect này không bắt buộc nhưng nên có để tránh bug khi scroll nhanh
  /* useEffect(() => {
     setImageLoaded(false);
     setImageError(false);
  }, [restaurant.photo_url]); 
  */

  return (
    <Card className="overflow-hidden hover:shadow-hover transition-all duration-300 group">
      {/* Phần chứa ảnh - Giữ nguyên chiều cao h-48 */}
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        
        {optimizedSrc && !imageError ? (
          <>
            {/* SKELETON: Giữ nguyên logic này là đúng */}
            <div 
              className={`absolute inset-0 flex items-center justify-center bg-gray-200 z-10
                ${!imageLoaded ? "animate-pulse" : "hidden"}`}
            >
              <ImageIcon className="h-8 w-8 text-gray-400" />
            </div>

            {/* ẢNH THẬT: Thêm referrerPolicy */}
            <img
              src={optimizedSrc}
              alt={restaurant.name}
              className={`w-full h-full object-cover transition-opacity duration-500 
                ${imageLoaded ? "opacity-100 group-hover:scale-110 transition-transform duration-700" : "opacity-0"}
              `}
              loading="lazy"
              decoding="async"
              
              // --- SỬA LỖI TẠI ĐÂY ---
              // 1. Thêm dòng này để bypass chặn ảnh của Google/Server lạ
              referrerPolicy="no-referrer" 
              
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                // 2. Log ra để debug nếu vẫn lỗi
                console.warn("Lỗi load ảnh:", optimizedSrc); 
                setImageError(true);
              }}
            />
          </>
        ) : (
          // Fallback
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
            <MapPin className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
        
        {/* Nút Tim (Giữ nguyên) */}
        {onToggleFavorite && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2 bg-white/90 hover:bg-white z-10"
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

      {/* Phần thông tin bên dưới (Giữ nguyên hoàn toàn) */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-lg line-clamp-1" title={restaurant.name}>
            {restaurant.name}
        </h3>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 flex-shrink-0" />
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
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            variant={inCart ? "destructive" : "secondary"} 
            size="sm"
            className="w-12 px-0 flex-shrink-0"
            onClick={handleCartAction}
            title={inCart ? "Xóa khỏi danh sách" : "Thêm vào danh sách"}
          >
            {inCart ? <Trash2 className="h-4 w-4" /> : <Plus className="h-5 w-5" />}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex-1 hover:bg-gray/90 hover:text-green-600"
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