import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Restaurant } from "@/types";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

interface CartContextType {
  cartItems: Restaurant[];
  addToCart: (item: Restaurant) => void;
  removeFromCart: (id: number | string) => void;
  clearCart: () => void;
  isInCart: (id: number | string) => boolean;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();

  // 1. LAZY INITIALIZATION (QUAN TRỌNG): 
  // Đọc dữ liệu ngay khi khởi tạo state để tránh bị ghi đè thành mảng rỗng khi reload trang
  const [cartItems, setCartItems] = useState<Restaurant[]>(() => {
    try {
      const savedCart = localStorage.getItem("restaurantCart");
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (e) {
      console.error("Lỗi parse cart", e);
      return [];
    }
  });

  // 2. Tự động LƯU vào LocalStorage mỗi khi cart thay đổi
  useEffect(() => {
    localStorage.setItem("restaurantCart", JSON.stringify(cartItems));
  }, [cartItems]);

  // 3. TÍNH NĂNG ĐỒNG BỘ ĐA TAB (Bạn muốn giữ lại cái này)
  // Lắng nghe sự kiện 'storage' để cập nhật khi tab khác thay đổi dữ liệu
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "restaurantCart" && e.newValue) {
        try {
          setCartItems(JSON.parse(e.newValue));
        } catch (err) {
          console.error("Sync error", err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const addToCart = (item: Restaurant) => {
    if (cartItems.some((i) => i.id === item.id)) {
      toast.warning(t('cart.toast_duplicate', "Quán này đã có trong danh sách!"));
      return;
    }
    setCartItems((prev) => [...prev, item]);
    toast.success(t('cart.toast_added', { name: item.name, defaultValue: `Đã thêm "${item.name}" vào danh sách` }));
  };

  const removeFromCart = (id: number | string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    toast.info(t('cart.toast_removed', "Đã xóa khỏi danh sách"));
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem("restaurantCart");
  };

  const isInCart = (id: number | string) => {
    return cartItems.some((item) => item.id === id);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        clearCart,
        isInCart,
        cartCount: cartItems.length,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};