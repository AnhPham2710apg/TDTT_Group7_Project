import React, { useState } from "react";
import { Restaurant } from "@/types";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Heart, MapPin, Star, DollarSign, Eye, Plus, Trash2, Image as ImageIcon, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useTranslation } from 'react-i18next';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onToggleFavorite?: (restaurant: Restaurant) => void | Promise<void>;
  onSelect?: (restaurant: Restaurant) => void;
  isSelected?: boolean;
}

const getScoreStyle = (score: number) => {
  if (score >= 70) return "bg-emerald-600 text-white shadow-emerald-200";
  if (score >= 50) return "bg-yellow-400 text-white shadow-yellow-200";
  return "bg-gray-500 text-white shadow-gray-200";
};

const getOptimizedImageUrl = (url: string) => {
  if (!url) return "";
  if (url.includes("googleusercontent.com")) {
    const baseUrl = url.split("=")[0];
    return `${baseUrl}=w400-h400-c`;
  }
  return url;
};

// Hàm rút gọn giá tiền cho Mobile (100.000 -> 100k)
const formatCompactPrice = (val: number) => {
    if (val >= 1000000) return `${val / 1000000}tr`;
    if (val >= 1000) return `${val / 1000}k`;
    return val;
};

const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  onToggleFavorite,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isInCart, addToCart, removeFromCart } = useCart();
  const inCart = isInCart(restaurant.id);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Logic lấy text giá tiền (Responsive)
  const getPriceLabel = (level: number | string, isMobile: boolean) => {
    const levelNum = parseInt(String(level), 10);
    
    // Mobile: Rút gọn tối đa (100k-500k)
    if (isMobile) {
        switch (levelNum) {
            case 1: return "1.000 - 100.000";
            case 2: return "100.000 - 500.000";
            case 3: return "500.000 - 2.000.000";
            case 4: return "2.000.000 trở lên";
            default: return "";
        }
    }

    // PC: Hiển thị đầy đủ
    switch (levelNum) {
        case 1: return "1.000đ – 100.000đ";
        case 2: return "100.000đ – 500.000đ";
        case 3: return "500.000đ – 2.000.000đ";
        case 4: return `2.000.000đ ${t('restaurant_detail.price_above', 'trở lên')}`;
        default: return "";
    }
  };

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
  const score = restaurant.match_score ? Math.round(restaurant.match_score) : 0;
  
  // Lấy text giá cho 2 trường hợp
  const priceTextMobile = restaurant.price_level ? getPriceLabel(restaurant.price_level, true) : "";
  const priceTextPC = restaurant.price_level ? getPriceLabel(restaurant.price_level, false) : "";

  return (
    <Card 
      className="group relative overflow-hidden hover:shadow-hover transition-all duration-300 
      flex flex-row md:flex-col 
      h-32 md:h-auto
      bg-white border-muted/60 rounded-xl"
    >
      {/* NÚT TIM MOBILE */}
      {onToggleFavorite && (
        <Button
          size="icon"
          variant="ghost"
          className="md:hidden absolute top-1 right-1 z-30 h-7 w-7 rounded-full bg-transparent hover:bg-gray-100 text-foreground p-0"
          onClick={handleFavoriteClick}
        >
          <Heart className={`h-4 w-4 ${restaurant.is_favorite ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
        </Button>
      )}

      {/* 1. KHUNG ẢNH */}
      <div className="relative shrink-0 overflow-hidden bg-muted/30 w-32 h-full md:w-full md:h-48">
        
        {/* MATCH SCORE */}
        {score > 0 && (
          <div className={`
            absolute top-0 left-0 z-30 px-2 py-1 md:px-3 md:py-1.5 
            rounded-br-xl md:rounded-br-2xl font-bold text-[10px] md:text-xs flex items-center gap-1 shadow-sm
            ${getScoreStyle(score)}
          `}>
             <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5" />
             <span>{score}%</span>
          </div>
        )}

        {/* NÚT TIM DESKTOP */}
        {onToggleFavorite && (
          <Button
            size="icon"
            variant="ghost"
            className="hidden md:flex absolute top-2 right-2 z-20 h-9 w-9 rounded-full bg-white/90 hover:bg-white text-foreground shadow-sm transition-transform hover:scale-110"
            onClick={handleFavoriteClick}
          >
            <Heart className={`h-5 w-5 ${restaurant.is_favorite ? "fill-red-500 text-red-500" : "text-gray-600"}`} />
          </Button>
        )}

        {/* IMAGE */}
        <div className="relative w-full h-full transition-transform duration-700 group-hover:scale-105">
           <div className={`absolute inset-0 flex items-center justify-center bg-gray-100 z-10 ${!imageLoaded ? "animate-pulse" : "hidden"}`}>
             <ImageIcon className="h-6 w-6 md:h-8 md:w-8 text-gray-300" />
           </div>
           {optimizedSrc && !imageError ? (
             <img
               src={optimizedSrc}
               alt={restaurant.name}
               className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
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
      </div>

      {/* 2. NỘI DUNG */}
      <div className="flex-1 p-2.5 md:p-4 flex flex-col justify-between min-w-0"> 
        <div className="space-y-1 md:space-y-2">
          
          {/* Tên quán */}
          <h3 className="font-bold text-sm md:text-lg text-gray-900 leading-tight pr-6 md:pr-0 line-clamp-1 md:line-clamp-1" title={restaurant.name}>
              {restaurant.name}
          </h3>
          

          {/* Địa chỉ */}
          <div className="flex items-center gap-1 text-xs md:text-sm text-gray-500">
            <MapPin className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0 text-gray-400" />
            <span className="truncate">{restaurant.address}</span>
          </div>

          {/* Rating & Price */}
          <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm pt-0.5 md:pt-1">
            {restaurant.rating && (
              <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded-full border border-yellow-100 font-medium">
                <Star className="h-3 w-3 md:h-3.5 md:w-3.5 fill-yellow-500 text-yellow-500" />
                <span>{restaurant.rating}</span>
              </div>
            )}
            
            {/* Dấu chấm ngăn cách (chỉ hiện trên PC hoặc khi có cả 2 thông tin) */}
            {restaurant.rating && restaurant.price_level && (
              <span className="text-gray-300 hidden md:inline">•</span>
            )}

            {restaurant.price_level && (
              <div className="flex items-center gap-1 text-gray-600 font-medium overflow-hidden">
                
                {/* --- PC VIEW: Giữ nguyên icon Dollar + Text chi tiết --- */}
                <div className="hidden md:flex items-center gap-1">
                    <div className="flex shrink-0">
                        {Array.from({ length: Number(restaurant.price_level) || 0 }).map((_, i) => (
                            <DollarSign key={i} className="h-3.5 w-3.5 text-emerald-600" />
                        ))}
                        {Array.from({ length: Math.max(0, 4 - (Number(restaurant.price_level) || 0)) }).map((_, i) => (
                            <DollarSign key={i} className="h-3.5 w-3.5 text-gray-300" />
                        ))}
                    </div>
                    {priceTextPC && (
                        <span className="text-xs text-gray-500 ml-1 truncate">| {priceTextPC}</span>
                    )}
                </div>

                {/* --- MOBILE VIEW: Chỉ hiện Text giá rút gọn --- */}
                <div className="flex md:hidden items-center gap-1 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-100">
                    <span className="text-[10px] font-semibold whitespace-nowrap">{priceTextMobile}</span>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-auto justify-end md:justify-start items-center pt-2 border-t md:border-t-0 border-gray-100 md:border-transparent">
          <Button
            variant={inCart ? "destructive" : "secondary"} 
            size="sm"
            className={`h-7 w-7 px-0 md:h-9 md:w-auto md:px-3 flex-shrink-0 shadow-sm transition-all
              ${inCart ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-500 text-white hover:bg-green-600"}`}
            onClick={handleCartAction}
          >
            {inCart ? <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" /> : <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-7 flex-1 md:h-9 text-xs md:text-sm hover:border-primary hover:text-primary hover:bg-gray/90 transition-colors"
            onClick={handleViewDetails}
          >
            <Eye className="mr-1.5 h-3 w-3 md:h-3.5 md:w-3.5" />
             {t('card.detail', 'Xem chi tiết')}
          </Button>
        </div>
      </div>  
    </Card>
  );
};

export default RestaurantCard;