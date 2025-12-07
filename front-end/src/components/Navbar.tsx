import { ShoppingCart, UtensilsCrossed, Heart, MapPin, LogOut, User, Info } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Link, useNavigate, useLocation } from "react-router-dom"; 
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface NavbarProps {
  hideAuthButtons?: boolean;
}

// --- 1. SỬA NAV ITEM: KHẮC PHỤC LỖI NHẢY BỐ CỤC ---
interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
}

const NavItem = ({ to, icon: Icon, label }: NavItemProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <button
      onClick={() => navigate(to)}
      className={cn(
        "relative group flex items-center gap-3 px-4 py-2 rounded-md text-sm transition-all duration-300",
        // Hover Background
        "hover:bg-primary/10 hover:text-primary",
        // Active State: Chỉ đổi màu text và nền, bỏ font-bold ở đây để xử lý bên dưới
        isActive ? "text-primary bg-primary/5" : "text-muted-foreground"
      )}
    >
      <Icon className={cn("h-4 w-4 transition-colors", isActive && "")} />
      
      {/* --- KỸ THUẬT GRID OVERLAY --- */}
      {/* Tạo một lưới để chồng 2 lớp chữ lên nhau */}
      <div className="grid place-items-center">
        {/* Lớp 1 (Tàng hình): Luôn in đậm để xí chỗ chiều rộng lớn nhất */}
        <span className="font-bold invisible col-start-1 row-start-1 pointer-events-none select-none">
          {label}
        </span>
        
        {/* Lớp 2 (Hiển thị): Thay đổi độ đậm nhạt tùy ý mà không làm vỡ khung */}
        <span className={cn(
            "col-start-1 row-start-1 flex items-center transition-all", 
            isActive ? "font-bold" : "font-medium"
        )}>
          {label}
        </span>
      </div>

      {/* Hiệu ứng gạch chân chạy từ giữa */}
      <span className={cn(
        "absolute bottom-0 left-0 h-[2px] w-full bg-primary",
        "origin-center scale-x-0 transition-transform duration-300 ease-out",
        "group-hover:scale-x-100",
        isActive && "scale-x-100"
      )} />
    </button>
  );
};

const Navbar = ({ hideAuthButtons = false }: NavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation(); 
  const { isLoggedIn, username, logout } = useAuth();
  const { cartCount } = useCart();
  
  const isCartActive = location.pathname === "/cart";

  return (
    <nav className="border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-50 transition-all">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          
          {/* --- LOGO --- */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-lg bg-hero-gradient group-hover:scale-110 transition-transform duration-300 shadow-md">
              <UtensilsCrossed className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-hero-gradient bg-clip-text text-transparent hidden sm:block">
              Food Tour Assistant
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                {/* --- MENU ITEMS --- */}
                <div className="hidden md:flex items-center gap-2">
                  <NavItem to="/search" icon={MapPin} label="Tìm kiếm" />
                  <NavItem to="/favorites" icon={Heart} label="Yêu thích" />
                  <NavItem to="/about" icon={Info} label="Giới thiệu" />
                </div>

                {/* --- NÚT CART (Giữ nguyên logic của bạn) --- */}
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "relative h-10 w-10 rounded-full transition-all duration-300 ml-1", 
                      isCartActive 
                        ? "bg-primary/15 text-primary shadow-sm ring-1 ring-primary/20" 
                        : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    )}
                    onClick={() => navigate("/cart")}
                  >
                    <ShoppingCart className={cn("h-5 w-5", isCartActive && "fill-current")} />
                    
                    {cartCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold animate-in zoom-in border-2 border-white dark:border-background">
                        {cartCount}
                      </span>
                    )}
                </Button>
                
                {/* --- USER POPOVER --- */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:ring-2 hover:ring-primary/20 transition-all ml-1">
                      <Avatar className="h-9 w-9 border border-border">
                        <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/30 text-primary font-bold">
                          {username ? username.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="end">
                    <div className="flex flex-col gap-1">
                      <div className="px-3 py-2 text-sm font-semibold text-muted-foreground border-b mb-1">
                         Xin chào, {username}
                      </div>
                      
                      {/* Menu mobile */}
                      <div className="md:hidden flex flex-col gap-1 border-b pb-1 mb-1">
                         <Button variant="ghost" className="justify-start" onClick={() => navigate("/search")}>
                            <MapPin className="mr-2 h-4 w-4" /> Tìm kiếm
                         </Button>
                         <Button variant="ghost" className="justify-start" onClick={() => navigate("/favorites")}>
                            <Heart className="mr-2 h-4 w-4" /> Yêu thích
                         </Button>
                         <Button variant="ghost" className="justify-start" onClick={() => navigate("/about")}>
                            <Info className="mr-2 h-4 w-4" /> Giới thiệu
                         </Button>
                      </div>

                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2 hover:bg-primary/10 hover:text-primary cursor-pointer"
                        onClick={() => navigate("/profile")}
                      >
                        <User className="h-4 w-4" />
                        Hồ sơ cá nhân
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50" 
                        onClick={logout}
                      >
                        <LogOut className="h-4 w-4" /> Đăng xuất
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            ) : (
              !hideAuthButtons && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/login")}
                    className="hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    Login
                  </Button>
                  <Button
                    onClick={() => navigate("/register")}
                    className="bg-hero-gradient hover:opacity-90 shadow-md hover:shadow-lg transition-all"
                  >
                    Sign Up
                  </Button>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;