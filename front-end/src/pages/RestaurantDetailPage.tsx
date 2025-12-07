import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useCart } from "@/context/CartContext";
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
  ArrowLeft,
  Image as ImageIcon,
  Utensils // Thêm icon này cho trường hợp fallback cuối cùng
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";
import RouteMap from "@/components/RouteMap";
import ReviewSection from "@/components/ReviewSection";
import { API_BASE_URL } from "@/lib/api-config";

// --- 1. CONST ẢNH DỰ PHÒNG ---
// Ảnh này sẽ hiện khi ảnh gốc của quán bị lỗi link
const DEFAULT_FOOD_IMAGE = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000&auto=format&fit=crop";

// Định nghĩa ánh xạ giá tiền
const priceRangeMap: { [key: number]: string } = {
  1: "1.000đ – 100.000đ",
  2: "100.000đ – 500.000đ",
  3: "500.000đ – 2.000.000đ",
  4: "2.000.000đ trở lên",
};

// --- HÀM TỐI ƯU URL ẢNH ---
const getOptimizedImageUrl = (url: string) => {
  if (!url) return "";
  if (url.includes("googleusercontent.com")) {
    const baseUrl = url.split("=")[0]; 
    return `${baseUrl}=w1000-h600-c`; 
  }
  return url;
};

const RestaurantDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isFavorite, setIsFavorite] = useState(false);
  const { addToCart, removeFromCart, isInCart } = useCart();
  
  // --- 2. STATE QUẢN LÝ ẢNH NÂNG CAO ---
  const [imageLoaded, setImageLoaded] = useState(false);
  const [displayImageSrc, setDisplayImageSrc] = useState<string>(""); // Lưu link ảnh đang hiển thị
  const [hasError, setHasError] = useState(false); // Trạng thái lỗi hoàn toàn

  const inCart = restaurant ? isInCart(restaurant.id) : false;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      // Reset state ảnh khi load nhà hàng mới
      setImageLoaded(false); 
      setHasError(false);
      setDisplayImageSrc("");

      try {
        if (!id) return;
        
        const resRestaurant = await axios.get(`${API_BASE_URL}/api/restaurant/${id}`);
        setRestaurant(resRestaurant.data);

        // --- XỬ LÝ ẢNH BAN ĐẦU ---
        const originalUrl = resRestaurant.data.photo_url;
        if (originalUrl) {
            setDisplayImageSrc(getOptimizedImageUrl(originalUrl));
        } else {
            // Nếu API không trả về ảnh -> Dùng ảnh mặc định ngay
            setDisplayImageSrc(DEFAULT_FOOD_IMAGE);
        }

        const username = localStorage.getItem("username");
        if (username) {
          try {
            const resFav = await axios.get(`${API_BASE_URL}/api/favorite/${username}`);
            const favorites: string[] = resFav.data.favorites || [];
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

  // --- 3. HÀM XỬ LÝ LỖI ẢNH (FALLBACK CHAIN) ---
  const handleImageError = () => {
    // Nếu ảnh đang hiển thị KHÔNG PHẢI là ảnh mặc định -> Chuyển sang ảnh mặc định
    if (displayImageSrc !== DEFAULT_FOOD_IMAGE) {
        console.warn("Ảnh gốc lỗi, chuyển sang ảnh dự phòng.");
        setDisplayImageSrc(DEFAULT_FOOD_IMAGE);
        setImageLoaded(false); // Reset để chạy lại hiệu ứng fade-in
    } else {
        // Nếu ảnh mặc định cũng lỗi -> Chấp nhận hiện Icon
        setHasError(true);
    }
  };

  const handleCartAction = () => {
    if (!restaurant) return;
    if (inCart) {
      removeFromCart(restaurant.id);
    } else {
      addToCart(restaurant);
    }
  };

  const handleToggleFavorite = async () => {
    const username = localStorage.getItem("username");
    if (!username) {
      toast.error("Vui lòng đăng nhập để lưu yêu thích");
      return;
    }
    if (!restaurant) return;

    const oldStatus = isFavorite;
    setIsFavorite(!isFavorite);

    try {
      if (oldStatus) {
        await axios.delete(`${API_BASE_URL}/api/favorite`, {
          data: { username, place_id: restaurant.place_id }
        });
        toast.success("Đã xóa khỏi yêu thích");
      } else {
        await axios.post(`${API_BASE_URL}/api/favorite`, {
          username, place_id: restaurant.place_id
        });
        toast.success("Đã thêm vào yêu thích");
      }
    } catch (error) {
      setIsFavorite(oldStatus);
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

  const mapPoints = (restaurant.lat && restaurant.lng) ? [{
      id: restaurant.name,
      lat: restaurant.lat,
      lon: restaurant.lng,
      address: restaurant.address
  }] : [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        
        <Button 
            variant="ghost" 
            className="mb-4 pl-0 hover:pl-2 transition-all hover:bg-gray/90 hover:text-green-600" 
            onClick={() => navigate(-1)}
        >
            <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>

        <div className="max-w-6xl mx-auto">
          
          {/* === KHỐI ẢNH BÌA THÔNG MINH === */}
          <div className="h-64 md:h-96 w-full rounded-xl overflow-hidden bg-muted mb-8 shadow-sm relative group bg-gray-100">
            
            {!hasError ? (
              <>
                 {/* Skeleton Loading Layer */}
                <div 
                  className={`absolute inset-0 flex items-center justify-center bg-gray-200 z-10 transition-opacity duration-300
                    ${!imageLoaded ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                >
                  <ImageIcon className="h-12 w-12 text-gray-400 animate-pulse" />
                </div>

                {/* Actual Image */}
                <img
                  src={displayImageSrc}
                  alt={restaurant.name}
                  className={`w-full h-full object-cover transition-all duration-700
                    ${imageLoaded ? "opacity-100 group-hover:scale-105" : "opacity-0"}
                  `}
                  loading="eager"
                  
                  // --- QUAN TRỌNG: FIX LỖI 403 GOOGLE ---
                  referrerPolicy="no-referrer"
                  
                  onLoad={() => setImageLoaded(true)}
                  onError={handleImageError}
                />
              </>
            ) : (
              // Fallback Layer Cuối Cùng (Nếu ảnh mặc định cũng lỗi)
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                 <Utensils className="h-20 w-20 mb-2 text-primary/40" />
                 <p className="font-medium text-muted-foreground">Chưa có hình ảnh</p>
              </div>
            )}
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
                
                <div className="h-6 w-px bg-border" />

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

              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4">Vị trí</h3>
                {mapPoints.length > 0 ? (
                    <div className="h-80 w-full rounded-md overflow-hidden relative border border-gray-200">
                        <RouteMap 
                            points={mapPoints}
                            polylineOutbound={null}
                            polylineReturn={null}
                            focusPoint={{ lat: restaurant.lat, lon: restaurant.lng }}
                        />
                    </div>
                ) : (
                    <div className="h-64 bg-muted rounded-md flex items-center justify-center border-2 border-dashed">
                        <div className="text-center text-muted-foreground">
                            <MapPin className="h-10 w-10 mx-auto mb-2 opacity-50" />
                            <p>Chưa có dữ liệu bản đồ</p>
                        </div>
                    </div>
                )}
              </Card>
              <div className="mt-8">
                 {restaurant.place_id && (
                     <ReviewSection placeId={restaurant.place_id} />
                 )}
              </div>
            </div>

            {/* === CỘT HÀNH ĐỘNG & LIÊN HỆ (PHẢI) === */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="p-6 border-primary/20 shadow-md bg-card">
                <h3 className="font-semibold text-lg mb-4">Lên kế hoạch</h3>
                <div className="space-y-3">
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

                    <Button 
                        variant="outline" 
                        className={`w-full ${isFavorite ? 'border-red-200 bg-red-50 text-red-600 hover:bg-gray-10 hover:text-black/80' : 'hover:bg-red-100 hover:text-red-600'}`}
                        onClick={handleToggleFavorite}
                    >
                        <Heart className={`mr-2 h-5 w-5 ${isFavorite ? "fill-red-600" : ""}`} />
                        {isFavorite ? "Đã yêu thích" : "Lưu vào yêu thích"}
                    </Button>
                </div>
                {inCart && (
                      <div className="mt-4 p-3 bg-green-50 text-green-700 text-sm rounded-md flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5" />
                        <span>Đã thêm vào danh sách.</span>
                      </div>
                )}
              </Card>

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