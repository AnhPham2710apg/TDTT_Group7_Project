// src/pages/CartPage.tsx

import Navbar from "@/components/Navbar";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import RestaurantCard from "@/components/RestaurantCard";
import { Route, Search, Trash2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
// 1. Import hook
import { useTranslation } from 'react-i18next';

const CartPage = () => {
  // 2. Khởi tạo hook
  const { t } = useTranslation();
  const { cartItems, clearCart } = useCart();
  const navigate = useNavigate();

  const handleOptimizeRoute = () => {
    if (cartItems.length < 1) {
      // Thay text trong toast
      toast.error(t('cart.toast_error_min', "Cần ít nhất 1 địa điểm để tối ưu lộ trình!"));
      return;
    }

    const separator = "|||";
    const placeAddresses = cartItems.map(r => r.address).join(separator);
    const placeNames = cartItems.map(r => r.name).join(separator);
    const placeLats = cartItems.map(r => r.lat).join(separator);
    const placeLngs = cartItems.map(r => r.lng).join(separator);

    const params = new URLSearchParams();
    params.append("addresses", placeAddresses);
    params.append("names", placeNames);
    params.append("lats", placeLats);
    params.append("lngs", placeLngs);
    
    navigate(`/optimize?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      
      <div className="container mx-auto px-4 py-4 md:py-6">
        
        {/* --- 1. NÚT BACK --- */}
        <div className="mb-4">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate(-1)}
                className="h-9 rounded-full shadow-sm border border-green-600 text-green-600 bg-white 
                           hover:bg-green-600 hover:text-white transition-all px-4 gap-2"
            >
                <ArrowLeft className="h-4 w-4" /> 
                <span className="font-medium">
                  {t('common.back', 'Quay lại')}
                </span>
            </Button>
        </div>

        {/* HEADER TOOLBAR */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-8 gap-4">
          
          {/* Thông tin Text */}
          <div className="w-full md:w-auto">
            <h1 className="text-2xl md:text-3xl font-bold mb-1">
              {t('cart.title', 'Danh sách đã chọn')}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t('cart.selected_prefix', 'Bạn đã chọn')}{" "}
              <span className="font-medium text-foreground">{cartItems.length}</span>{" "}
              {t('cart.selected_suffix', 'địa điểm.')}
            </p>
          </div>
          
          {/* GROUP BUTTONS */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 no-scrollbar">
              
             {/* Nút Xóa tất cả */}
             {cartItems.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={clearCart} 
                  className="flex-shrink-0 text-destructive border-destructive/50 hover:bg-destructive/10 hover:border-destructive h-8 md:h-9 text-xs md:text-sm hover:text-red-500 px-3 whitespace-nowrap rounded-full"
                >
                   <Trash2 className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4" /> 
                   {t('cart.clear_all', 'Xóa hết')}
                </Button>
             )}

             {/* Nút Tìm thêm */}
             <Button 
                onClick={() => navigate("/search")} 
                variant="outline"
                className="flex-shrink-0 hover:bg-gray/90 hover:text-primary h-8 md:h-9 text-xs md:text-sm px-3 whitespace-nowrap rounded-full"
             >
                <Search className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4" /> 
                {t('cart.find_more', 'Tìm thêm')}
             </Button>

             {/* Nút Tối ưu (Gradient) */}
             <Button 
                onClick={handleOptimizeRoute} 
                className="flex-shrink-0 bg-hero-gradient shadow-md hover:shadow-lg hover:opacity-90 h-8 md:h-9 text-xs md:text-sm px-4 whitespace-nowrap rounded-full font-semibold"
             >
                <Route className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4" /> 
                {t('cart.optimize_now', 'Tối ưu ngay')}
             </Button>
          </div>
        </div>

        {/* CONTENT LIST */}
        {cartItems.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-xl border border-dashed flex flex-col items-center justify-center">
             <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium mb-1">
              {t('cart.empty_title', 'Danh sách trống')}
            </p>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              {t('cart.empty_desc', 'Bạn chưa chọn địa điểm nào cho hành trình food tour của mình.')}
            </p>
            <Button onClick={() => navigate("/search")} className="bg-primary rounded-full px-6">
              {t('cart.explore_action', 'Khám phá quán ăn')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
            {cartItems.map((restaurant) => (
              <RestaurantCard 
                key={restaurant.id} 
                restaurant={restaurant}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;