import React, { useState } from "react"; 
import { Restaurant } from "@/types";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Heart, MapPin, Star, DollarSign, Eye, Plus, Trash2, Image as ImageIcon, Sparkles } from "lucide-react"; // Import Sparkles
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

// Hàm lấy màu dựa trên điểm số (Giả sử score thang 0-100)
const getScoreStyle = (score: number) => {
  if (score >= 80) return "bg-emerald-600 text-white shadow-emerald-200"; // Rất phù hợp
  if (score >= 50) return "bg-yellow-500 text-white shadow-yellow-200";   // Khá
  return "bg-gray-500 text-white shadow-gray-200";                         // Trung bình/Thấp
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
  
  // Lấy điểm số từ API (Backend trả về field 'match_score')
  // Nếu chưa có field này trong type, bạn cần thêm vào interface Restaurant (ví dụ: match_score?: number)
  const score = restaurant.match_score ? Math.round(restaurant.match_score) : 0;

  return (
    <Card 
      className="group overflow-hidden hover:shadow-hover transition-all duration-300 
      flex flex-row md:flex-col h-auto bg-white border-muted/60"
    >
      {/* 1. KHUNG CHỨA ẢNH (Image Container) */}
      <div className="relative w-[110px] h-[110px] md:w-full md:h-48 bg-muted/30 shrink-0 overflow-hidden">
        
        {/* --- [NEW] MATCH SCORE BADGE --- 
            Vị trí: Góc trái trên.
            Hiển thị: Nếu có điểm > 0.
        */}
        {score > 0 && (
          <div className={`
            absolute top-0 left-0 z-30 px-2 py-1 md:px-3 md:py-1.5 
            rounded-br-xl md:rounded-br-2xl font-bold text-[10px] md:text-xs flex items-center gap-1 shadow-sm
            ${getScoreStyle(score)}
          `}>
             <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5" />
             <span>{score}% Phù hợp</span>
          </div>
        )}

        {/* --- KHỐI ZOOM --- */}
        <div className="relative w-full h-full rounded-none overflow-hidden transition-transform duration-700 group-hover:scale-105">
            
            {/* Skeleton & Image */}
            <div className={`absolute inset-0 flex items-center justify-center bg-gray-100 z-10 ${!imageLoaded ? "animate-pulse" : "hidden"}`}>
              <ImageIcon className="h-6 w-6 md:h-8 md:w-8 text-gray-300" />
            </div>

            {optimizedSrc && !imageError ? (
              <img
                src={optimizedSrc}
                alt={restaurant.name}
                className={`w-full h-full object-cover transition-opacity duration-500 
                ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                loading="lazy"
                decoding="async"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <MapPin className="h-8 w-8 md:h-12 md:w-12 text-gray-300" />
              </div>
            )}
        </div>

        {/* --- [MODIFIED] NÚT TIM (HEART BUTTON) --- 
            Thay đổi UX: Di chuyển nút tim Mobile sang bên PHẢI (Right) 
            để không bị đè lên Badge điểm số ở bên Trái.
        */}
        {onToggleFavorite && (
          <>
            {/* Mobile Heart: Top-Right */}
            <Button
              size="icon"
              variant="ghost"
              className="md:hidden absolute top-1 right-1 z-20 h-7 w-7 rounded-full 
                         bg-white/80 backdrop-blur-sm hover:bg-white text-foreground shadow-sm p-0"
              onClick={handleFavoriteClick}
            >
              <Heart className={`h-4 w-4 ${restaurant.is_favorite ? "fill-red-500 text-red-500" : "text-gray-600"}`} />
            </Button>

            {/* Desktop Heart: Top-Right (Giữ nguyên) */}
            <Button
              size="icon"
              variant="ghost"
              className="hidden md:flex absolute top-2 right-2 z-20 h-9 w-9 rounded-full 
                         bg-white/90 hover:bg-white text-foreground shadow-sm transition-transform hover:scale-110"
              onClick={handleFavoriteClick}
            >
              <Heart className={`h-5 w-5 ${restaurant.is_favorite ? "fill-red-500 text-red-500" : "text-gray-600"}`} />
            </Button>
          </>
        )}
      </div>

      {/* 2. PHẦN THÔNG TIN (Content Section) */}
      <div className="flex-1 p-3 md:p-4 flex flex-col justify-between min-w-0"> 
        <div className="space-y-1.5 md:space-y-2">
          
          {/* Tên quán */}
          <h3 className="font-bold text-sm md:text-lg truncate leading-tight text-gray-900" title={restaurant.name}>
              {restaurant.name}
          </h3>

          {/* Địa chỉ */}
          <div className="flex items-center gap-1.5 text-xs md:text-sm text-gray-500">
            <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0 text-gray-400" />
            <span className="truncate">{restaurant.address}</span>
          </div>

          {/* Rating & Price */}
          <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm pt-1">
            {restaurant.rating && (
              <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-100 font-medium">
                <Star className="h-3 w-3 md:h-3.5 md:w-3.5 fill-yellow-500 text-yellow-500" />
                <span>{restaurant.rating}</span>
              </div>
            )}
            
            {/* Dấu chấm ngăn cách trên Desktop */}
            {restaurant.rating && restaurant.price_level && (
              <span className="text-gray-300 hidden md:inline">•</span>
            )}

            {restaurant.price_level && priceRangeMap[restaurant.price_level] && (
              <div className="flex items-center gap-1 text-gray-600 font-medium">
                <div className="flex shrink-0">
                   {Array.from({ length: restaurant.price_level }).map((_, i) => (
                    <DollarSign key={i} className="h-3 w-3 md:h-3.5 md:w-3.5 text-emerald-600" />
                  ))}
                  {/* Hiển thị các dấu $ xám còn thiếu để người dùng dễ hình dung scale 4 */}
                   {Array.from({ length: 4 - restaurant.price_level }).map((_, i) => (
                    <DollarSign key={i} className="h-3 w-3 md:h-3.5 md:w-3.5 text-gray-300" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-3 justify-end md:justify-start items-center border-t md:border-t-0 pt-2 md:pt-0 border-gray-100">
          <Button
            variant={inCart ? "destructive" : "secondary"} 
            size="sm"
            className={`h-8 w-8 px-0 md:h-9 md:w-auto md:px-3 flex-shrink-0 shadow-sm transition-all 
              ${inCart ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            onClick={handleCartAction}
            title={inCart ? "Xóa khỏi danh sách" : "Thêm vào danh sách"}
          >
            {inCart ? <Trash2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 flex-1 md:h-9 text-xs md:text-sm hover:border-primary hover:text-primary transition-colors"
            onClick={handleViewDetails}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            Chi tiết
          </Button>
        </div>
      </div>  
    </Card>
  );
};

export default RestaurantCard;