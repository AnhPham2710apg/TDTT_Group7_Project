// src/pages/ProfilePage.tsx

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, MapPin, Star, User, Edit, Loader2, Trash2, Calendar, Pencil, Camera, X, MessageSquare, Settings, Image as ImageIcon } from "lucide-react";
import RestaurantCard from "@/components/RestaurantCard";
import { Restaurant } from "@/types";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { API_BASE_URL } from "@/lib/api-config";
// 1. Import hook
import { useTranslation } from 'react-i18next';

// --- HELPERS ---
const getOptimizedImageUrl = (url: string) => {
  if (!url) return "";
  
  // Nếu url bắt đầu bằng /static (từ backend trả về)
  if (url.startsWith("/static")) {
      return `${API_BASE_URL}${url}`;
  }
  
  // Nếu là ảnh Google hoặc link tuyệt đối khác
  if (url.includes("googleusercontent.com")) {
    const baseUrl = url.split("=")[0];
    return `${baseUrl}=w400-h400-c`;
  }
  
  // Các trường hợp còn lại (ví dụ blob:http://... khi đang preview)
  return url;
};

// --- SUB-COMPONENT: REVIEW IMAGE ---
const ReviewImage = ({ src, alt, className }: { src?: string, alt?: string, className?: string }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const optimizedSrc = getOptimizedImageUrl(src || "");

  return (
    <div className={`relative w-full h-full overflow-hidden ${className || ""}`}>
      {/* Skeleton Loader */}
      <div className={`absolute inset-0 flex items-center justify-center bg-gray-100 z-10 ${!imageLoaded ? "animate-pulse" : "hidden"}`}>
        <ImageIcon className="h-6 w-6 text-gray-300" />
      </div>

      {/* Image or Error Fallback */}
      {optimizedSrc && !imageError ? (
        <img
          src={optimizedSrc}
          alt={alt || "Review image"}
          className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
          <StoreIcon />
        </div>
      )}
    </div>
  );
};

// --- INTERFACES ---
interface RouteHistoryItem {
  id: number;
  name: string;
  start_point: string;
  places: { name: string; address: string; lat: number; lng: number }[];
  created_at: string;
}

interface UserReviewItem {
  id: number;
  place_id: string;
  rating: number;
  comment: string;
  images: string[];
  created_at: string;
  restaurantName?: string;
  restaurantAddress?: string;
}

