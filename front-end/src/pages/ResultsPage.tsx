import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import RestaurantCard from "@/components/RestaurantCard";
import { Button } from "@/components/ui/button";
import { Restaurant } from "@/types";
import { Route, Loader2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios"; // 1. Import axios

const ResultsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurants, setSelectedRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  // SỬA HÀM NÀY
  const fetchResults = async () => {
    // setIsLoading(true); // Bạn đã có setIsLoading(true) ở đầu rồi, nhưng để ở đây rõ ràng hơn
    try {
      // 1. Lấy (mock) danh sách nhà hàng
      // TODO: Replace with actual API call
      // Mock data for now
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockData: Restaurant[] = [
        {
          id: "1",
          place_id: "place_1",
          name: "Pho 24",
          address: "Phường 4, Quận 1, Ho Chi Minh City",
          rating: 4.5,
          price_level: 2,
          lat: 10.7769,
          lng: 106.7009,
          is_favorite: false, // Giữ nguyên là false
        },
        {
          id: "2",
          place_id: "place_2",
          name: "The Deck Saigon",
          address: "Phường 6, Quận 3, Ho Chi Minh City",
          rating: 4.7,
          price_level: 3,
          lat: 10.794,
          lng: 106.7217,
          is_favorite: false, // Giữ nguyên là false
        },
        {
          id: "3",
          place_id: "place_3",
          name: "Bánh Mì Huỳnh Hoa",
          address: "Phường 2, Quận 3, Ho Chi Minh City",
          rating: 4.6,
          price_level: 1,
          lat: 10.7681,
          lng: 106.689,
          is_favorite: false, // Giữ nguyên là false
        },
      ];

      // 2. Lấy danh sách favorite THỰC TẾ từ backend
      const username = localStorage.getItem("username");
      let favoritePlaceIds = new Set<string>(); // Dùng Set để tra cứu nhanh (O(1))

      if (username) {
        try {
          const response = await axios.get(
            `http://localhost:5000/api/favorite/${username}`
          );
          // Backend trả về: { favorites: ["place_1", "place_3"] }
          if (response.data && Array.isArray(response.data.favorites)) {
            favoritePlaceIds = new Set(response.data.favorites);
          }
        } catch (favError) {
          console.error("Không thể tải danh sách favorites:", favError);
          // Nếu lỗi cũng không sao, chỉ là tim không được tô màu đúng
        }
      }

      // 3. Đồng bộ hóa mockData với danh sách favorite
      // Duyệt qua từng nhà hàng, nếu place_id của nó có trong Set "favoritePlaceIds"
      // thì set is_favorite = true
      const syncedRestaurants = mockData.map((restaurant) => ({
        ...restaurant,
        is_favorite: favoritePlaceIds.has(restaurant.place_id), // Đây là điểm mấu chốt!
      }));

      // 4. Set state với data đã đồng bộ
      setRestaurants(syncedRestaurants);
    } catch (error) {
      console.error("Lỗi tải kết quả:", error); // Log lỗi chi tiết hơn
      toast.error("Failed to load results");
    } finally {
      setIsLoading(false);
    }
  };
  // KẾT THÚC SỬA HÀM

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

  const handleSelectRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurants((prev) => {
      const isSelected = prev.some((r) => r.id === restaurant.id);
      if (isSelected) {
        return prev.filter((r) => r.id !== restaurant.id);
      } else {
        if (prev.length >= 5) {
          toast.error("Maximum 5 restaurants can be selected");
          return prev;
        }
        return [...prev, restaurant];
      }
    });
  };

  const handleOptimizeRoute = () => {
    if (selectedRestaurants.length < 2) {
      toast.error("Please select at least 2 restaurants");
      return;
    }
    
    // --- BẮT ĐẦU THAY ĐỔI ---
    
    // Chọn một ký tự phân tách an toàn (ít khả năng xuất hiện trong tên/địa chỉ)
    const separator = "|||";

    // 1. Lấy ĐỊA CHỈ (address) của nhà hàng
    const placeAddresses = selectedRestaurants.map(r => r.address).join(separator);
    
    // 2. Lấy TÊN (name) của nhà hàng
    const placeNames = selectedRestaurants.map(r => r.name).join(separator);

    // 3. Mã hóa (encode) cả hai chuỗi
    const encodedAddresses = encodeURIComponent(placeAddresses);
    const encodedNames = encodeURIComponent(placeNames);
    
    // 4. Điều hướng với 2 tham số
    navigate(`/optimize?addresses=${encodedAddresses}&names=${encodedNames}`);
    
    // --- KẾT THÚC THAY ĐỔI ---
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Search Results</h1>
            <p className="text-muted-foreground">
              Found {restaurants.length} restaurants matching your preferences
            </p>
          </div>
          
          {selectedRestaurants.length > 0 && (
            <Button
              onClick={handleOptimizeRoute}
              className="bg-hero-gradient hover:opacity-90"
            >
              <Route className="mr-2 h-5 w-5" />
              Optimize Route ({selectedRestaurants.length})
            </Button>
          )}
        </div>

        {selectedRestaurants.length > 0 && (
          <div className="mb-6 p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 Tip: Select 2-5 restaurants to create an optimized route
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              onToggleFavorite={handleToggleFavorite}
              onSelect={handleSelectRestaurant}
              isSelected={selectedRestaurants.some((r) => r.id === restaurant.id)}
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
