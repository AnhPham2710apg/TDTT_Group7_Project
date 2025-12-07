import Navbar from "@/components/Navbar";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import RestaurantCard from "@/components/RestaurantCard";
import { Route, Search, Trash2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const CartPage = () => {
  const { cartItems, clearCart } = useCart();
  const navigate = useNavigate();

  const handleOptimizeRoute = () => {
    if (cartItems.length < 1) {
      toast.error("Cần ít nhất 1 địa điểm để tối ưu lộ trình!");
      return;
    }

    const separator = "|||";
    // Chuẩn bị dữ liệu giống logic cũ của bạn
    const placeAddresses = cartItems.map(r => r.address).join(separator);
    const placeNames = cartItems.map(r => r.name).join(separator);
    const placeLats = cartItems.map(r => r.lat).join(separator);
    const placeLngs = cartItems.map(r => r.lng).join(separator);

    const params = new URLSearchParams();
    params.append("addresses", placeAddresses);
    params.append("names", placeNames);
    params.append("lats", placeLats);
    params.append("lngs", placeLngs);
    
    // Chuyển hướng
    navigate(`/optimize?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-4">
        <Button 
          variant="ghost" 
          className="mb-4 pl-0 hover:pl-2 transition-all" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Danh sách địa điểm đã chọn</h1>
            <p className="text-muted-foreground">
              Bạn đã chọn {cartItems.length} địa điểm cho hành trình.
            </p>
          </div>
          
          <div className="flex gap-3">
             {cartItems.length > 0 && (
                <Button variant="outline" onClick={clearCart} className="text-destructive border-destructive hover:bg-destructive/10">
                   <Trash2 className="mr-2 h-4 w-4" /> Xóa tất cả
                </Button>
             )}
             <Button onClick={() => navigate("/search")} variant="secondary">
                <Search className="mr-2 h-4 w-4" /> Tìm thêm
             </Button>
             <Button onClick={handleOptimizeRoute} className="bg-hero-gradient">
                <Route className="mr-2 h-4 w-4" /> Tối ưu lộ trình ngay
             </Button>
          </div>
        </div>

        {cartItems.length === 0 ? (
          <div className="text-center py-20 bg-muted/30 rounded-lg border border-dashed">
            <p className="text-muted-foreground mb-4">Danh sách trống.</p>
            <Button onClick={() => navigate("/search")}>Đi tìm quán ăn</Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cartItems.map((restaurant) => (
              <RestaurantCard 
                key={restaurant.id} 
                restaurant={restaurant}
                // onToggleFavorite={...} // Truyền nếu muốn xử lý favorite ở đây
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;