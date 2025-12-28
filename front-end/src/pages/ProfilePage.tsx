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
import { Heart, MapPin, Star, User, Edit, Loader2, Trash2, Calendar, Pencil, MessageSquare, Settings, Image as ImageIcon, ExternalLink, Mail } from "lucide-react";
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
  if (url.includes("googleusercontent.com")) {
    const baseUrl = url.split("=")[0];
    return `${baseUrl}=w400-h400-c`;
  }
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
  }, [authUsername, t, i18n.language]);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      toast.error(t('common.login_required', "Bạn cần đăng nhập để xem trang này"));
      navigate("/login");
      return;
    }
    setUsername(authUsername || "User");
    setEmail(authUsername ? `${authUsername}@example.com` : "user@example.com");
    setBio(t('profile.default_bio', "Yêu thích khám phá ẩm thực Việt Nam"));
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
    try {
      // 1. Upload Avatar if selected
      let uploadedAvatarUrl = avatarUrl;
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const uploadRes = await axios.post(`${API_BASE_URL}/api/upload/avatar`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        uploadedAvatarUrl = uploadRes.data.url;
      }

      // 2. Update Profile
      await axios.put(`${API_BASE_URL}/api/profile`, {
        username: username, // Identity
        email: email,
        bio: bio,
        avatar: uploadedAvatarUrl
      });

      // 3. Update Auth Context
      if (username !== authUsername) {
        updateUsername(username);
      }
      updateAvatar(uploadedAvatarUrl); // [NEW] Update global avatar state

      toast.success(t('profile.update_success', "Đã cập nhật hồ sơ"));
      setIsEditing(false);
      fetchProfileData(); // Refresh data
    } catch (error) {
      console.error("Save error:", error);
      toast.error(t('common.error', "Lỗi lưu hồ sơ"));
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

  // [NEW] Helper to get mail provider link
  const getMailProvider = (email: string) => {
    if (!email) return null;
    const lowerEmail = email.toLowerCase();
    if (lowerEmail.includes("@gmail.com")) {
      return { name: "Google Mail", url: "https://mail.google.com", color: "text-red-600 hover:bg-red-50" };
    } else if (lowerEmail.includes("@outlook.com") || lowerEmail.includes("@hotmail.com")) {
      return { name: "Outlook", url: "https://outlook.live.com/mail/", color: "text-blue-600 hover:bg-blue-50" };
    } else if (lowerEmail.includes("@yahoo.com")) {
      return { name: "Yahoo Mail", url: "https://mail.yahoo.com", color: "text-purple-600 hover:bg-purple-50" };
    }
    return null; // Fallback or generic
  };

  const mailProvider = getMailProvider(email);

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
              <Avatar className="h-32 w-32"><AvatarImage src={avatarUrl} /><AvatarFallback className="text-4xl bg-primary/10">{getAvatarFallback()}</AvatarFallback></Avatar>
              <div className="flex-1 text-center md:text-left">
                {isEditing ? (
                  <div className="space-y-4">
                    {/* [NEW] File Input */}
                    <div>
                      <Label htmlFor="avatar-upload" className="cursor-pointer text-sm text-primary hover:underline">
                        {t('profile.change_avatar', "Đổi ảnh đại diện")}
                      </Label>
                      <Input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    </div>
                    <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
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
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-muted-foreground">{email}</p>
                      {mailProvider && (
                        <a
                          href={mailProvider.url}
                          target="_blank"
                          rel="noreferrer"
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-border/50 transition-colors ${mailProvider.color}`}
                          title={`Open ${mailProvider.name}`}
                        >
                          <Mail className="h-3 w-3" />
                          <span className="font-medium hidden sm:inline">{t('profile.open_mail', `Mở ${mailProvider.name}`)}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
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
            <Avatar className="h-24 w-24 border-4 border-white shadow-lg mb-3">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="text-3xl bg-primary/10 text-primary">{getAvatarFallback()}</AvatarFallback>
            </Avatar>

            {isEditing ? (
              <div className="w-full space-y-3 animate-in fade-in zoom-in duration-300">
                {/* [NEW] Mobile File Input */}
                <div className="text-center">
                  <Label htmlFor="avatar-upload-mobile" className="cursor-pointer text-xs text-primary hover:underline block mb-2">
                    {t('profile.change_avatar', "Đổi ảnh đại diện")}
                  </Label>
                  <Input id="avatar-upload-mobile" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </div>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="text-center" />
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="text-center" />
                <div className="flex gap-2">
                  <Button onClick={handleSave} className="flex-1 bg-primary text-white rounded-full">{t('common.save', 'Lưu')}</Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1 rounded-full">{t('common.cancel', 'Hủy')}</Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900">{username}</h1>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <p className="text-sm text-gray-500">{email}</p>
                  {mailProvider && (
                    <a
                      href={mailProvider.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center justify-center p-1 rounded-full transition-colors ${mailProvider.color}`}
                      title={`Open ${mailProvider.name}`}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <p className="text-sm text-center text-gray-600 mb-4 px-4 line-clamp-2">{bio}</p>
                <Button
                  onClick={() => setIsEditing(true)}
                  className="w-full rounded-full bg-gray-900 text-white hover:bg-gray-800 h-10 shadow-md"
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