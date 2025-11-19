/* eslint-disable react-hooks/exhaustive-deps */
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

  // === BẮT ĐẦU SỬA HÀM NÀY ===

  // Tạm thời định nghĩa "master list" nhà hàng ở đây
  // Trong một app thật, bạn sẽ gọi một API khác để lấy chi tiết
  const ALL_MOCK_RESTAURANTS: Restaurant[] = [
    {
      id: "1",
      place_id: "place_1",
      name: "Pho 24",
      address: "123 Nguyen Hue St, District 1",
      rating: 4.5,
      price_level: 2,
      lat: 10.7769,
      lng: 106.7009,
      is_favorite: false,
    },
    {
      id: "2",
      place_id: "place_2",
      name: "The Deck Saigon",
      address: "38 Nguyen U Di St, District 2",
      rating: 4.7,
      price_level: 3,
      lat: 10.794,
      lng: 106.7217,
      is_favorite: false,
    },
    {
      id: "3",
      place_id: "place_3",
      name: "Bánh Mì Huỳnh Hoa",
      address: "26 Le Thi Rieng St, District 1",
      rating: 4.6,
      price_level: 1,
      lat: 10.7681,
      lng: 106.689,
      is_favorite: false,
    },
  ];

  const fetchFavorites = async () => {
    // setIsLoading(true); // Đã có ở useEffect
    try {
      // 1. Lấy username
      const username = localStorage.getItem("username");
      if (!username) {
        toast.error("Bạn cần đăng nhập để xem danh sách yêu thích");
        setIsLoading(false);
        return;
      }

      // 2. Gọi API để lấy danh sách place_id yêu thích
      const response = await axios.get(
        `http://localhost:5000/api/favorite/${username}`
      );

      // 3. Lấy danh sách ID (VD: ["place_1", "place_3"])
      const favoritePlaceIds = new Set<string>(response.data.favorites || []);

      // 4. Lọc "master list" để lấy chi tiết nhà hàng
      const favoriteRestaurants = ALL_MOCK_RESTAURANTS.filter(
        (restaurant) => favoritePlaceIds.has(restaurant.place_id)
      ).map((restaurant) => ({
        ...restaurant,
        is_favorite: true, // Vì đây là trang favorite, nó luôn là true
      }));

      setFavorites(favoriteRestaurants);
    } catch (error) {
      console.error("Lỗi tải favorites:", error);
      toast.error("Failed to load favorites");
    } finally {
      setIsLoading(false);
    }
  };
// === KẾT THÚC SỬA HÀM NÀY ===

  // === BẮT ĐẦU SỬA HÀM NÀY ===
  const handleRemoveFavorite = async (restaurant: Restaurant) => {
    // 1. Lấy username
    const username = localStorage.getItem("username");
    if (!username) {
      toast.error("Bạn cần đăng nhập để thực hiện việc này");
      return;
    }

    // 2. Lưu lại state cũ để "hoàn tác" nếu API lỗi
    const oldFavorites = favorites;

    // 3. Cập nhật Giao diện ngay lập tức (Optimistic Update)
    //    Xóa nhà hàng này khỏi danh sách trên UI
    setFavorites(oldFavorites.filter((f) => f.id !== restaurant.id));

    // 4. Gọi API DELETE
    try {
      await axios.delete("http://localhost:5000/api/favorite", {
        data: {
          username: username,
          place_id: restaurant.place_id, // Gửi place_id
        },
      });
      toast.success("Đã xóa khỏi yêu thích");
    } catch (error) {
      console.error("Lỗi khi xóa favorite:", error);
      toast.error("Xóa thất bại, vui lòng thử lại");

      // 5. Hoàn tác lại (Rollback)
      //    Nếu API lỗi, trả lại danh sách như cũ
      setFavorites(oldFavorites);
    }
  };
  // === KẾT THÚC SỬA HÀM NÀY ===

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
            My Favorites
          </h1>
          <p className="text-muted-foreground">
            Your collection of favorite restaurants
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
              No favorites yet. Start exploring and save your favorite restaurants!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;
