// src/components/Navbar.tsx
// Import thêm
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Link, useNavigate } from "react-router-dom"; // 1. Xóa useLocation
import { Button } from "./ui/button";
import {
  UtensilsCrossed,
  Heart,
  MapPin,
  LogOut,
  User,
  Info, // Thêm Info từ code ổn định
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useAuth } from "@/context/AuthContext";

// Dùng interface từ code ổn định
interface NavbarProps {
  hideAuthButtons?: boolean;
}

const Navbar = ({ hideAuthButtons = false }: NavbarProps) => {
  const navigate = useNavigate();
  const { isLoggedIn, username, logout } = useAuth();
  const { cartCount } = useCart(); // Lấy số lượng

  // 5. Xóa toàn bộ useEffect và handleLogout

  // 6. Cập nhật hàm này
  const getAvatarFallback = () => {
    return username ? username.charAt(0).toUpperCase() : <User className="h-5 w-5" />;
  };

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-lg bg-hero-gradient group-hover:scale-110 transition-transform">
              <UtensilsCrossed className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-hero-gradient bg-clip-text text-transparent">
              Food Tour Assistant
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              // === GIAO DIỆN LOGGED-IN TỪ CODE MẪU (Đã gộp) ===
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/search")}
                  className="gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  Search
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/favorites")}
                  className="gap-2"
                >
                  <Heart className="h-4 w-4" />
                  Favorites
                </Button>
                {/* Thêm nút 'About' từ code ổn định */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/about")}
                  className="gap-2"
                >
                  <Info className="h-4 w-4" />
                  About
                </Button>

                {/* === NÚT CART (Luôn hiện hoặc chỉ hiện khi login tùy bạn) === */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="relative h-11 w-11 gap-2 rounded-full"
                    onClick={() => navigate("/cart")}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
                        {cartCount}
                      </span>
                    )}
                </Button>
                
                {/* Dùng Popover từ code mẫu */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                      <Avatar className="h-10 w-10">
                        {/* <AvatarImage src="" alt={username || "User"} /> */}
                        <AvatarFallback className="bg-primary/10">
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="end">
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2"
                        onClick={() => navigate("/profile")} // <-- Link đến Profile
                      >
                        <User className="h-4 w-4" />
                        Profile
                      </Button>
                      <Button variant="ghost" className="w-full justify-start gap-2" onClick={logout}>
                        {/* 8. Dùng hàm 'logout' trực tiếp từ Context */}
                        <LogOut className="h-4 w-4" /> Logout
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            ) : (
              // === GIAO DIỆN LOGGED-OUT TỪ CODE ỔN ĐỊNH ===
              !hideAuthButtons && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/login")}
                    className="gap-2"
                  >
                    <User className="h-4 w-4" />
                    Login
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate("/register")}
                    className="bg-hero-gradient hover:opacity-90"
                  >
                    Sign Up
                  </Button>
                </>
              )
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;