const ProfilePage = () => {
  // 2. Khởi tạo hook (Lấy thêm i18n để format ngày tháng)
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isLoggedIn, username: authUsername, updateUsername, updateAvatar, isLoading: authLoading } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // [NEW] File upload state
  const [showImagePreview, setShowImagePreview] = useState(false); // [NEW] State mở ảnh to

  // Data
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  const [routes, setRoutes] = useState<RouteHistoryItem[]>([]);
  const [myReviews, setMyReviews] = useState<UserReviewItem[]>([]);

  const [isLoadingData, setIsLoadingData] = useState(false);

  // State xử lý xóa 
  const [deleteType, setDeleteType] = useState<"route" | "review" | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // State đổi tên lộ trình
  const [editingRoute, setEditingRoute] = useState<{ id: number, name: string } | null>(null);
  const [newName, setNewName] = useState("");

  const stats = {
    favorites: favorites.length,
    routes: routes.length,
    reviews: myReviews.length
  };

  const fetchProfileData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const currentUsername = authUsername || localStorage.getItem("username");
      if (!currentUsername) return;

      // [NEW] 0. Fetch User Profile
      try {
        const profileRes = await axios.get(`${API_BASE_URL}/api/profile/${currentUsername}`);
        const userData = profileRes.data;
        // Only set if not editing (to prevent overwriting user input)
        if (!isEditing) {
          setEmail(userData.email || "");
          setBio(userData.bio || "");
          setAvatarUrl(userData.avatar || "");
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }

      // Lấy ngôn ngữ hiện tại
      const currentLang = i18n.language;

      // 1. Fetch Favorites
      const favRes = await axios.get(`${API_BASE_URL}/api/favorite/${currentUsername}`);
      const favIds: string[] = favRes.data.favorites || [];

      // --- SỬA: Thêm ?lang=${currentLang} ---
      const favPromises = favIds.map(id =>
        axios.get(`${API_BASE_URL}/api/restaurant/${id}?lang=${currentLang}`).catch(() => null)
      );
      const favResults = await Promise.all(favPromises);
      setFavorites(favResults.filter(r => r?.data).map(r => ({ ...r?.data, is_favorite: true })));

      // 2. Fetch Routes
      const routeRes = await axios.get(`${API_BASE_URL}/api/routes/${currentUsername}`);
      setRoutes(routeRes.data);

      // 3. Fetch Reviews
      const reviewRes = await axios.get(`${API_BASE_URL}/api/user/${currentUsername}/reviews`);
      const reviewsData: UserReviewItem[] = reviewRes.data;

      const reviewPromises = reviewsData.map(async (review) => {
        try {
          // --- SỬA: Thêm ?lang=${currentLang} ---
          const restRes = await axios.get(`${API_BASE_URL}/api/restaurant/${review.place_id}?lang=${currentLang}`);
          return {
            ...review,
            restaurantName: restRes.data.name,
            restaurantAddress: restRes.data.address
          };
        } catch (e) {
          return { ...review, restaurantName: t('profile.error_restaurant_not_found', "Nhà hàng không tồn tại") };
        }
      });

      const enrichedReviews = await Promise.all(reviewPromises);
      setMyReviews(enrichedReviews);

    } catch (error) {
      console.error("Lỗi tải profile data:", error);
    } finally {
      setIsLoadingData(false);
    }
    // --- QUAN TRỌNG: Thêm i18n.language vào dependency để hàm chạy lại khi đổi ngữ ---
  }, [authUsername, i18n.language, isEditing, t]);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      toast.error(t('common.login_required', "Bạn cần đăng nhập để xem trang này"));
      navigate("/login");
      return;
    }
    
    // Set username để hiển thị
    setUsername(authUsername || "User");
    
    // --- [SỬA ĐOẠN NÀY] ---
    // Xóa các dòng set dữ liệu giả:
    // setEmail(authUsername ? `${authUsername}@example.com` : "user@example.com");
    // setBio(t('profile.default_bio', "Yêu thích khám phá ẩm thực Việt Nam"));
    
    // Thay bằng reset về rỗng (để chờ dữ liệu thật từ server):
    // ----------------------

    // Gọi hàm lấy dữ liệu thật từ Database
    fetchProfileData();
    
  }, [isLoggedIn, authUsername, authLoading, navigate, fetchProfileData, t]);

  // [NEW] Handle File Change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      // Preview
      const objectUrl = URL.createObjectURL(e.target.files[0]);
      setAvatarUrl(objectUrl);
    }
  };

  const handleSave = async () => {
    setIsLoadingData(true);
    
    // Lấy username hiện tại (trước khi đổi) để làm key tìm kiếm
    const currentUsername = authUsername || localStorage.getItem("username");
    
    if (!currentUsername) {
        toast.error(t('common.error', "Không xác định được người dùng"));
        setIsLoadingData(false);
        return;
    }

    try {
      // 1. Upload Avatar nếu có chọn file mới
      let uploadedAvatarUrl = avatarUrl;
      
      // Kiểm tra: Chỉ upload nếu là File object (blob)
      // Nếu avatarUrl đang là link http/https hoặc /static thì tức là không đổi ảnh -> không cần upload lại
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const uploadRes = await axios.post(`${API_BASE_URL}/api/upload/avatar`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        uploadedAvatarUrl = uploadRes.data.url; 
      }

      // 2. Update Profile (Gửi cả current_username và username mới)
      const updateRes = await axios.put(`${API_BASE_URL}/api/profile`, {
        current_username: currentUsername, // [QUAN TRỌNG] Để backend tìm user cũ
        username: username,                // Tên mới (input form)
        email: email,
        bio: bio,
        avatar: uploadedAvatarUrl
      });

      // 3. Update Auth Context và Local State
      if (username !== authUsername) {
        updateUsername(username); // Cập nhật tên mới vào localStorage
      }
      
      // Cập nhật Avatar vào Context và State ngay lập tức
      const finalAvatar = updateRes.data.user.avatar || uploadedAvatarUrl;
      updateAvatar(finalAvatar);
      setAvatarUrl(finalAvatar);
      
      // Reset file đã chọn
      setSelectedFile(null);

      toast.success(t('profile.update_success', "Đã cập nhật hồ sơ"));
      setIsEditing(false);
      
      // Không cần gọi fetchProfileData() ngay nếu không cần thiết, 
      // vì useEffect sẽ tự chạy lại nếu authUsername thay đổi.
      // Nhưng gọi lại cũng an toàn để đồng bộ dữ liệu khác.
      fetchProfileData(); 

    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error("Save error:", error);
      if (error.response && error.response.status === 409) {
          toast.error(t('profile.error_username_taken', "Tên đăng nhập đã tồn tại"));
      } else {
          toast.error(t('common.error', "Lỗi lưu hồ sơ"));
      }
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleRemoveFavorite = async (restaurant: Restaurant) => {
    const currentUsername = authUsername || localStorage.getItem("username");
    if (!currentUsername) return;
    const oldFavs = favorites;
    setFavorites(prev => prev.filter(f => f.id !== restaurant.id));
    try {
      await axios.delete(`${API_BASE_URL}/api/favorite`, {
        data: { username: currentUsername, place_id: restaurant.place_id }
      });
      toast.success(t('favorite.removed_success', { name: restaurant.name, defaultValue: "Đã xóa khỏi yêu thích" }));
    } catch (error) {
      toast.error(t('common.error', "Lỗi khi xóa"));
      setFavorites(oldFavs);
    }
  };

  const handleViewRoute = (route: RouteHistoryItem) => {
    const separator = "|||";
    const names = route.places.map(p => p.name).join(separator);
    const addresses = route.places.map(p => p.address).join(separator);
    const lats = route.places.map(p => p.lat).join(separator);
    const lngs = route.places.map(p => p.lng).join(separator);
    const params = new URLSearchParams();
    params.append("names", names);
    params.append("addresses", addresses);
    params.append("lats", lats);
    params.append("lngs", lngs);
    if (route.start_point) params.append("start", route.start_point);
    navigate(`/optimize?${params.toString()}`);
  };

  const confirmDelete = (id: number, type: "route" | "review", event: React.MouseEvent) => {
    event.stopPropagation();
    setDeleteId(id);
    setDeleteType(type);
  };

  const executeDelete = async () => {
    if (!deleteId || !deleteType) return;
    try {
      if (deleteType === "route") {
        await axios.delete(`${API_BASE_URL}/api/routes/${deleteId}`);
        setRoutes((prev) => prev.filter((r) => r.id !== deleteId));
        toast.success(t('profile.delete_route_success', "Đã xóa lộ trình!"));
      } else {
        await axios.delete(`${API_BASE_URL}/api/reviews/${deleteId}`);
        setMyReviews((prev) => prev.filter((r) => r.id !== deleteId));
        toast.success(t('profile.delete_review_success', "Đã xóa bài đánh giá!"));
      }
    } catch (error) {
      console.error("Lỗi xóa:", error);
      toast.error(t('common.error', "Có lỗi xảy ra khi xóa."));
    } finally {
      setDeleteId(null);
      setDeleteType(null);
    }
  };

  const openRenameDialog = (route: RouteHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRoute({ id: route.id, name: route.name });
    setNewName(route.name);
  };

  const handleRenameSubmit = async () => {
    if (!editingRoute || !newName.trim()) return;
    try {
      await axios.put(`${API_BASE_URL}/api/routes/${editingRoute.id}`, { name: newName });
      setRoutes(prev => prev.map(r => r.id === editingRoute.id ? { ...r, name: newName } : r));
      toast.success(t('profile.rename_success', "Đổi tên thành công!"));
      setEditingRoute(null);
    } catch (error) {
      toast.error(t('common.error', "Lỗi khi đổi tên"));
    }
  };

  const getAvatarFallback = () => {
    return username ? username.charAt(0).toUpperCase() : <User className="h-12 w-12" />;
  };

  if (authLoading || isLoadingData) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />

      {/* ================================================
        1. PC LAYOUT
        ================================================
      */}
      <div className="hidden md:block container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="relative group">
                {/* 1. Ảnh Avatar: Click để xem to */}
                <Avatar 
                  className="h-32 w-32 border-4 border-white shadow-md cursor-zoom-in transition-transform hover:scale-[1.02]"
                  onClick={() => setShowImagePreview(true)}
                >
                  <AvatarImage src={getOptimizedImageUrl(avatarUrl)} className="object-cover" />
                  <AvatarFallback className="text-4xl bg-primary/10">{getAvatarFallback()}</AvatarFallback>
                </Avatar>

                {/* 2. Nút Edit (Camera): Chỉ hiện khi isEditing = true */}
                {isEditing && (
                  <label 
                    htmlFor="avatar-upload-pc" 
                    className="absolute bottom-0 right-0 p-2 bg-gray-900 text-white rounded-full shadow-lg border-2 border-white cursor-pointer hover:bg-primary transition-colors z-10"
                    title="Đổi ảnh đại diện"
                  >
                    <Camera className="w-5 h-5" /> {/* Icon đại diện cho việc upload */}
                    <Input 
                      id="avatar-upload-pc" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileChange} 
                    />
                  </label>
                )}
              </div>
              
              <div className="flex-1 text-center md:text-left">
                {isEditing ? (
                  <div className="space-y-4 max-w-md"> {/* Thêm max-w-md để input không quá dài */}
                    {/* BỎ phần Label cũ đi vì đã tích hợp vào Avatar */}
                    
                    {/* Các input còn lại giữ nguyên */}
                    <div className="grid gap-2">
                        <Label className="text-left text-xs text-muted-foreground font-semibold uppercase">Username</Label>
                        <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
                    </div>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
                    <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" />
                    <div className="flex gap-2">
                      <Button onClick={handleSave}>{t('common.save', 'Lưu')}</Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>{t('common.cancel', 'Hủy')}</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-3xl font-bold mb-2">{username}</h1>
                    <p className="text-muted-foreground mb-2">{email}</p>
                    <p className="text-foreground mb-4">{bio}</p>
                    <Button onClick={() => setIsEditing(true)} className="gap-2">
                      <Edit className="h-4 w-4" /> {t('profile.edit_profile', 'Chỉnh sửa')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-6 mb-8">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 rounded-full bg-primary/10"><Heart className="h-6 w-6 text-primary" /></div><div><p className="text-3xl font-bold">{stats.favorites}</p><p className="text-muted-foreground">{t('profile.stats_favorites', 'Yêu thích')}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 rounded-full bg-primary/10"><MapPin className="h-6 w-6 text-primary" /></div><div><p className="text-3xl font-bold">{stats.routes}</p><p className="text-muted-foreground">{t('profile.stats_routes', 'Lộ trình')}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 rounded-full bg-primary/10"><Star className="h-6 w-6 text-primary" /></div><div><p className="text-3xl font-bold">{stats.reviews}</p><p className="text-muted-foreground">{t('profile.stats_reviews', 'Đánh giá')}</p></div></div></CardContent></Card>
        </div>
      </div>

      {/* ================================================
        2. MOBILE HEADER & STATS
        ================================================
      */}
      <div className="md:hidden">
        <div className="bg-white border-b pb-6 pt-2 px-4 rounded-b-[2rem] shadow-sm mb-4">
          <div className="flex flex-col items-center">
            
            {/* [UPDATED MOBILE AVATAR] */}
            <div className="relative mb-4">
              {/* Avatar: Click để xem to */}
              <Avatar 
                className="h-28 w-28 border-4 border-white shadow-xl cursor-zoom-in"
                onClick={() => setShowImagePreview(true)}
              >
                <AvatarImage src={getOptimizedImageUrl(avatarUrl)} className="object-cover" />
                <AvatarFallback className="text-3xl bg-primary/10 text-primary">{getAvatarFallback()}</AvatarFallback>
              </Avatar>

              {/* Nút Edit (Camera): Chỉ hiện khi isEditing = true */}
              {/* Đã chỉnh vị trí: bottom-0 right-0 -> Sát góc phải dưới */}
              {isEditing && (
                <label 
                  htmlFor="avatar-upload-mobile" 
                  className="absolute bottom-0 right-0 p-2 bg-gray-900 text-white rounded-full shadow-lg border-2 border-white cursor-pointer active:scale-95 transition-transform z-10 flex items-center justify-center"
                >
                  <Camera className="w-4 h-4" />
                  <Input 
                    id="avatar-upload-mobile" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileChange} 
                  />
                </label>
              )}
            </div>

            {isEditing ? (
              <div className="w-full space-y-3 animate-in fade-in zoom-in duration-300">
                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="" />
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="" />
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" className="min-h-[80px]" />
                
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSave} className="flex-1 bg-primary text-white rounded-full">{t('common.save', 'Lưu')}</Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1 rounded-full">{t('common.cancel', 'Hủy')}</Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900">{username}</h1>
                <p className="text-sm text-gray-500 mb-1">{email}</p>
                <p className="text-sm text-center text-gray-600 mb-4 px-4 line-clamp-2">{bio}</p>
                
                {/* [ADDED BACK] Nút Edit Profile cho Mobile */}
                <Button 
                  onClick={() => setIsEditing(true)} 
                  variant="outline"
                  className="rounded-full px-6 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="w-4 h-4 mr-2" /> {t('profile.edit_profile', 'Chỉnh sửa hồ sơ')}
                </Button>
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-red-50 p-3 rounded-2xl flex flex-col items-center justify-center border border-red-100">
              <Heart className="h-5 w-5 text-red-500 mb-1" />
              <span className="font-bold text-lg text-gray-800">{stats.favorites}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{t('profile.stats_favorites', 'Yêu thích')}</span>
            </div>
            <div className="bg-blue-50 p-3 rounded-2xl flex flex-col items-center justify-center border border-blue-100">
              <MapPin className="h-5 w-5 text-blue-500 mb-1" />
              <span className="font-bold text-lg text-gray-800">{stats.routes}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{t('profile.stats_routes', 'Lộ trình')}</span>
            </div>
            <div className="bg-yellow-50 p-3 rounded-2xl flex flex-col items-center justify-center border border-yellow-100">
              <Star className="h-5 w-5 text-yellow-500 mb-1" />
              <span className="font-bold text-lg text-gray-800">{stats.reviews}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{t('profile.stats_reviews', 'Đánh giá')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================
        3. MAIN CONTENT TABS
        ================================================
      */}
      <div className="container mx-auto px-4">
        <Tabs defaultValue="favorites" className="w-full">

          <div className="sticky top-14 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 -mx-4 px-4 md:static md:bg-transparent md:p-0 md:mx-0">
            <TabsList className="w-full justify-start md:rounded-3xl h-12 p-1 bg-muted/50 overflow-x-auto flex-nowrap no-scrollbar">
              <TabsTrigger value="favorites" className="rounded-full text-sm px-6 flex-shrink-0 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                {t('profile.tab_favorites', 'Quán yêu thích')}
              </TabsTrigger>
              <TabsTrigger value="routes" className="rounded-full text-sm px-6 flex-shrink-0 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                {t('profile.tab_routes', 'Lộ trình đã lưu')}
              </TabsTrigger>
              <TabsTrigger value="reviews" className="rounded-full text-sm px-6 flex-shrink-0 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                {t('profile.tab_reviews', 'Đánh giá của tôi')}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 1. Favorites Content */}
          <TabsContent value="favorites" className="min-h-[300px] space-y-4 mt-4">
            {favorites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground bg-gray-50 rounded-xl border border-dashed">
                <Heart className="h-10 w-10 mb-2 opacity-20" />
                <p>{t('profile.empty_favorites', 'Chưa có quán yêu thích')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.map((restaurant) => (
                  <div key={restaurant.id}>
                    <RestaurantCard restaurant={restaurant} onToggleFavorite={handleRemoveFavorite} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 2. Routes Content */}
          <TabsContent value="routes" className="min-h-[300px] space-y-3 mt-4">
            {routes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-gray-50 rounded-xl border border-dashed">
                <MapPin className="h-12 w-12 mb-3 opacity-20" />
                <p>{t('profile.empty_routes', 'Bạn chưa lưu lộ trình nào')}</p>
              </div>
            ) : (
              <>
                {/* --- GIAO DIỆN MOBILE --- */}
                <div className="md:hidden space-y-3">
                  {routes.map((route) => (
                    <div key={route.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
                      {/* Header Mobile */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                            <MapPin className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800 line-clamp-1">{route.name}</h4>
                            <p className="text-xs text-gray-500">
                              {/* Dùng i18n.language để format ngày tháng tự động */}
                              {new Date(route.created_at).toLocaleDateString(i18n.language)}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-gray-400" onClick={(e) => openRenameDialog(route, e)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Body Mobile */}
                      <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                        <p className="text-gray-600 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          {route.start_point}
                        </p>
                        <div className="pl-[3px] border-l border-dashed border-gray-300 ml-[3px] h-3"></div>
                        <p className="text-gray-600 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          {route.places.length} {t('profile.route_stops', 'điểm dừng')}
                        </p>
                      </div>

                      {/* Footer Mobile */}
                      <div className="flex gap-2 mt-1">
                        <Button onClick={() => handleViewRoute(route)} className="flex-1 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 h-9 rounded-lg shadow-sm text-xs font-medium">
                          {t('profile.btn_view', 'Xem lại')}
                        </Button>
                        <Button onClick={(e) => confirmDelete(route.id, "route", e)} className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 h-9 rounded-lg shadow-sm text-xs font-medium">
                          {t('profile.btn_delete', 'Xóa')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* --- GIAO DIỆN PC --- */}
                <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {routes.map((route) => (
                    <Card key={route.id} className="group hover:shadow-md transition-shadow border-gray-200 flex flex-col justify-between">
                      <CardHeader className="pb-2 p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3 w-full">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                              <MapPin className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-sm font-bold truncate" title={route.name}>{route.name}</CardTitle>
                              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(route.created_at).toLocaleDateString(i18n.language)}
                              </p>
                            </div>
                          </div>

                          {/* Nút thao tác PC */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-gray/90" onClick={(e) => openRenameDialog(route, e)} title="Đổi tên">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-gray/90" onClick={(e) => confirmDelete(route.id, "route", e)} title="Xóa">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 pt-0">
                        <div className="bg-muted/30 p-2.5 rounded-md text-xs space-y-1.5 border mb-3">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">{t('profile.route_start', 'Xuất phát')}</span>
                            <span className="font-medium truncate max-w-[120px]" title={route.start_point}>{route.start_point}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">{t('profile.route_stops_label', 'Điểm dừng')}</span>
                            <span className="font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-[10px]">
                              {route.places.length} {t('profile.route_places_unit', 'địa điểm')}
                            </span>
                          </div>
                        </div>

                        <Button onClick={() => handleViewRoute(route)} className="w-full h-8 text-xs bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-primary hover:border-primary/30">
                          {t('profile.btn_view_details', 'Xem chi tiết')}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* 3. Reviews Content */}
          <TabsContent value="reviews" className="min-h-[300px] mt-4">
            {myReviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-gray-50 rounded-xl border border-dashed">
                <MessageSquare className="h-12 w-12 mb-3 opacity-20" />
                <p>{t('profile.empty_reviews', 'Bạn chưa viết đánh giá nào')}</p>
              </div>
            ) : (
              <>
                {/* --- GIAO DIỆN MOBILE --- */}
                <div className="md:hidden space-y-3">
                  {myReviews.map((review) => (
                    <div key={review.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      {/* Header Mobile: Avatar nhỏ + Tên */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-3">
                          <div className="h-12 w-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                            <ReviewImage
                              src={review.images && review.images.length > 0 ? review.images[0] : ""}
                              alt="thumb"
                              className="h-full w-full"
                            />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-gray-800 line-clamp-1" onClick={() => navigate(`/restaurant/${review.place_id}`)}>
                              {review.restaurantName || t('common.loading', "Đang tải...")}
                            </h4>
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs font-bold text-gray-700">{review.rating}.0</span>
                              <span className="text-[10px] text-gray-400">• {new Date(review.created_at).toLocaleDateString(i18n.language)}</span>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-gray-300 hover:text-red-500" onClick={(e) => confirmDelete(review.id, "review", e)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg line-clamp-3 italic">
                        "{review.comment}"
                      </p>
                    </div>
                  ))}
                </div>

                {/* --- GIAO DIỆN PC MỚI --- */}
                <div className="hidden md:grid md:grid-cols-2 gap-4">
                  {myReviews.map((review) => (
                    <Card key={review.id} className="group overflow-hidden flex flex-row h-44 hover:shadow-md transition-all border-muted/60">

                      {/* 1. KHUNG ẢNH BÊN TRÁI */}
                      <div className="w-48 h-full shrink-0 relative bg-muted/20 cursor-pointer" onClick={() => navigate(`/restaurant/${review.place_id}`)}>

                        <ReviewImage
                          src={review.images && review.images.length > 0 ? review.images[0] : ""}
                          alt="review-thumb"
                          className="w-full h-full group-hover:scale-105 transition-transform duration-700"
                        />

                        {/* Rating Badge */}
                        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1 text-xs font-bold text-gray-800 z-20">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {review.rating}.0
                        </div>
                      </div>

                      {/* 2. NỘI DUNG BÊN PHẢI */}
                      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4
                              className="font-bold text-base text-gray-900 truncate hover:text-primary cursor-pointer transition-colors"
                              onClick={() => navigate(`/restaurant/${review.place_id}`)}
                              title={review.restaurantName}
                            >
                              {review.restaurantName || t('profile.loading_name', "Đang tải tên quán...")}
                            </h4>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 -mr-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-full"
                              onClick={(e) => confirmDelete(review.id, "review", e)}
                              title="Xóa đánh giá"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(review.created_at).toLocaleDateString(i18n.language)}</span>
                            {review.restaurantAddress && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[150px]" title={review.restaurantAddress}>{review.restaurantAddress}</span>
                              </>
                            )}
                          </div>

                          {/* Nội dung đánh giá */}
                          <div className="relative">
                            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed italic pr-2">
                              "{review.comment}"
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 mt-2 border-t border-gray-100 flex justify-end">
                          <Button
                            variant="link"
                            className="h-auto p-0 text-xs text-primary hover:no-underline flex items-center gap-1"
                            onClick={() => navigate(`/restaurant/${review.place_id}`)}
                          >
                            {t('profile.btn_view_details', 'Xem chi tiết')} <MessageSquare className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
      {/* [NEW] Image Preview Overlay (Lightbox) */}
      {showImagePreview && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-in fade-in duration-200"
          onClick={() => setShowImagePreview(false)} // Click ra ngoài thì đóng
        >
          {/* Nút đóng */}
          <button 
            onClick={() => setShowImagePreview(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Ảnh to */}
          <img 
            src={getOptimizedImageUrl(avatarUrl)} 
            alt="Full Avatar" 
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()} // Click vào ảnh không đóng
          />
        </div>
      )}

      {/* Dialogs */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('profile.dialog_delete_title', 'Xác nhận xóa')}</AlertDialogTitle>
            <AlertDialogDescription>{t('profile.dialog_delete_desc', 'Dữ liệu này sẽ bị xóa vĩnh viễn.')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">{t('common.cancel', 'Hủy')}</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-red-600 rounded-full">{t('profile.btn_delete', 'Xóa')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editingRoute} onOpenChange={(open) => !open && setEditingRoute(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('profile.dialog_rename_title', 'Đổi tên lộ trình')}</DialogTitle>
            <DialogDescription>{t('profile.dialog_rename_desc', 'Đặt tên mới cho chuyến đi.')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">{t('profile.dialog_rename_label', 'Tên mới')}</Label>
              <Input id="name" value={newName} onChange={(e) => setNewName(e.target.value)} className="col-span-3" autoFocus />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRoute(null)}>{t('common.cancel', 'Hủy')}</Button>
            <Button onClick={handleRenameSubmit}>{t('common.save', 'Lưu')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper Icon
const StoreIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" /><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" /><path d="M2 7h20" /><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" /></svg>
)

export default ProfilePage;