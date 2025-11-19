// src/pages/ProfilePage.tsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// 1. Xóa 'Loader2' nếu bạn không dùng màn hình loading (đã xóa ở dưới)
import { Heart, MapPin, Star, User, Edit, Loader2 } from "lucide-react"; 
import RestaurantCard from "@/components/RestaurantCard";
import { Restaurant } from "@/types";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
// 2. Xóa import 'motion'
// import { motion } from "framer-motion"; 

// Định nghĩa kiểu Route
interface MockRoute {
  id: string;
  name: string;
  restaurantCount: number;
  createdAt: string;
}

const ProfilePage = () => {
  const navigate = useNavigate();
  // 3. Xóa 'isLoading' nếu bạn không muốn màn hình loading
  //    Nhưng tôi sẽ giữ lại logic 'isLoading' vì nó quan trọng để sửa lỗi reload
  const { isLoggedIn, username: authUsername, updateUsername, isLoading } = useAuth();
  
  // (State local giữ nguyên)
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [stats] = useState({ favorites: 1, routes: 0, reviews: 8 });
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  const [routes, setRoutes] = useState<MockRoute[]>([]);

  // 4. Xóa toàn bộ định nghĩa hiệu ứng (variants)

  // useEffect (giữ nguyên logic xử lý isLoading)
  useEffect(() => {
    if (isLoading) {
      return;
    }
    
    if (!isLoading && !isLoggedIn) { 
      toast.error("Bạn cần đăng nhập để xem trang này");
      navigate("/login");
      return;
    }
    
    setUsername(authUsername || "User");
    setEmail(authUsername ? `${authUsername}@example.com` : "user@example.com");
    setBio("Yêu thích khám phá ẩm thực Việt Nam và các món ăn chay");
    
    // Tải mock data
    setFavorites([
      { id: "1", place_id: "place_1", name: "Quán Chay Hương Sen", address: "123 Đường Nguyễn Huệ, Quận 1", rating: 4.5, price_level: 2, photo_url: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe", lat: 0, lng: 0, is_favorite: true },
      { id: "2", place_id: "place_2", name: "Phở Hà Nội", address: "456 Đường Lê Lợi, Quận 1", rating: 4.8, price_level: 1, photo_url: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43", lat: 0, lng: 0, is_favorite: true }
    ]);
    setRoutes([
      { id: "1", name: "Food Tour Quận 1", restaurantCount: 5, createdAt: "2024-01-15" },
      { id: "2", name: "Chợ Bến Thành Tour", restaurantCount: 4, createdAt: "2024-01-20" },
      { id: "3", name: "Chay Tour", restaurantCount: 3, createdAt: "2024-02-01" }
    ]);

  }, [isLoggedIn, authUsername, isLoading, navigate]);

  const handleSave = () => {
    updateUsername(username); 
    toast.success("Đã cập nhật hồ sơ (demo)");
    setIsEditing(false);
  };

  const handleToggleFavorite = (toggledRestaurant: Restaurant) => {
    setFavorites(prevFavorites => 
      prevFavorites.filter(fav => fav.id !== toggledRestaurant.id)
    );
    toast.success(`Đã xóa ${toggledRestaurant.name} khỏi yêu thích (demo)`);
  };

  const getAvatarFallback = () => {
    return username ? username.charAt(0).toUpperCase() : <User className="h-12 w-12" />;
  };

  // Màn hình Loading (vẫn nên giữ lại)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        {/* 5. Xóa 'overflow-hidden' */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            {/* 6. Xóa thẻ 'motion.div' và props 'variants', 'initial', 'whileInView' */}
            <div 
              className="flex flex-col md:flex-row items-center md:items-start gap-6"
            >
              {/* 7. Xóa thẻ 'motion.div' bọc Avatar */}
              <div>
                <Avatar className="h-32 w-32">
                  <AvatarImage src={avatarUrl} alt={username} />
                  <AvatarFallback className="text-4xl bg-primary/10">
                    {getAvatarFallback()}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              {/* 8. Xóa thẻ 'motion.div' bọc nội dung */}
              <div className="flex-1 text-center md:text-left">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="username">Tên người dùng</Label>
                      <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Giới thiệu ngắn..." rows={3} />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSave}>Lưu</Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>Hủy</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-3xl font-bold mb-2">{username}</h1>
                    <p className="text-muted-foreground mb-2">{email}</p>
                    <p className="text-foreground mb-4">{bio}</p>
                    <Button onClick={() => setIsEditing(true)} className="gap-2">
                      <Edit className="h-4 w-4" />
                      Chỉnh sửa hồ sơ
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        {/* 9. Xóa 'motion.div' bọc grid */}
        <div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          {/* 10. Xóa 'motion.div' bọc Card */}
          <div>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Heart className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{stats.favorites}</p>
                    <p className="text-muted-foreground">Favorites</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{stats.routes}</p>
                    <p className="text-muted-foreground">Routes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Star className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{stats.reviews}</p>
                    <p className="text-muted-foreground">Reviews</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="favorites" className="w-full">
          {/* 11. Xóa 'motion.div' bọc TabsList */}
          <div>
            <TabsList className="w-full justify-start rounded-3xl h-13 p-2">
              <TabsTrigger value="favorites" className="rounded-2xl text-base">
                Quán yêu thích
              </TabsTrigger>
              <TabsTrigger value="routes" className="rounded-2xl text-base">
                Lộ trình đã tạo
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="favorites" className="mt-6 min-h-[400px]">
            {/* 12. Xóa 'motion.div' bọc grid */}
            <div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {favorites.map((restaurant) => (
                // 13. Xóa 'motion.div' bọc RestaurantCard
                <div key={restaurant.id}>
                  <RestaurantCard
                    restaurant={restaurant}
                    onToggleFavorite={handleToggleFavorite}
                  />
                </div>
              ))}
            </div>
            {favorites.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Chưa có quán yêu thích nào</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="routes" className="mt-6 min-h-[400px]">
            {/* 14. Xóa 'motion.div' bọc danh sách */}
            <div 
              className="space-y-4"
            >
              {routes.map((route) => (
                // 15. Xóa 'motion.div' bọc Card
                <div key={route.id}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{route.name}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate("/optimize")} 
                        >
                          Xem chi tiết
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-6 text-sm text-muted-foreground">
                        <span>🍽 {route.restaurantCount} quán</span>
                        <span>📅 {new Date(route.createdAt).toLocaleDateString("vi-VN")}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
            {routes.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Chưa có lộ trình nào</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ProfilePage;