// src/pages/FavoritesPage.tsx

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import RestaurantCard from "@/components/RestaurantCard";
import { Restaurant } from "@/types";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const FavoritesPage = () => {
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    setIsLoading(true);
    try {
      const username = localStorage.getItem("username");
      if (!username) {
        // Nếu chưa đăng nhập, dừng lại
        setIsLoading(false);
        return;
      }

      // Bước 1: Lấy danh sách place_id (VD: ["place_1", "place_5"])
      const favResponse = await axios.get(
        `http://localhost:5000/api/favorite/${username}`
      );
      const placeIds: string[] = favResponse.data.favorites || [];

      if (placeIds.length === 0) {
        setFavorites([]);
        setIsLoading(false);
        return;
      }

      // Bước 2: Từ place_id, gọi API lấy chi tiết từng nhà hàng
      // Chúng ta dùng Promise.all để gọi nhiều request cùng lúc
      const detailPromises = placeIds.map(async (id) => {
        try {
            // Gọi vào API chi tiết nhà hàng bạn đã có
            const res = await axios.get(`http://localhost:5000/api/restaurant/${id}`);
            return res.data;
        } catch (error) {
            console.error(`Không tải được chi tiết cho ID: ${id}`, error);
            return null; // Trả về null nếu lỗi
        }
      });

      // Chờ tất cả request hoàn thành
      const restaurantsRaw = await Promise.all(detailPromises);

      // Lọc bỏ những cái bị null và gán is_favorite = true
      const validRestaurants = restaurantsRaw
        .filter((r) => r !== null)
        .map((r) => ({ ...r, is_favorite: true }));

      setFavorites(validRestaurants);

    } catch (error) {
      console.error("Lỗi tải favorites:", error);
      toast.error("Không thể tải danh sách yêu thích");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFavorite = async (restaurant: Restaurant) => {
    const username = localStorage.getItem("username");
    if (!username) {
      toast.error("Bạn cần đăng nhập");
      return;
    }

    // 1. Optimistic Update (Cập nhật giao diện trước cho mượt)
    const previousFavorites = favorites;
    setFavorites((prev) => prev.filter((f) => f.id !== restaurant.id));

    // 2. Gọi API Xóa
    try {
      await axios.delete("http://localhost:5000/api/favorite", {
        data: {
          username: username,
          place_id: restaurant.place_id, // Lưu ý dùng place_id
        },
      });
      toast.success(`Đã xóa ${restaurant.name} khỏi yêu thích`);
    } catch (error) {
      console.error("Lỗi xóa favorite:", error);
      toast.error("Xóa thất bại, đang hoàn tác...");
      // Rollback nếu lỗi
      setFavorites(previousFavorites);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Heart className="h-8 w-8 text-red-500 fill-red-500" />
            Danh Sách Yêu Thích
          </h1>
          <p className="text-muted-foreground">
            Những quán ăn bạn đã lưu lại
          </p>
        </div>

        {favorites.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                // Truyền hàm xử lý xóa vào
                onToggleFavorite={handleRemoveFavorite}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Heart className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">
              Bạn chưa có quán yêu thích nào. Hãy tìm kiếm và thêm vào nhé!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;