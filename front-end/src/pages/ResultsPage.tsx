import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import RestaurantCard from "@/components/RestaurantCard";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Restaurant } from "@/types";
import { 
  Search, Loader2, 
  ArrowUp, ArrowDown, 
  Star, DollarSign, 
  ListFilter 
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { API_BASE_URL } from "@/lib/api-config";

const ResultsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Data States
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sorting States
  const [sortBy, setSortBy] = useState<"price" | "rating" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc"); 

  // Fetch Data
  const fetchResults = async () => {
    setIsLoading(true);
    try {
      const queryString = searchParams.toString();
      const response = await axios.get(`${API_BASE_URL}/api/search?${queryString}`);
      const apiResults: Restaurant[] = response.data;

      const username = localStorage.getItem("username");
      let favoritePlaceIds = new Set<string>();
      
      if (username) {
         try {
            const favRes = await axios.get(`${API_BASE_URL}/api/favorite/${username}`);
            favoritePlaceIds = new Set(favRes.data.favorites);
         } catch(e) { console.error(e); }
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
  }, [searchParams]);

  // Logic sắp xếp
  const sortedRestaurants = useMemo(() => {
    if (!sortBy) return restaurants; 

    return [...restaurants].sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortBy === "price") {
        valA = a.price_level || 0;
        valB = b.price_level || 0;
      } else {
        valA = a.rating || 0;
        valB = b.rating || 0;
      }

      if (sortOrder === "asc") {
        return valA - valB;
      } else {
        return valB - valA;
      }
    });
  }, [restaurants, sortBy, sortOrder]);

  const toggleOrder = () => {
    setSortOrder(prev => prev === "asc" ? "desc" : "asc");
  };

  const handleToggleFavorite = async (restaurant: Restaurant) => {
    const username = localStorage.getItem("username"); 
    if (!username) { toast.error("Bạn cần đăng nhập"); return; }

    const isCurrentlyFavorite = restaurant.is_favorite;
    const method = isCurrentlyFavorite ? "delete" : "post";
    const url = `${API_BASE_URL}/api/favorite`;
    const data = { username: username, place_id: restaurant.place_id };

    try {
      setRestaurants(prev => prev.map(r => r.id === restaurant.id ? { ...r, is_favorite: !r.is_favorite } : r));
      if (method === "post") {
        await axios.post(url, data);
        toast.success("Đã thêm vào yêu thích!");
      } else {
        await axios.delete(url, { data: data });
        toast.success("Đã xóa khỏi yêu thích");
      }
    } catch (error) {
      setRestaurants(prev => prev.map(r => r.id === restaurant.id ? { ...r, is_favorite: isCurrentlyFavorite } : r));
      toast.error("Lỗi cập nhật");
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
        
        {/* HEADER TOOLBAR */}
        {/* items-end: Căn đáy các phần tử con để text và nút thẳng hàng dưới */}
        <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          
          {/* NHÓM TRÁI: Tiêu đề + Nút Sắp Xếp */}
          {/* items-end: Căn đáy cho tiêu đề và nút sắp xếp */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            
            {/* Khối Tiêu đề */}
            <div>
              <h1 className="text-3xl font-bold mb-1 leading-none">Kết quả tìm kiếm</h1>
              <p className="text-muted-foreground text-sm">
                Tìm thấy <span className="font-medium text-foreground">{restaurants.length}</span> quán phù hợp.
              </p>
            </div>

            {/* Khối Nút Sắp Xếp */}
            <div 
                // 🟢 1. CĂN CHỈNH NÚT SẮP XẾP Ở ĐÂY
                // mb-1: Đẩy nút lên 4px so với đáy
                // mb-0: Sát đáy
                // -mb-1: Đẩy xuống 4px
                className="flex items-center bg-white rounded-lg p-1 border border-border self-start sm:self-auto mb-0.5"
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-primary hover:bg-gray/90">
                    <ListFilter className="h-4 w-4" />
                    <span className="font-medium">
                      {sortBy === "price" ? "Giá cả" : sortBy === "rating" ? "Đánh giá" : "Sắp xếp"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuItem onClick={() => { setSortBy("rating"); setSortOrder("desc"); }} className="cursor-pointer focus:bg-gray/90 focus:text-primary">
                    <Star className="mr-2 h-4 w-4 text-yellow-500" /> Đánh giá
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy("price"); setSortOrder("asc"); }} className="cursor-pointer focus:bg-gray/90 focus:text-primary">
                    <DollarSign className="mr-2 h-4 w-4 text-green-600" /> Giá cả
                  </DropdownMenuItem>
                  {sortBy && (
                    <>
                        <DropdownMenuItem onClick={() => setSortBy(null)} className="text-muted-foreground border-t mt-1 cursor-pointer focus:bg-gray/90 focus:text-primary">
                            Mặc định
                        </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {sortBy && (
                <>
                  <div className="w-[1px] h-4 bg-border mx-1"></div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 hover:bg-background rounded-md"
                    onClick={toggleOrder}
                    title={sortOrder === "asc" ? "Tăng dần" : "Giảm dần"}
                  >
                    {sortOrder === "asc" ? (
                      <ArrowUp className="h-4 w-4 text-primary animate-in zoom-in duration-200" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-primary animate-in zoom-in duration-200" />
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {/* NHÓM PHẢI: Các nút hành động khác */}
          <div 
            // 🟢 2. CĂN CHỈNH NÚT BÊN PHẢI Ở ĐÂY
            // mb-0.5: Đẩy nhẹ lên một chút cho cân với nút sắp xếp
            className="flex flex-wrap items-center gap-3 mb-0.5"
          >
            <Button variant="outline" onClick={() => navigate("/search")} className="hover:bg-gray/90 hover:text-primary">
              <Search className="mr-2 h-4 w-4" /> Tìm kiếm khác
            </Button>
            
            <Button onClick={() => navigate("/cart")} className="bg-primary/90 hover:bg-primary">
              Xem danh sách
            </Button>
          </div>
        </div>

        {/* GRID RESULTS */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedRestaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>

        {/* EMPTY STATE */}
        {restaurants.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Không tìm thấy kết quả</h3>
            <p className="text-muted-foreground max-w-xs mx-auto">
              Hãy thử thay đổi từ khóa hoặc bộ lọc tìm kiếm của bạn.
            </p>
            <Button variant="link" onClick={() => navigate("/search")} className="mt-4 text-primary">
                Quay lại tìm kiếm
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsPage;