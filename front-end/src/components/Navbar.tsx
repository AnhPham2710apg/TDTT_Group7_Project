// src/components/Navbar.tsx
import { useState } from "react";
import { ShoppingCart, UtensilsCrossed, Heart, MapPin, LogOut, User, Info, Menu, X, ChevronRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Link, useNavigate, useLocation } from "react-router-dom"; 
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, Variants } from "framer-motion";

interface NavbarProps {
  hideAuthButtons?: boolean;
}

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  className?: string;
}

const NavItem = ({ to, icon: Icon, label, onClick, className }: NavItemProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <button
      onClick={() => {
        navigate(to);
        if (onClick) onClick();
      }}
      className={cn(
        "relative group flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all duration-300 w-full md:w-auto",
        isActive ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-gray-100 hover:text-foreground",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn("h-5 w-5 transition-colors", isActive ? "text-primary" : "text-gray-500")} />
        <span className={cn("text-base", isActive ? "font-semibold" : "font-medium")}>
            {label}
        </span>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-300 md:hidden" />
      <span className={cn(
        "hidden md:block absolute bottom-0 left-0 h-[2px] w-full bg-primary",
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
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isCartActive = location.pathname === "/cart";

  const menuVariants: Variants = { 
    closed: { opacity: 0, height: 0, transition: { duration: 0.3, ease: "easeInOut" } },
    open: { opacity: 1, height: "auto", transition: { duration: 0.3, ease: "easeInOut", staggerChildren: 0.1, delayChildren: 0.1 } }
  };

  const itemVariants: Variants = { 
    closed: { opacity: 0, x: -20 },
    open: { opacity: 1, x: 0 }
  };

  return (
    <nav className="border-b border-border bg-card/95 backdrop-blur-md sticky top-0 z-50 transition-all">
      <div className="container mx-auto px-4 py-3">
        {/* Container Flex chính */}
        <div className="flex items-center justify-between relative h-10">
          
          {/* --- 1. MOBILE HAMBURGER BUTTON (Chỉ hiện khi ĐÃ Đăng nhập) --- */}
          {isLoggedIn && (
            <div className="md:hidden flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10 -ml-2"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  <div className={cn("transition-transform duration-300", isMobileMenuOpen ? "rotate-90" : "rotate-0")}>
                    {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                  </div>
                </Button>
            </div>
          )}

          {/* --- 2. LOGO --- */}
          {/* FIX: Điều chỉnh logic class để tránh đè lên nhau khi chưa đăng nhập */}
          <Link 
            to="/" 
            className={cn(
              "flex items-center gap-2 group z-50 transition-all duration-300",
              // LOGIC QUAN TRỌNG:
              // - Nếu ĐÃ Đăng nhập: Logo ra giữa (absolute) để cân đối với nút Menu trái và Cart phải.
              // - Nếu CHƯA Đăng nhập: Logo nằm yên bên trái (static) để nhường chỗ bên phải cho nút Login/Sign Up.
              // - Trên PC (md): Luôn nằm yên (static).
              isLoggedIn 
                ? "absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0 md:left-auto" 
                : "static mr-auto" 
            )}
          >
            <div className="p-1.5 md:p-2 rounded-lg bg-hero-gradient group-hover:scale-110 transition-transform duration-300 shadow-md">
              <UtensilsCrossed className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            {/* Tên Logo: Ẩn trên màn hình quá nhỏ (iPhone SE) nếu chưa đăng nhập để đỡ chật */}
            <span className={cn(
                "text-lg md:text-xl font-bold bg-hero-gradient bg-clip-text text-transparent whitespace-nowrap",
                !isLoggedIn ? "hidden sm:block" : "hidden min-[350px]:block"
            )}>
              Food Tour Assistant
            </span>
          </Link>

          {/* --- 3. RIGHT ACTIONS (PC Menu + Cart + User + Auth Buttons) --- */}
          <div className="flex items-center gap-2 ml-auto"> 
            {isLoggedIn ? (
              <>
                {/* ... Phần code khi ĐÃ ĐĂNG NHẬP giữ nguyên ... */}
                <div className="hidden md:flex items-center gap-2 mr-2">
                  <NavItem to="/search" icon={MapPin} label="Tìm kiếm" />
                  <NavItem to="/favorites" icon={Heart} label="Yêu thích" />
                  <NavItem to="/about" icon={Info} label="Giới thiệu" />
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "relative h-9 w-9 md:h-10 md:w-10 rounded-full transition-all duration-300",
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
                
                <div className="hidden md:block">
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
                        <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => navigate("/profile")}>
                            <User className="h-4 w-4" /> Hồ sơ cá nhân
                        </Button>
                        <Button variant="ghost" className="w-full justify-start gap-2 text-red-500" onClick={logout}>
                            <LogOut className="h-4 w-4" /> Đăng xuất
                        </Button>
                        </div>
                    </PopoverContent>
                    </Popover>
                </div>
              </>
            ) : (
              !hideAuthButtons && (
                <div className="flex items-center gap-1 md:gap-2">
                  {/* FIX: Thu nhỏ nút Login trên mobile */}
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate("/login")}
                    className="px-2 md:px-4 text-sm font-medium"
                  >
                    Login
                  </Button>
                  
                  {/* FIX: Nút Sign Up nhỏ hơn trên mobile */}
                  <Button 
                    onClick={() => navigate("/register")} 
                    className="bg-hero-gradient hover:opacity-90 h-9 px-3 md:h-10 md:px-4 text-xs md:text-sm"
                  >
                    Sign Up
                  </Button>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isLoggedIn && isMobileMenuOpen && (
            <motion.div
                initial="closed"
                animate="open"
                exit="closed"
                variants={menuVariants}
                className="md:hidden absolute top-full left-0 w-full bg-background/95 backdrop-blur-xl border-b border-border shadow-2xl overflow-hidden z-40"
            >
                {/* ... (Phần Menu Mobile giữ nguyên như cũ) ... */}
                <div className="container mx-auto px-4 py-6 flex flex-col gap-2">
                    <motion.div variants={itemVariants} className="flex items-center gap-3 px-4 py-3 mb-2 bg-muted/50 rounded-xl border border-border/50">
                        <Avatar className="h-10 w-10 border border-white shadow-sm">
                            <AvatarFallback className="bg-hero-gradient text-white font-bold">
                                {username ? username.charAt(0).toUpperCase() : "U"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-foreground">Xin chào, {username}</span>
                            <span className="text-xs text-muted-foreground">Thành viên thân thiết</span>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <NavItem to="/search" icon={MapPin} label="Tìm kiếm" onClick={() => setIsMobileMenuOpen(false)} />
                    </motion.div>
                    
                    <motion.div variants={itemVariants}>
                        <NavItem to="/favorites" icon={Heart} label="Yêu thích" onClick={() => setIsMobileMenuOpen(false)} />
                    </motion.div>
                    
                    <motion.div variants={itemVariants}>
                        <NavItem to="/about" icon={Info} label="Giới thiệu" onClick={() => setIsMobileMenuOpen(false)} />
                    </motion.div>

                    <div className="border-t my-1 border-border/50" />

                    <motion.div variants={itemVariants}>
                        <NavItem to="/profile" icon={User} label="Hồ sơ cá nhân" onClick={() => setIsMobileMenuOpen(false)} />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <Button 
                            variant="ghost" 
                            className="w-full justify-start gap-3 px-4 py-3 h-auto text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl group"
                            onClick={() => {
                                logout();
                                setIsMobileMenuOpen(false);
                            }}
                        >
                            <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
                            <span className="text-base font-medium">Đăng xuất</span>
                        </Button>
                    </motion.div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;