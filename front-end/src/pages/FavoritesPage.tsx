// src/pages/FavoritesPage.tsx

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import RestaurantCard from "@/components/RestaurantCard";
import { Restaurant } from "@/types";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { API_BASE_URL } from "@/lib/api-config";
// 1. Import hook
import { useTranslation } from 'react-i18next';

const FavoritesPage = () => {
  // 2. Khởi tạo hook
  const { t, i18n } = useTranslation();
  
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
    // Thêm i18n.language vào dependency để fetch lại dữ liệu khi đổi ngôn ngữ
  }, [i18n.language]);

  const fetchFavorites = async () => {
    setIsLoading(true);
    try {
      const username = localStorage.getItem("username");
      if (!username) {
        setIsLoading(false);
        return;
      }

      // Bước 1: Lấy danh sách place_id
      const favResponse = await axios.get(
        `${API_BASE_URL}/api/favorite/${username}`
      );
      const placeIds: string[] = favResponse.data.favorites || [];

      if (placeIds.length === 0) {
        setFavorites([]);
        setIsLoading(false);
        return;
      }

      // Bước 2: Gọi API lấy chi tiết (Có truyền tham số lang)
      const detailPromises = placeIds.map(async (id) => {
        try {
            // Thêm param lang vào request
            const res = await axios.get(`${API_BASE_URL}/api/restaurant/${id}?lang=${i18n.language}`);
            return res.data;
        } catch (error) {
            console.error(`Không tải được chi tiết cho ID: ${id}`, error);
            return null;
        }
      });

      const restaurantsRaw = await Promise.all(detailPromises);

      const validRestaurants = restaurantsRaw
        .filter((r) => r !== null)
        .map((r) => ({ ...r, is_favorite: true }));

      setFavorites(validRestaurants);

    } catch (error) {
      console.error("Lỗi tải favorites:", error);
      toast.error(t('favorite.error_loading', "Không thể tải danh sách yêu thích"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFavorite = async (restaurant: Restaurant) => {
    const username = localStorage.getItem("username");
    if (!username) {
      toast.error(t('common.login_required', "Bạn cần đăng nhập"));
      return;
    }

    const previousFavorites = favorites;
    setFavorites((prev) => prev.filter((f) => f.id !== restaurant.id));

    try {
      await axios.delete(`${API_BASE_URL}/api/favorite`, {
        data: {
          username: username,
          place_id: restaurant.place_id,
        },
      });
      // Dùng interpolate {{name}} để truyền tên động vào text
      toast.success(t('favorite.removed_success', { 
          name: restaurant.name, 
          defaultValue: `Đã xóa ${restaurant.name} khỏi yêu thích` 
      }));

    } catch (error) {
      console.error("Lỗi xóa favorite:", error);
      toast.error(t('favorite.remove_fail', "Xóa thất bại, đang hoàn tác..."));
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
            {t('favorite.title', 'Danh Sách Yêu Thích')}
          </h1>
          <p className="text-muted-foreground">
            {t('favorite.subtitle', 'Những quán ăn bạn đã lưu lại')}
          </p>
        </div>

        {favorites.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                onToggleFavorite={handleRemoveFavorite}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Heart className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">
              {t('favorite.empty_list', 'Bạn chưa có quán yêu thích nào. Hãy tìm kiếm và thêm vào nhé!')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;