import { useState } from "react";
import { 
  ShoppingCart, UtensilsCrossed, Heart, MapPin, 
  LogOut, User, Info, Menu, X, ChevronRight, Globe, ChevronDown 
} from "lucide-react"; 
import { useCart } from "@/context/CartContext";
import { Link, useNavigate, useLocation } from "react-router-dom"; 
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { 
  Popover, PopoverContent, PopoverTrigger 
} from "./ui/popover";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"; 
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";

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

// --- COMPONENT CON: LanguageSwitcherDropdown ---
const LanguageSwitcherDropdown = ({ 
    isOpen, 
    onOpenChange, 
    changeLanguage, 
    currentLang 
}: { 
    isOpen: boolean; 
    onOpenChange: (open: boolean) => void; 
    changeLanguage: (lng: string) => void; 
    currentLang: string; 
}) => {
    return (
        <DropdownMenu onOpenChange={onOpenChange}>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className={cn(
                        "relative h-9 w-9 md:h-10 md:w-10 rounded-full transition-all duration-300",
                        isOpen 
                            ? "bg-primary/15 text-primary shadow-sm ring-1 ring-primary/20" 
                            : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    )}
                >
                    <Globe className="h-5 w-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px]">
                <DropdownMenuItem 
                    onClick={() => changeLanguage('vi')} 
                    className={`cursor-pointer ${currentLang === 'vi' ? 'bg-primary/10 font-bold text-primary' : ''}`}
                >
                    🇻🇳 Tiếng Việt
                </DropdownMenuItem>
                <DropdownMenuItem 
                    onClick={() => changeLanguage('en')} 
                    className={`cursor-pointer ${currentLang === 'en' ? 'bg-primary/10 font-bold text-primary' : ''}`}
                >
                    🇺🇸 English
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

const Navbar = ({ hideAuthButtons = false }: NavbarProps) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation(); 
  const { isLoggedIn, username, logout } = useAuth();
  const { cartCount } = useCart();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLanguageExpanded, setIsLanguageExpanded] = useState(false); 
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false); 
  
  const isCartActive = location.pathname === "/cart";

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("i18nextLng", lng);
  };

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false); 
    navigate("/login");
  };

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
        <div className="flex items-center justify-between relative h-10">
          
          {/* 1. MOBILE HAMBURGER (Chỉ hiện khi ĐÃ Đăng nhập) */}
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

          {/* 2. LOGO */}
          <Link 
            to="/" 
            className={cn(
              "flex items-center gap-2 group z-50 transition-all duration-300",
              isLoggedIn 
                ? "absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0 md:left-auto" 
                : "static mr-auto" 
            )}
          >
            <div className="p-1.5 md:p-2 rounded-lg bg-hero-gradient group-hover:scale-110 transition-transform duration-300 shadow-md">
              <UtensilsCrossed className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <span className={cn(
                "text-lg md:text-xl font-bold bg-hero-gradient bg-clip-text text-transparent whitespace-nowrap",
                !isLoggedIn ? "hidden sm:block" : "hidden min-[350px]:block"
            )}>
              {t('common.app_name', 'Food Tour Assistant')}
            </span>
          </Link>

          {/* 3. RIGHT ACTIONS */}
          <div className="flex items-center gap-2 ml-auto"> 
            
            {isLoggedIn ? (
              // === TRƯỜNG HỢP 1: ĐÃ ĐĂNG NHẬP ===
              <>
                <div className="hidden md:flex items-center gap-2 mr-2">
                  <NavItem to="/search" icon={MapPin} label={t('common.search', "Tìm kiếm")} />
                  <NavItem to="/favorites" icon={Heart} label={t('profile.tab_favorites', "Yêu thích")} />
                  <NavItem to="/about" icon={Info} label={t('restaurant_detail.tab_about', "Giới thiệu")} />
                </div>

                {/* CART BUTTON */}
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

                {/* LANGUAGE SWITCHER (User) - Chỉ hiện trên PC */}
                <div className="hidden md:block mx-1">
                    <LanguageSwitcherDropdown 
                        isOpen={isLangMenuOpen} 
                        onOpenChange={setIsLangMenuOpen} 
                        changeLanguage={changeLanguage} 
                        currentLang={i18n.language} 
                    />
                </div>
                
                {/* USER AVATAR */}
                <div className="hidden md:block">
                    <Popover>
                        {/* ... (Code Popover Avatar giữ nguyên) ... */}
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
                            {t('common.hello', "Xin chào")}, {username}
                            </div>
                            <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => navigate("/profile")}>
                                <User className="h-4 w-4" /> {t('common.profile', "Hồ sơ cá nhân")}
                            </Button>
                            <Button variant="ghost" className="w-full justify-start gap-2 text-red-500" onClick={handleLogout}>
                                <LogOut className="h-4 w-4" /> {t('common.logout', "Đăng xuất")}
                            </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
              </>
            ) : (
              // === TRƯỜNG HỢP 2: CHƯA ĐĂNG NHẬP (Guest) ===
              <div className="flex items-center gap-1 md:gap-2">
                  
                  {/* --- LANGUAGE SWITCHER (GUEST) --- */}
                  {/* FIX QUAN TRỌNG: Luôn hiển thị (block), không phụ thuộc hideAuthButtons */}
                  <div className="block mr-1">
                      <LanguageSwitcherDropdown 
                          isOpen={isLangMenuOpen} 
                          onOpenChange={setIsLangMenuOpen} 
                          changeLanguage={changeLanguage} 
                          currentLang={i18n.language} 
                      />
                  </div>

                  {/* Nút Login/Sign Up (Có thể bị ẩn bởi hideAuthButtons) */}
                  {!hideAuthButtons && (
                    <>
                      <Button 
                        variant="ghost" 
                        onClick={() => navigate("/login")}
                        className="px-2 md:px-4 text-sm font-medium"
                      >
                        {t('common.login', "Login")}
                      </Button>
                      <Button 
                        onClick={() => navigate("/register")} 
                        className="bg-hero-gradient hover:opacity-90 h-9 px-3 md:h-10 md:px-4 text-xs md:text-sm"
                      >
                        {t('register.submit', "Sign Up")}
                      </Button>
                    </>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE MENU (Giữ nguyên phần này, chỉ hiện khi đã đăng nhập) */}
      <AnimatePresence>
        {isLoggedIn && isMobileMenuOpen && (
            <motion.div
                initial="closed"
                animate="open"
                exit="closed"
                variants={menuVariants}
                className="md:hidden absolute top-full left-0 w-full bg-background/95 backdrop-blur-xl border-b border-border shadow-2xl overflow-hidden z-40"
            >
                {/* ... (Nội dung menu mobile giữ nguyên) ... */}
                <div className="container mx-auto px-4 py-6 flex flex-col gap-2">
                    <motion.div variants={itemVariants} className="flex items-center gap-3 px-4 py-3 mb-2 bg-muted/50 rounded-xl border border-border/50">
                        <Avatar className="h-10 w-10 border border-white shadow-sm">
                            <AvatarFallback className="bg-hero-gradient text-white font-bold">
                                {username ? username.charAt(0).toUpperCase() : "U"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-foreground">{t('common.hello', "Xin chào")}, {username}</span>
                            <span className="text-xs text-muted-foreground">{t('common.member', "Thành viên thân thiết")}</span>
                        </div>
                    </motion.div>

                    {/* Mobile Language Accordion */}
                    <motion.div variants={itemVariants} className="overflow-hidden bg-white rounded-xl border border-gray-100 mb-2">
                        <button 
                            onClick={() => setIsLanguageExpanded(!isLanguageExpanded)}
                            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Globe className="h-5 w-5 text-gray-500" />
                                <span className="text-base font-medium">{t('common.language', "Ngôn ngữ")}</span>
                            </div>
                            <ChevronDown 
                                className={cn("h-4 w-4 text-gray-400 transition-transform duration-300", isLanguageExpanded ? "rotate-180" : "rotate-0")} 
                            />
                        </button>

                        <AnimatePresence>
                            {isLanguageExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="border-t border-gray-100 bg-gray-50/50"
                                >
                                    <button 
                                        onClick={() => changeLanguage('vi')}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-8 py-3 text-sm hover:bg-gray-100 transition-colors",
                                            i18n.language === 'vi' ? "text-primary font-bold bg-primary/5" : "text-gray-600"
                                        )}
                                    >
                                        <span className="text-lg">🇻🇳</span> Tiếng Việt
                                        {i18n.language === 'vi' && <div className="w-1.5 h-1.5 rounded-full bg-primary ml-auto" />}
                                    </button>
                                    <button 
                                        onClick={() => changeLanguage('en')}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-8 py-3 text-sm hover:bg-gray-100 transition-colors",
                                            i18n.language === 'en' ? "text-primary font-bold bg-primary/5" : "text-gray-600"
                                        )}
                                    >
                                        <span className="text-lg">🇺🇸</span> English
                                        {i18n.language === 'en' && <div className="w-1.5 h-1.5 rounded-full bg-primary ml-auto" />}
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <NavItem to="/search" icon={MapPin} label={t('common.search', "Tìm kiếm")} onClick={() => setIsMobileMenuOpen(false)} />
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <NavItem to="/favorites" icon={Heart} label={t('profile.tab_favorites', "Yêu thích")} onClick={() => setIsMobileMenuOpen(false)} />
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <NavItem to="/about" icon={Info} label={t('restaurant_detail.tab_about', "Giới thiệu")} onClick={() => setIsMobileMenuOpen(false)} />
                    </motion.div>
                    <div className="border-t my-1 border-border/50" />
                    <motion.div variants={itemVariants}>
                        <NavItem to="/profile" icon={User} label={t('common.profile', "Hồ sơ cá nhân")} onClick={() => setIsMobileMenuOpen(false)} />
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <Button 
                            variant="ghost" 
                            className="w-full justify-start gap-3 px-4 py-3 h-auto text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl group"
                            onClick={handleLogout}
                        >
                            <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
                            <span className="text-base font-medium">{t('common.logout', "Đăng xuất")}</span>
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