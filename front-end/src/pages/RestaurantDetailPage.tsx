// src/pages/RestaurantDetailPage.tsx

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom"; // Thêm useNavigate
import Navbar from "@/components/Navbar";
import { useCart } from "@/context/CartContext"; // Import Context
import { Restaurant } from "@/types";
import { 
  Loader2, 
  MapPin, 
  Star, 
  DollarSign, 
  ShoppingCart, 
  Check, 
  Trash2, 
  Heart,
  ArrowLeft
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Import Button
import { toast } from "sonner";
import axios from "axios";

// Định nghĩa ánh xạ giá tiền
const priceRangeMap: { [key: number]: string } = {
  1: "1.000đ – 100.000đ",
  2: "100.000đ – 500.000đ",
  3: "500.000đ – 2.000.000đ",
  4: "2.000.000đ trở lên",
};

const RestaurantDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // State cho Favorite
  const [isFavorite, setIsFavorite] = useState(false);

  // Hook Cart
  const { addToCart, removeFromCart, isInCart } = useCart();
  
  // Kiểm tra trạng thái trong Cart
  const inCart = restaurant ? isInCart(restaurant.id) : false;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (!id) return;
        
        // 1. Gọi API chi tiết nhà hàng
        const resRestaurant = await axios.get(`http://localhost:5000/api/restaurant/${id}`);
        setRestaurant(resRestaurant.data);

        // 2. Kiểm tra trạng thái Favorite (nếu đã đăng nhập)
        const username = localStorage.getItem("username");
        if (username) {
          try {
            const resFav = await axios.get(`http://localhost:5000/api/favorite/${username}`);
            const favorites: string[] = resFav.data.favorites || [];
            // Kiểm tra xem ID (hoặc place_id) có trong danh sách không
            // Lưu ý: API trả về place_id, cần đảm bảo so sánh đúng
            if (resRestaurant.data.place_id) {
               setIsFavorite(favorites.includes(resRestaurant.data.place_id));
            }
          } catch (err) {
            console.error("Lỗi check favorite", err);
          }
        }
        
      } catch (error) {
        toast.error("Không thể tải chi tiết nhà hàng.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Xử lý nút Cart
  const handleCartAction = () => {
    if (!restaurant) return;
    if (inCart) {
      removeFromCart(restaurant.id);
    } else {
      addToCart(restaurant);
    }
  };

  // Xử lý nút Favorite
  const handleToggleFavorite = async () => {
    const username = localStorage.getItem("username");
    if (!username) {
      toast.error("Vui lòng đăng nhập để lưu yêu thích");
      return;
    }
    if (!restaurant) return;

    // Optimistic Update
    const oldStatus = isFavorite;
    setIsFavorite(!isFavorite);

    try {
      if (oldStatus) {
        // Đang là true -> muốn xóa
        await axios.delete("http://localhost:5000/api/favorite", {
          data: { username, place_id: restaurant.place_id }
        });
        toast.success("Đã xóa khỏi yêu thích");
      } else {
        // Đang là false -> muốn thêm
        await axios.post("http://localhost:5000/api/favorite", {
          username, place_id: restaurant.place_id
        });
        toast.success("Đã thêm vào yêu thích");
      }
    } catch (error) {
      setIsFavorite(oldStatus); // Rollback
      toast.error("Lỗi cập nhật yêu thích");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl text-muted-foreground">Không tìm thấy nhà hàng.</h1>
          <Button onClick={() => navigate("/search")} className="mt-4">
            Quay lại tìm kiếm
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        
        {/* Nút Back nhỏ */}
        <Button 
            variant="ghost" 
            className="mb-4 pl-0 hover:pl-2 transition-all" 
            onClick={() => navigate(-1)}
        >
            <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>

        <div className="max-w-6xl mx-auto">
          {/* Ảnh bìa */}
          <div className="h-64 md:h-96 w-full rounded-xl overflow-hidden bg-muted mb-8 shadow-sm">
            <img
              src={restaurant.photo_url || 'https://source.unsplash.com/random/1200x800?food'}
              alt={restaurant.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* === CỘT THÔNG TIN CHÍNH (TRÁI) === */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h1 className="text-4xl font-bold mb-2">{restaurant.name}</h1>
                <div className="flex items-center gap-2 text-lg text-muted-foreground">
                    <MapPin className="h-5 w-5 flex-shrink-0" />
                    <span>{restaurant.address}</span>
                </div>
              </div>

              {/* Rating & Price */}
              <div className="flex flex-wrap items-center gap-6 p-4 bg-secondary/20 rounded-lg">
                {restaurant.rating && (
                  <div className="flex items-center gap-2">
                    <Star className="h-6 w-6 fill-yellow-500 text-yellow-500" />
                    <span className="text-xl font-bold">{restaurant.rating}</span>
                    <span className="text-muted-foreground text-sm">/ 5.0</span>
                  </div>
                )}
                
                <div className="h-6 w-px bg-border" /> {/* Separator */}

                {restaurant.price_level && priceRangeMap[restaurant.price_level] && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {Array.from({ length: restaurant.price_level }).map((_, i) => (
                        <DollarSign key={i} className="h-5 w-5 text-green-600" />
                      ))}
                    </div>
                    <span className="text-base text-muted-foreground font-medium">
                      ({priceRangeMap[restaurant.price_level]})
                    </span>
                  </div>
                )}
              </div>

              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4">Giới thiệu</h2>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  {restaurant.description || "Chưa có mô tả chi tiết cho nhà hàng này."}
                </p>
              </Card>

              {/* Bản đồ (Demo Placeholder) */}
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4">Vị trí</h3>
                <div className="h-64 bg-muted rounded-md flex items-center justify-center border-2 border-dashed">
                  <div className="text-center text-muted-foreground">
                    <MapPin className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Map View Component</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* === CỘT HÀNH ĐỘNG & LIÊN HỆ (PHẢI) === */}
            <div className="lg:col-span-1 space-y-6">
                
              {/* 1. Card Hành động (Action Card) - Quan trọng nhất */}
              <Card className="p-6 border-primary/20 shadow-md bg-card">
                <h3 className="font-semibold text-lg mb-4">Lên kế hoạch</h3>
                <div className="space-y-3">
                    {/* Nút Add to Cart */}
                    <Button 
                        className={`w-full h-12 text-base font-semibold shadow-sm transition-all ${
                            inCart 
                            ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20" 
                            : "bg-hero-gradient hover:opacity-90 text-white"
                        }`}
                        onClick={handleCartAction}
                    >
                        {inCart ? (
                            <>
                                <Trash2 className="mr-2 h-5 w-5" /> 
                                Xóa khỏi hành trình
                            </>
                        ) : (
                            <>
                                <ShoppingCart className="mr-2 h-5 w-5" /> 
                                Thêm vào hành trình
                            </>
                        )}
                    </Button>

                    {/* Nút Favorite */}
                    <Button 
                        variant="outline" 
                        className={`w-full ${isFavorite ? 'border-red-200 bg-red-50 text-red-600' : ''}`}
                        onClick={handleToggleFavorite}
                    >
                        <Heart className={`mr-2 h-5 w-5 ${isFavorite ? "fill-red-600" : ""}`} />
                        {isFavorite ? "Đã yêu thích" : "Lưu vào yêu thích"}
                    </Button>
                </div>

                {inCart && (
                     <div className="mt-4 p-3 bg-green-50 text-green-700 text-sm rounded-md flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5" />
                        <span>Đã thêm vào danh sách. Bạn có thể tối ưu lộ trình trong trang Cart.</span>
                     </div>
                )}
              </Card>

              {/* 2. Card Liên hệ */}
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4">Thông tin liên hệ</h3>
                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                        <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <p className="font-medium">Địa chỉ</p>
                        <p className="text-muted-foreground">{restaurant.address}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                        <div className="h-4 w-4 text-primary font-bold text-center leading-4">📞</div>
                    </div>
                    <div>
                        <p className="font-medium">Điện thoại</p>
                        <p className="text-muted-foreground">{restaurant.phone_number || "Đang cập nhật"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                         <div className="h-4 w-4 text-primary font-bold text-center leading-4">🌐</div>
                    </div>
                    <div>
                        <p className="font-medium">Website</p>
                        {restaurant.website ? (
                            <a href={restaurant.website} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">
                                {restaurant.website}
                            </a>
                        ) : (
                            <p className="text-muted-foreground">Đang cập nhật</p>
                        )}
                    </div>
                  </div>
                </div>
              </Card>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantDetailPage;