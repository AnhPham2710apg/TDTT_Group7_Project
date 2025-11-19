// src/components/Navbar.tsx

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
  // 4. Lấy state và hàm từ Context
  const { isLoggedIn, username, logout } = useAuth();

  // 5. Xóa toàn bộ useEffect và handleLogout

  // 6. Cập nhật hàm này
  const getAvatarFallback = () => {
    return username ? username.charAt(0).toUpperCase() : <User className="h-5 w-5" />;
  };

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
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