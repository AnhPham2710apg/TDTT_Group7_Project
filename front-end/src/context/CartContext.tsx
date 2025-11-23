import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Restaurant } from "@/types";
import { toast } from "sonner";

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
  const [cartItems, setCartItems] = useState<Restaurant[]>([]);

  // 1. Load từ LocalStorage khi khởi động
  useEffect(() => {
    const savedCart = localStorage.getItem("restaurantCart");
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error("Lỗi parse cart", e);
      }
    }
  }, []);

  // 2. Lưu vào LocalStorage mỗi khi cart thay đổi
  useEffect(() => {
    localStorage.setItem("restaurantCart", JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (item: Restaurant) => {
    // Kiểm tra trùng lặp
    if (cartItems.some((i) => i.id === item.id)) {
      toast.warning("Quán này đã có trong danh sách!");
      return;
    }
    setCartItems((prev) => [...prev, item]);
    toast.success(`Đã thêm "${item.name}" vào danh sách`);
  };

  const removeFromCart = (id: number | string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    toast.info("Đã xóa khỏi danh sách");
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