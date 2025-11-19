// src/pages/RestaurantDetailPage.tsx

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Restaurant } from "@/types"; // Đảm bảo bạn có file types.ts
import { Loader2, MapPin, Star, DollarSign, Utensils } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

// === THÊM MỚI ===
// Định nghĩa ánh xạ giá tiền ở đây
const priceRangeMap: { [key: number]: string } = {
  1: "1.000đ – 100.000đ",
  2: "100.000đ – 500.000đ",
  3: "500.000đ – 2.000.000đ",
  4: "2.000.000đ trở lên",
};
// ================

const RestaurantDetailPage = () => {
  const { id } = useParams(); // Lấy ID từ URL
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Đây là nơi bạn sẽ gọi API thật để lấy chi tiết nhà hàng bằng ID
    const fetchRestaurantDetails = async () => {
      setIsLoading(true);
      try {
        // TODO: Thay thế bằng API call thật
        // const response = await axios.get(`http://localhost:5000/restaurant/${id}`);
        // setRestaurant(response.data);

        // Mock data cho mục đích demo
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mockRestaurant: Restaurant = {
          id: id || "1",
          place_id: `place_${id}`,
          name: "Nhà hàng Phở Mẫu (Chi tiết)",
          address: "123 Nguyen Hue St, District 1, Ho Chi Minh City",
          rating: 4.5,
          price_level: 2,
          lat: 10.7769,
          lng: 106.7009,
          is_favorite: false,
          photo_url: `https://source.unsplash.com/random/800x600?pho`,
          // Thêm các chi tiết khác nếu có
          description: "Một quán phở truyền thống nổi tiếng với nước dùng đậm đà và thịt bò mềm. Không gian thoáng đãng và phục vụ nhanh nhẹn.",
          phone_number: "0123 456 789",
          website: "https://example.com",
        };
        setRestaurant(mockRestaurant);

      } catch (error) {
        toast.error("Không thể tải chi tiết nhà hàng.");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchRestaurantDetails();
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl text-muted-foreground">Không tìm thấy nhà hàng.</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Ảnh bìa */}
          <div className="h-64 md:h-96 w-full rounded-lg overflow-hidden bg-muted mb-6">
            <img
              src={restaurant.photo_url || 'https://source.unsplash.com/random/1200x800?food'}
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Cột thông tin chính (bên trái) */}
            <div className="lg:col-span-2 space-y-6">
              <h1 className="text-4xl font-bold">{restaurant.name}</h1>
              
              <div className="flex items-center gap-2 text-lg text-muted-foreground">
                <MapPin className="h-5 w-5" />
                <span>{restaurant.address}</span>
              </div>

              <div className="flex items-center gap-6 text-lg">
                {restaurant.rating && (
                  <div className="flex items-center gap-2">
                    <Star className="h-6 w-6 fill-yellow-500 text-yellow-500" />
                    <span className="font-bold">{restaurant.rating}</span>
                  </div>
                )}
                
                {/* === BẮT ĐẦU THAY ĐỔI === */}
                {restaurant.price_level && priceRangeMap[restaurant.price_level] && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {Array.from({ length: restaurant.price_level }).map((_, i) => (
                        <DollarSign key={i} className="h-6 w-6 text-green-600" />
                      ))}
                    </div>
                    <span className="text-base text-muted-foreground font-medium">
                      ({priceRangeMap[restaurant.price_level]})
                    </span>
                  </div>
                )}
                {/* === KẾT THÚC THAY ĐỔI === */}
              </div>

              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4">Giới thiệu</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {restaurant.description || "Chưa có mô tả cho nhà hàng này."}
                </p>
              </Card>
            </div>

            {/* Cột thông tin phụ (bên phải) */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4">Bản đồ</h3>
                <div className="h-48 bg-muted rounded-md flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">(Bản đồ sẽ ở đây)</p>
                </div>
              </Card>
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4">Thông tin liên hệ</h3>
                <div className="space-y-2 text-muted-foreground">
                  <p><strong>Điện thoại:</strong> {restaurant.phone_number || "N/A"}</p>
                  <p><strong>Website:</strong> <a href={restaurant.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{restaurant.website || "N/A"}</a></p>
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