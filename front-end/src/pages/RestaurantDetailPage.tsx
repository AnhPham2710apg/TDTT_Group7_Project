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
  Utensils,
  Share2,
  Navigation,
  Globe,
  Phone
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import axios from "axios";
import RouteMap from "@/components/RouteMap";
import ReviewSection from "@/components/ReviewSection";
import { API_BASE_URL } from "@/lib/api-config";

const DEFAULT_FOOD_IMAGE = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000&auto=format&fit=crop";

// Định nghĩa ánh xạ giá tiền

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
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [displayImageSrc, setDisplayImageSrc] = useState<string>(""); 
  const [hasError, setHasError] = useState(false); 

  const inCart = restaurant ? isInCart(restaurant.id) : false;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setImageLoaded(false); 
      setHasError(false);
      setDisplayImageSrc("");

      try {
        if (!id) return;
        
        const resRestaurant = await axios.get(`${API_BASE_URL}/api/restaurant/${id}`);
        setRestaurant(resRestaurant.data);

        const originalUrl = resRestaurant.data.photo_url;
        if (originalUrl) {
            setDisplayImageSrc(getOptimizedImageUrl(originalUrl));
        } else {
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

  const handleImageError = () => {
    if (displayImageSrc !== DEFAULT_FOOD_IMAGE) {
        setDisplayImageSrc(DEFAULT_FOOD_IMAGE);
        setImageLoaded(false); 
    } else {
        setHasError(true);
    }
  };

  const handleCartAction = () => {
    if (!restaurant) return;
    if (inCart) {
      removeFromCart(restaurant.id);
      toast.success("Đã xóa khỏi hành trình");
    } else {
      addToCart(restaurant);
      toast.success("Đã thêm vào hành trình");
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h1 className="text-xl text-muted-foreground mb-4">Không tìm thấy nhà hàng.</h1>
        <Button onClick={() => navigate("/search")}>Quay lại tìm kiếm</Button>
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
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* PC Navbar */}
      <div className="hidden md:block">
         <Navbar />
      </div>

      {/* ============================================================
          1. GIAO DIỆN MOBILE (IMMERSE HEADER + TABS + FAB)
         ============================================================ */}
      <div className="md:hidden">
         {/* IMMERSE IMAGE HEADER */}
         <div className="relative h-[40vh] w-full bg-gray-900">
            {/* Back Button (Floating) */}
            {/* 1. NÚT BACK (ĐÃ CHỈNH STYLE) */}
            <div className="absolute top-0 left-0 w-full z-20 pt-4 pb-2 px-4 flex items-center gap-3 pointer-events-none">
                <Button 
                    variant="outline" 
                    size="icon" 
                    // === STYLE MỚI CHO NÚT BACK ===
                    className="h-9 w-9 rounded-full shadow-lg transition-all duration-300 pointer-events-auto
                              bg-white text-green-600 border border-green-600
                              hover:bg-green-600 hover:text-white hover:border-green-600" 
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
            </div>
            
            {/* Share/Favorite Button (Floating Right) */}
            <div className="absolute top-4 right-4 z-20 flex gap-2">
                <Button variant="secondary" size="icon" className="rounded-full shadow-md bg-white/90 backdrop-blur-sm hover:bg-red-300 hover:text-white" onClick={handleToggleFavorite}>
                    <Heart className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : "text-gray-800"}`} />
                </Button>
            </div>

            {/* Image */}
            {!hasError ? (
                <img
                    src={displayImageSrc}
                    alt={restaurant.name}
                    className={`w-full h-full object-cover transition-opacity duration-700 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                    loading="eager"
                    referrerPolicy="no-referrer"
                    onLoad={() => setImageLoaded(true)}
                    onError={handleImageError}
                />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                    <Utensils className="h-16 w-16 text-gray-300 mb-2" />
                    <p className="text-gray-400 text-sm">Chưa có hình ảnh</p>
                </div>
            )}
            
            {/* Gradient Overlay bottom for text readability */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
         </div>

         {/* MAIN INFO SECTION (Overlapping) */}
         <div className="relative -mt-6 rounded-t-3xl bg-background px-5 pt-6 pb-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
             <div className="flex justify-between items-start mb-1">
                 <h1 className="text-2xl font-bold text-gray-900 flex-1 mr-2 leading-tight">{restaurant.name}</h1>
                 {restaurant.rating && (
                     <div className="flex flex-col items-center bg-green-50 px-2 py-1 rounded-lg border border-green-100">
                         <div className="flex items-center gap-1">
                             <span className="font-bold text-green-700 text-sm">{restaurant.rating}</span>
                             <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                         </div>
                     </div>
                 )}
             </div>

             <div className="flex items-center text-sm text-gray-500 mb-4 gap-1">
                 <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                 <span className="truncate">{restaurant.address}</span>
             </div>

             <div className="flex items-center gap-4 text-sm border-b pb-4 mb-4">
                 {restaurant.price_level && (
                     <div className="flex items-center text-gray-700 font-medium bg-gray-100 px-3 py-1.5 rounded-full">
                         <DollarSign className="h-3.5 w-3.5 mr-1 text-green-600" />
                         {priceRangeMap[restaurant.price_level] || "---"}
                     </div>
                 )}
                 <div className="flex items-center text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-full">
                     <Check className="h-3.5 w-3.5 mr-1" /> Đang mở cửa
                 </div>
             </div>

             {/* TABS NAVIGATION */}
             <Tabs defaultValue="about" className="w-full">
                 <TabsList className="w-full grid grid-cols-3 bg-muted/50 p-1 rounded-xl h-11 mb-4">
                     <TabsTrigger value="about" className="rounded-lg text-xs font-medium">Giới thiệu</TabsTrigger>
                     <TabsTrigger value="reviews" className="rounded-lg text-xs font-medium">Đánh giá</TabsTrigger>
                     <TabsTrigger value="location" className="rounded-lg text-xs font-medium">Vị trí</TabsTrigger>
                 </TabsList>

                 <TabsContent value="about" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                     <div className="space-y-4">
                         <div>
                             <h3 className="font-semibold mb-2">Mô tả</h3>
                             <p className="text-sm text-gray-600 leading-relaxed text-justify">
                                 {restaurant.description || "Chưa có mô tả chi tiết cho nhà hàng này. Hãy đến và trải nghiệm thử nhé!"}
                             </p>
                         </div>
                         
                         <div className="space-y-3 pt-2">
                             <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                 <div className="flex items-center gap-3">
                                     <div className="p-2 bg-white rounded-full shadow-sm text-blue-500"><Phone className="h-4 w-4" /></div>
                                     <div className="text-sm">
                                         <p className="font-medium text-gray-900">Liên hệ</p>
                                         <p className="text-gray-500 text-xs">{restaurant.phone_number || "..."}</p>
                                     </div>
                                 </div>
                                 {restaurant.phone_number && (
                                     <a href={`tel:${restaurant.phone_number}`} className="text-xs font-bold text-blue-600 bg-blue-100 px-3 py-1.5 rounded-full">GỌI NGAY</a>
                                 )}
                             </div>

                             <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                 <div className="flex items-center gap-3">
                                     <div className="p-2 bg-white rounded-full shadow-sm text-purple-500"><Globe className="h-4 w-4" /></div>
                                     <div className="text-sm">
                                         <p className="font-medium text-gray-900">Website</p>
                                         <p className="text-gray-500 text-xs truncate max-w-[150px]">{restaurant.website || "..."}</p>
                                     </div>
                                 </div>
                                 {restaurant.website && (
                                     <a href={restaurant.website} target="_blank" className="text-xs font-bold text-purple-600 bg-purple-100 px-3 py-1.5 rounded-full">TRUY CẬP</a>
                                 )}
                             </div>
                         </div>
                     </div>
                 </TabsContent>

                 <TabsContent value="reviews" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                     {restaurant.place_id ? (
                         <ReviewSection placeId={restaurant.place_id} />
                     ) : (
                         <div className="text-center py-10 text-gray-400">Không có dữ liệu đánh giá</div>
                     )}
                 </TabsContent>

                 <TabsContent value="location" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                     <div className="rounded-xl overflow-hidden shadow-sm border h-64 relative">
                         {mapPoints.length > 0 ? (
                              <RouteMap
                                  points={mapPoints}
                                  polylineOutbound={null}
                                  polylineReturn={null}
                                  focusPoint={{ lat: restaurant.lat, lon: restaurant.lng }}
                              />
                         ) : (
                             <div className="flex items-center justify-center h-full bg-gray-100 text-gray-400 text-sm">Chưa có bản đồ</div>
                         )}
                     </div>
                     <div className="mt-3">
                         <p className="text-sm font-medium text-gray-900 mb-1">Địa chỉ chi tiết</p>
                         <p className="text-sm text-gray-500">{restaurant.address}</p>
                     </div>
                 </TabsContent>
             </Tabs>
         </div>

         {/* FLOATING ACTION BAR (STICKY BOTTOM) */}
         <div className="fixed bottom-0 left-0 w-full bg-white border-t p-3 px-4 pb-6 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-30 flex items-center gap-3">
             {inCart ? (
                 <Button 
                    variant="outline"
                    className="flex-1 h-12 text-red-600 border-red-200 bg-red-50 hover:bg-red-100 rounded-xl font-bold"
                    onClick={handleCartAction}
                 >
                     <Trash2 className="mr-2 h-5 w-5" /> Xóa khỏi hành trình
                 </Button>
             ) : (
                 <Button 
                    className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-200"
                    onClick={handleCartAction}
                 >
                     <ShoppingCart className="mr-2 h-5 w-5" /> Thêm vào hành trình
                 </Button>
             )}
         </div>
      </div>

      {/* ============================================================
          2. GIAO DIỆN PC (GIỮ NGUYÊN CODE CŨ - HIDDEN ON MOBILE)
         ============================================================ */}
      <div className="hidden md:block container mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-4 pl-0 hover:pl-2 transition-all hover:bg-gray/90 hover:text-green-600" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>

        <div className="max-w-6xl mx-auto">
          {/* Ảnh Bìa PC */}
          <div className="h-96 w-full rounded-xl overflow-hidden bg-muted mb-8 shadow-sm relative group bg-gray-100">
            {!hasError ? (
              <>
                <div className={`absolute inset-0 flex items-center justify-center bg-gray-200 z-10 transition-opacity duration-300 ${!imageLoaded ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                  <ImageIcon className="h-12 w-12 text-gray-400 animate-pulse" />
                </div>
                <img src={displayImageSrc} alt={restaurant.name} className={`w-full h-full object-cover transition-all duration-700 ${imageLoaded ? "opacity-100 group-hover:scale-105" : "opacity-0"}`} loading="eager" referrerPolicy="no-referrer" onLoad={() => setImageLoaded(true)} onError={handleImageError} />
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                  <Utensils className="h-20 w-20 mb-2 text-primary/40" />
                  <p className="font-medium text-muted-foreground">Chưa có hình ảnh</p>
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h1 className="text-4xl font-bold mb-2">{restaurant.name}</h1>
                <div className="flex items-center gap-2 text-lg text-muted-foreground">
                    <MapPin className="h-5 w-5 flex-shrink-0" />
                    <span>{restaurant.address}</span>
                </div>
              </div>

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
                    <span className="text-base text-muted-foreground font-medium">({priceRangeMap[restaurant.price_level]})</span>
                  </div>
                )}
              </div>

              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4">Giới thiệu</h2>
                <p className="text-muted-foreground leading-relaxed text-lg">{restaurant.description || "Chưa có mô tả chi tiết cho nhà hàng này."}</p>
              </Card>

              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4">Vị trí</h3>
                {mapPoints.length > 0 ? (
                    <div className="h-80 w-full rounded-md overflow-hidden relative border border-gray-200">
                        <RouteMap points={mapPoints} polylineOutbound={null} polylineReturn={null} focusPoint={{ lat: restaurant.lat, lon: restaurant.lng }} />
                    </div>
                ) : (
                    <div className="h-64 bg-muted rounded-md flex items-center justify-center border-2 border-dashed">
                        <div className="text-center text-muted-foreground"><MapPin className="h-10 w-10 mx-auto mb-2 opacity-50" /><p>Chưa có dữ liệu bản đồ</p></div>
                    </div>
                )}
              </Card>
              <div className="mt-8">{restaurant.place_id && <ReviewSection placeId={restaurant.place_id} />}</div>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <Card className="p-6 border-primary/20 shadow-md bg-card">
                <h3 className="font-semibold text-lg mb-4">Lên kế hoạch</h3>
                <div className="space-y-3">
                    <Button className={`w-full h-12 text-base font-semibold shadow-sm transition-all ${inCart ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20" : "bg-hero-gradient hover:opacity-90 text-white"}`} onClick={handleCartAction}>
                        {inCart ? <><Trash2 className="mr-2 h-5 w-5" /> Xóa khỏi hành trình</> : <><ShoppingCart className="mr-2 h-5 w-5" /> Thêm vào hành trình</>}
                    </Button>
                    <Button variant="outline" className={`w-full ${isFavorite ? 'border-red-200 bg-red-50 text-red-600 hover:bg-gray-10 hover:text-black/80' : 'hover:bg-red-100 hover:text-red-600'}`} onClick={handleToggleFavorite}>
                        <Heart className={`mr-2 h-5 w-5 ${isFavorite ? "fill-red-600" : ""}`} />
                        {isFavorite ? "Đã yêu thích" : "Lưu vào yêu thích"}
                    </Button>
                </div>
                {inCart && <div className="mt-4 p-3 bg-green-50 text-green-700 text-sm rounded-md flex items-start gap-2"><Check className="h-4 w-4 mt-0.5" /><span>Đã thêm vào danh sách.</span></div>}
              </Card>

              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4">Thông tin liên hệ</h3>
                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-3"><div className="bg-primary/10 p-2 rounded-full"><MapPin className="h-4 w-4 text-primary" /></div><div><p className="font-medium">Địa chỉ</p><p className="text-muted-foreground">{restaurant.address}</p></div></div>
                  <div className="flex items-start gap-3"><div className="bg-primary/10 p-2 rounded-full"><div className="h-4 w-4 text-primary font-bold text-center leading-4">📞</div></div><div><p className="font-medium">Điện thoại</p><p className="text-muted-foreground">{restaurant.phone_number || "Đang cập nhật"}</p></div></div>
                  <div className="flex items-start gap-3"><div className="bg-primary/10 p-2 rounded-full"><div className="h-4 w-4 text-primary font-bold text-center leading-4">🌐</div></div><div><p className="font-medium">Website</p>{restaurant.website ? <a href={restaurant.website} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">{restaurant.website}</a> : <p className="text-muted-foreground">Đang cập nhật</p>}</div></div>
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