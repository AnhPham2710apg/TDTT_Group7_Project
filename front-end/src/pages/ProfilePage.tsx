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
// Thêm MessageSquare vào import
import { Heart, MapPin, Star, User, Edit, Loader2, Trash2, Calendar, Pencil, MessageSquare } from "lucide-react"; 
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

// Interface Lộ trình
interface RouteHistoryItem {
  id: number;
  name: string;
  start_point: string;
  places: { name: string; address: string; lat: number; lng: number }[];
  created_at: string;
}

// Interface Review của User (Mở rộng thêm restaurantName để hiển thị)
interface UserReviewItem {
    id: number;
    place_id: string;
    rating: number;
    comment: string;
    images: string[];
    created_at: string;
    restaurantName?: string; // Field này sẽ được điền sau khi fetch info quán
    restaurantAddress?: string;
}

const ProfilePage = () => {
  const navigate = useNavigate();
  const { isLoggedIn, username: authUsername, updateUsername, isLoading: authLoading } = useAuth();
  
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  
  // Data
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  const [routes, setRoutes] = useState<RouteHistoryItem[]>([]);
  const [myReviews, setMyReviews] = useState<UserReviewItem[]>([]); // State mới cho Reviews
  
  const [isLoadingData, setIsLoadingData] = useState(false);

  // State xử lý xóa (Dùng chung cho cả Route và Review)
  const [deleteType, setDeleteType] = useState<"route" | "review" | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // State đổi tên lộ trình
  const [editingRoute, setEditingRoute] = useState<{id: number, name: string} | null>(null);
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

        // 1. Lấy Favorites
        const favRes = await axios.get(`http://localhost:5000/api/favorite/${currentUsername}`);
        const favIds: string[] = favRes.data.favorites || [];
        const favPromises = favIds.map(id => axios.get(`http://localhost:5000/api/restaurant/${id}`).catch(() => null));
        const favResults = await Promise.all(favPromises);
        setFavorites(favResults.filter(r => r?.data).map(r => ({...r?.data, is_favorite: true})));

        // 2. Lấy Routes
        const routeRes = await axios.get(`http://localhost:5000/api/routes/${currentUsername}`);
        setRoutes(routeRes.data);

        // 3. Lấy Reviews (MỚI)
        const reviewRes = await axios.get(`http://localhost:5000/api/user/${currentUsername}/reviews`);
        const reviewsData: UserReviewItem[] = reviewRes.data;

        // Để hiển thị tên quán, ta cần fetch info quán dựa trên place_id của review
        // (Cách này hơi tốn request nếu nhiều review, nhưng với MVP thì ok)
        // Tối ưu hơn: Backend nên trả về tên quán trong API review luôn (cần join bảng).
        const reviewPromises = reviewsData.map(async (review) => {
            try {
                const restRes = await axios.get(`http://localhost:5000/api/restaurant/${review.place_id}`);
                return { 
                    ...review, 
                    restaurantName: restRes.data.name,
                    restaurantAddress: restRes.data.address
                };
            } catch (e) {
                return { ...review, restaurantName: "Nhà hàng không tồn tại" };
            }
        });
        
        const enrichedReviews = await Promise.all(reviewPromises);
        setMyReviews(enrichedReviews);

    } catch (error) {
        console.error("Lỗi tải profile data:", error);
    } finally {
        setIsLoadingData(false);
    }
  }, [authUsername]);

  useEffect(() => {
    if (authLoading) return;
    
    if (!isLoggedIn) { 
      toast.error("Bạn cần đăng nhập để xem trang này");
      navigate("/login");
      return;
    }
    
    setUsername(authUsername || "User");
    setEmail(authUsername ? `${authUsername}@example.com` : "user@example.com");
    setBio("Yêu thích khám phá ẩm thực Việt Nam");

    fetchProfileData(); 

  }, [isLoggedIn, authUsername, authLoading, navigate, fetchProfileData]);

  

  const handleSave = () => {
    updateUsername(username); 
    toast.success("Đã cập nhật hồ sơ");
    setIsEditing(false);
  };

  const handleRemoveFavorite = async (restaurant: Restaurant) => {
    /* Logic xóa favorite giữ nguyên */
    const currentUsername = authUsername || localStorage.getItem("username");
    if(!currentUsername) return;
    const oldFavs = favorites;
    setFavorites(prev => prev.filter(f => f.id !== restaurant.id));
    try {
        await axios.delete("http://localhost:5000/api/favorite", {
            data: { username: currentUsername, place_id: restaurant.place_id }
        });
        toast.success("Đã xóa khỏi yêu thích");
    } catch (error) {
        toast.error("Lỗi khi xóa");
        setFavorites(oldFavs);
    }
  };

  const handleViewRoute = (route: RouteHistoryItem) => {
    /* Logic view route giữ nguyên */
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

  // --- LOGIC XÓA CHUNG (ROUTE & REVIEW) ---
  const confirmDelete = (id: number, type: "route" | "review", event: React.MouseEvent) => {
    event.stopPropagation();
    setDeleteId(id);
    setDeleteType(type);
  };

  const executeDelete = async () => {
    if (!deleteId || !deleteType) return;

    try {
      if (deleteType === "route") {
          await axios.delete(`http://localhost:5000/api/routes/${deleteId}`);
          setRoutes((prev) => prev.filter((r) => r.id !== deleteId));
          toast.success("Đã xóa lộ trình!");
      } else {
          await axios.delete(`http://localhost:5000/api/reviews/${deleteId}`);
          setMyReviews((prev) => prev.filter((r) => r.id !== deleteId));
          toast.success("Đã xóa bài đánh giá!");
      }
    } catch (error) {
      console.error("Lỗi xóa:", error);
      toast.error("Có lỗi xảy ra khi xóa.");
    } finally {
      setDeleteId(null);
      setDeleteType(null);
    }
  };

  // Logic Rename Route giữ nguyên
  const openRenameDialog = (route: RouteHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRoute({ id: route.id, name: route.name });
    setNewName(route.name);
  };

  const handleRenameSubmit = async () => {
    if (!editingRoute || !newName.trim()) return;
    try {
        await axios.put(`http://localhost:5000/api/routes/${editingRoute.id}`, { name: newName });
        setRoutes(prev => prev.map(r => r.id === editingRoute.id ? { ...r, name: newName } : r));
        toast.success("Đổi tên thành công!");
        setEditingRoute(null);
    } catch (error) {
        toast.error("Lỗi khi đổi tên");
    }
  };

  const getAvatarFallback = () => {
    return username ? username.charAt(0).toUpperCase() : <User className="h-12 w-12" />;
  };

  if (authLoading || isLoadingData) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {/* Header Profile giữ nguyên */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            {/* ... (Code UI Profile Header cũ) ... */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <Avatar className="h-32 w-32"><AvatarImage src={avatarUrl} /><AvatarFallback className="text-4xl bg-primary/10">{getAvatarFallback()}</AvatarFallback></Avatar>
              <div className="flex-1 text-center md:text-left">
                {isEditing ? (
                  <div className="space-y-4">
                    <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
                    <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" />
                    <div className="flex gap-2"><Button onClick={handleSave}>Lưu</Button><Button variant="outline" onClick={() => setIsEditing(false)}>Hủy</Button></div>
                  </div>
                ) : (
                  <><h1 className="text-3xl font-bold mb-2">{username}</h1><p className="text-muted-foreground mb-2">{email}</p><p className="text-foreground mb-4">{bio}</p><Button onClick={() => setIsEditing(true)} className="gap-2"><Edit className="h-4 w-4" /> Chỉnh sửa</Button></>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           {/* ... (Stats Card 1, 2 giữ nguyên) ... */}
           <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 rounded-full bg-primary/10"><Heart className="h-6 w-6 text-primary" /></div><div><p className="text-3xl font-bold">{stats.favorites}</p><p className="text-muted-foreground">Yêu thích</p></div></div></CardContent></Card>
           <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 rounded-full bg-primary/10"><MapPin className="h-6 w-6 text-primary" /></div><div><p className="text-3xl font-bold">{stats.routes}</p><p className="text-muted-foreground">Lộ trình</p></div></div></CardContent></Card>
           <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 rounded-full bg-primary/10"><Star className="h-6 w-6 text-primary" /></div><div><p className="text-3xl font-bold">{stats.reviews}</p><p className="text-muted-foreground">Đánh giá</p></div></div></CardContent></Card>
        </div>

        {/* TABS CHÍNH */}
        <Tabs defaultValue="favorites" className="w-full">
          <TabsList className="w-full justify-start rounded-3xl h-13 p-2 mb-6 bg-muted/50">
            <TabsTrigger value="favorites" className="rounded-2xl text-base">Quán yêu thích</TabsTrigger>
            <TabsTrigger value="routes" className="rounded-2xl text-base">Lộ trình</TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-2xl text-base">Lịch sử đánh giá</TabsTrigger>
          </TabsList>

          {/* 1. Favorites Content */}
          <TabsContent value="favorites" className="min-h-[400px]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((restaurant) => (
                <div key={restaurant.id}><RestaurantCard restaurant={restaurant} onToggleFavorite={handleRemoveFavorite} /></div>
              ))}
            </div>
            {favorites.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground">Chưa có quán yêu thích nào</CardContent></Card>}
          </TabsContent>

          {/* 2. Routes Content */}
          <TabsContent value="routes" className="min-h-[400px]">
            <div className="space-y-4">
              {routes.map((route) => (
                <Card key={route.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="truncate mr-2 font-medium">{route.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="ghost" size="icon" onClick={(e) => openRenameDialog(route, e)}><Pencil className="h-4 w-4 text-blue-500" /></Button>
                        <Button variant="outline" size="sm" onClick={() => handleViewRoute(route)} className="text-xs h-8">Xem lại</Button>
                        <Button variant="ghost" size="icon" onClick={(e) => confirmDelete(route.id, "route", e)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 text-sm text-muted-foreground mb-1">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {route.places.length} điểm</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(route.created_at).toLocaleDateString("vi-VN")}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate border-t pt-2 mt-1 border-dashed">Xuất phát: {route.start_point}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            {routes.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground">Chưa có lộ trình nào</CardContent></Card>}
          </TabsContent>

          {/* 3. Reviews Content (MỚI) */}
          <TabsContent value="reviews" className="min-h-[400px]">
            <div className="space-y-4">
                {myReviews.map((review) => (
                    <Card key={review.id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2 bg-gray-50/50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 
                                        className="font-bold text-lg text-primary hover:underline cursor-pointer"
                                        onClick={() => navigate(`/restaurant/${review.place_id}`)}
                                    >
                                        {review.restaurantName || "Đang tải tên quán..."}
                                    </h4>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                        <MapPin className="h-3 w-3" /> {review.restaurantAddress || "..."}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex bg-yellow-50 px-2 py-1 rounded-full border border-yellow-100">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Star key={i} className={`h-3 w-3 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                                        ))}
                                    </div>
                                    <Button 
                                        variant="ghost" size="icon" 
                                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                        onClick={(e) => confirmDelete(review.id, "review", e)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <p className="text-gray-700 text-sm whitespace-pre-wrap mb-3">
                                <MessageSquare className="h-3 w-3 inline mr-1 text-gray-400" />
                                {review.comment}
                            </p>
                            
                            {/* Ảnh Review */}
                            {review.images && review.images.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {review.images.map((img, idx) => (
                                        <img 
                                            key={idx} src={img} alt="review" 
                                            className="h-16 w-16 object-cover rounded-md border cursor-pointer hover:opacity-90"
                                            onClick={() => window.open(img, '_blank')}
                                        />
                                    ))}
                                </div>
                            )}
                            
                            <div className="text-xs text-gray-400 mt-2 border-t pt-2 flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> 
                                Đăng ngày {new Date(review.created_at).toLocaleDateString("vi-VN")}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            {myReviews.length === 0 && (
                <Card><CardContent className="py-12 text-center text-muted-foreground">Bạn chưa viết đánh giá nào.</CardContent></Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialog Xóa Chung */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Dữ liệu sẽ bị xóa vĩnh viễn khỏi hồ sơ của bạn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="hover:bg-gray/90 hover:text-green-600">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-red-600 hover:bg-red-700 text-white">
                Xóa ngay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Đổi tên Route */}
      <Dialog open={!!editingRoute} onOpenChange={(open) => !open && setEditingRoute(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Đổi tên lộ trình</DialogTitle><DialogDescription>Đặt tên mới cho chuyến đi.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Tên mới</Label>
              <Input id="name" value={newName} onChange={(e) => setNewName(e.target.value)} className="col-span-3" autoFocus />
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditingRoute(null)}>Hủy</Button><Button onClick={handleRenameSubmit}>Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;