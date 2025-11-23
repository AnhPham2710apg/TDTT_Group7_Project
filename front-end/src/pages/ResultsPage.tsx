import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import RestaurantCard from "@/components/RestaurantCard";
import { Button } from "@/components/ui/button";
import { Restaurant } from "@/types";
import { Route, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import axios from "axios"; // 1. Import axios

const ResultsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchResults = async () => {
    setIsLoading(true);
    try {
      // 1. Lấy Query String trực tiếp từ URL hiện tại
      // searchParams.toString() sẽ trả về dạng "keyword=pho&cuisine=viet..."
      const queryString = searchParams.toString();

      // 2. Gọi API Search của Backend
      const response = await axios.get(`http://localhost:5000/api/search?${queryString}`);
      const apiResults: Restaurant[] = response.data;

      // 3. (Optional) Đồng bộ với Favorites như code cũ của bạn
      const username = localStorage.getItem("username");
      let favoritePlaceIds = new Set<string>();
      
      if (username) {
         try {
            const favRes = await axios.get(`http://localhost:5000/api/favorite/${username}`);
            favoritePlaceIds = new Set(favRes.data.favorites);
         } catch(e) {
            console.error("Error fetching favorites:", e);
         }
      }

      const syncedResults = apiResults.map(r => ({
          ...r,
          is_favorite: favoritePlaceIds.has(r.place_id)
      }));

      setRestaurants(syncedResults);

    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Không tìm thấy kết quả phù hợp.");
      setRestaurants([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchResults();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Re-fetch khi URL thay đổi

  // === BẮT ĐẦU SỬA HÀM NÀY ===
  const handleToggleFavorite = async (restaurant: Restaurant) => {
    
    // 2. Lấy username (Giả sử bạn lưu username sau khi login)
    // Bạn nên dùng Context, nhưng localStorage là ví dụ đơn giản
    const username = localStorage.getItem("username"); 
    
    if (!username) {
      toast.error("Bạn cần đăng nhập để thực hiện việc này");
      return; 
    }

    // 3. Quyết định API sẽ gọi (POST để thêm, DELETE để xóa)
    const isCurrentlyFavorite = restaurant.is_favorite;
    const method = isCurrentlyFavorite ? "delete" : "post";
    const url = "http://localhost:5000/api/favorite";
    const data = {
      username: username,
      place_id: restaurant.place_id // Dùng place_id (ví dụ: "place_1")
    };

    try {
      // 4. Cập nhật trạng thái giao diện NGAY LẬP TỨC (Optimistic Update)
      // Điều này giúp người dùng thấy tim đổi màu ngay
      setRestaurants(
        restaurants.map((r) =>
          r.id === restaurant.id ? { ...r, is_favorite: !r.is_favorite } : r
        )
      );

      // 5. Gọi API
      if (method === "post") {
        await axios.post(url, data);
        toast.success("Đã thêm vào yêu thích!");
      } else {
        await axios.delete(url, { data: data }); // Lưu ý: axios.delete gửi data trong { data: ... }
        toast.success("Đã xóa khỏi yêu thích");
      }

    } catch (error: unknown) {
      console.error("Lỗi cập nhật favorite:", error);
      toast.error("Cập nhật thất bại");
      
      // 6. Hoàn tác lại nếu có lỗi
      setRestaurants(
        restaurants.map((r) =>
          r.id === restaurant.id ? { ...r, is_favorite: isCurrentlyFavorite } : r
        )
      );
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
        <div className="mb-8 flex items-center justify-between">
          {/* Tiêu đề */}
          <div>
          <h1 className="text-3xl font-bold mb-2">Kết quả tìm kiếm</h1>
          <p className="text-muted-foreground">Tìm thấy {restaurants.length} quán.</p>
          </div>
          
          {/* Nút hành động */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/search")}>
              <Search className="mr-2 h-4 w-4" /> Tìm kiếm khác
            </Button>
            {/* Dẫn người dùng vào Cart để tối ưu */}
            <Button onClick={() => navigate("/cart")} className="bg-primary/90">
              Xem danh sách đã chọn
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              onToggleFavorite={handleToggleFavorite}
              // Không truyền onSelect, isSelected nữa
            />
          ))}
        </div>

        {restaurants.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No restaurants found. Try adjusting your search criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsPage;
