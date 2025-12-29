// src/pages/SearchPage.tsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import Navbar from "@/components/Navbar";
// Thêm các icon cho phần Vibe
import { Search, Check, Wallet, Scale, Sparkles, Coffee, Music, Heart, Users, Camera, CloudSun, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

const SearchPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // --- OPTIONS ---
  const FOOD_TYPE_OPTIONS = [
    { id: "vegetarian", label: t('search.diet_veg', "Chay") },
    { id: "non-vegetarian", label: t('search.diet_non_veg', "Mặn") },
    { id: "both", label: t('search.option_all', "Tất cả") },
  ];
  
  const BEV_FOOD_OPTIONS = [
    { id: "beverage", label: t('search.type_beverage', "Đồ uống") },
    { id: "food", label: t('search.type_food', "Đồ ăn") },
    { id: "both", label: t('search.option_all', "Tất cả") },
  ];
  
  const COURSE_TYPE_OPTIONS = [
    { id: "main", label: t('search.course_main', "Món chính") },
    { id: "dessert", label: t('search.course_dessert', "Tráng miệng") },
    { id: "both", label: t('search.option_all', "Tất cả") },
  ];
  
  const FLAVOR_OPTIONS = [
    { id: "sweet", label: t('search.flavor_sweet', "Ngọt") },
    { id: "salty", label: t('search.flavor_salty', "Mặn") },
    { id: "spicy", label: t('search.flavor_spicy', "Cay") },
    { id: "sour", label: t('search.flavor_sour', "Chua") },
    { id: "bitter", label: t('search.flavor_bitter', "Đắng") },
    { id: "fatty", label: t('search.flavor_fatty', "Béo") },
    { id: "light", label: t('search.flavor_light', "Thanh") },
  ];

  const USER_TYPE_OPTIONS = [
    { 
      id: "saver", 
      label: t('search.user_saver_label', "Tiết kiệm"), 
      desc: t('search.user_saver_desc', "Ưu tiên giá rẻ & khuyến mãi"),
      icon: Wallet 
    },
    { 
      id: "balanced", 
      label: t('search.user_balanced_label', "Cân bằng"), 
      desc: t('search.user_balanced_desc', "Hài hòa giữa giá & vị ngon"),
      icon: Scale 
    },
    { 
      id: "foodie", 
      label: t('search.user_foodie_label', "Sành ăn"), 
      desc: t('search.user_foodie_desc', "Ưu tiên chất lượng & trải nghiệm"),
      icon: Sparkles 
    },
  ];

  // Options cho Vibe / Không gian
  const VIBE_OPTIONS = [
    { id: "chill", label: t('search.vibe_relax', "Thư giãn"), icon: Coffee },
    { id: "vibrant", label: t('search.vibe_vibrant', "Nhộn nhịp"), icon: Music },
    { id: "romantic", label: t('search.vibe_romantic', "Lãng mạn"), icon: Heart },
    { id: "cozy", label: t('search.vibe_cozy', "Ấm cúng"), icon: Users },
    { id: "luxury", label: t('search.vibe_luxury', "Sang trọng"), icon: Sparkles },
    { id: "street", label: t('search.vibe_street', "Vỉa hè"), icon: Coffee },
    { id: "view", label: t('search.vibe_view', "Cảnh đẹp"), icon: Camera },
    { id: "traditional", label: t('search.vibe_traditional', "Truyền thống"), icon: Sparkles },
  ];

  const CUISINE_OPTIONS = [
    { value: "Việt Nam", label: t('search.cuisine_vn', "Việt Nam") },
    { value: "Hàn Quốc", label: t('search.cuisine_kr', "Hàn Quốc") },
    { value: "Nhật Bản", label: t('search.cuisine_jp', "Nhật Bản") },
    { value: "Thái Lan", label: t('search.cuisine_th', "Thái Lan") },
    { value: "Trung Quốc", label: t('search.cuisine_cn', "Trung Quốc") },
    { value: "Ý", label: t('search.cuisine_it', "Ý") },
    { value: "Pháp", label: t('search.cuisine_fr', "Pháp") },
    { value: "Âu/Mỹ", label: t('search.cuisine_eu_us', "Âu/Mỹ") },
    { value: "Ấn Độ", label: t('search.cuisine_in', "Ấn Độ") },
    { value: "Khác", label: t('search.cuisine_other', "Khác") }
  ];

  const CITY_OPTIONS = [
    { id: "Ho Chi Minh City", label: "Hồ Chí Minh" },
    { id: "Hanoi", label: "Hà Nội" },
    { id: "Da Nang", label: "Đà Nẵng" },
    { id: "Can Tho", label: "Cần Thơ" },
    { id: "Hai Phong", label: "Hải Phòng" },
    { id: "Dalat", label: "Đà Lạt" },
  ];

  // --- [NEW] HELPER FUNCTION LOAD STATE FROM SESSION ---
  function loadState<T>(key: string, defaultVal: T): T {
    try {
        const saved = sessionStorage.getItem("search_prefs");
        if (saved) {
            const parsed = JSON.parse(saved);
            // Ép kiểu kết quả về T nếu tìm thấy key
            return parsed[key] !== undefined ? (parsed[key] as T) : defaultVal;
        }
    } catch (e) { return defaultVal; }
    return defaultVal;
  }

  // --- STATE (INITIALIZED WITH CACHE) ---
  const [keyword, setKeyword] = useState(() => loadState('keyword', ""));
  const [userType, setUserType] = useState(() => loadState('userType', "balanced"));
  const [foodType, setFoodType] = useState(() => loadState('foodType', "both"));
  const [beverageOrFood, setBeverageOrFood] = useState(() => loadState('beverageOrFood', "both"));
  
  const [cuisine, setCuisine] = useState<string[]>(() => loadState('cuisine', [])); 
  const [flavors, setFlavors] = useState<string[]>(() => loadState('flavors', []));
  const [vibes, setVibes] = useState<string[]>(() => loadState('vibes', [])); 
  const [courseType, setCourseType] = useState(() => loadState('courseType', "both"));
  
  const [minPrice, setMinPrice] = useState(() => loadState('minPrice', "")); 
  const [maxPrice, setMaxPrice] = useState(() => loadState('maxPrice', ""));
  
  const [radius, setRadius] = useState(() => loadState('radius', [5]));
  const [district, setDistrict] = useState<string[]>(() => loadState('district', [])); 
  const [ratingMin, setRatingMin] = useState(() => loadState('ratingMin', 0));

  const [isLoading, setIsLoading] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // --- [NÂNG CẤP] LOGIC THỜI TIẾT ĐỘNG ---
  const [selectedCity, setSelectedCity] = useState("Ho Chi Minh City");
  const [weather, setWeather] = useState<{ temp: number; desc: string; city: string } | null>(null);

  useEffect(() => {
    // Gọi API kèm theo tham số city
    fetch(`http://127.0.0.1:5000/api/weather/current?city=${selectedCity}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.temp) {
          setWeather(data);
        } else {
            setWeather(null); // Reset nếu lỗi
        }
      })
      .catch(err => console.error("Weather err:", err));
  }, [selectedCity]); // Chạy lại khi selectedCity thay đổi

  // --- AUTO SCROLL & PARALLAX LISTENER ---
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const handleScroll = () => {
      requestAnimationFrame(() => {
        setScrollY(window.scrollY);
      });
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const MAPPINGS = {
    foodType: { vegetarian: "chay", "non-vegetarian": "mặn", both: "both" },
    beverageOrFood: { beverage: "nước", food: "khô", both: "both" },
    courseType: { main: "món chính", dessert: "tráng miệng", both: "both" },
    flavors: {
      sweet: "ngọt", salty: "mặn", spicy: "cay", sour: "chua",
      bitter: "đắng", fatty: "béo", light: "thanh"
    }
  };

  const handleCuisineChange = (val: string) => setCuisine([val]);
  const handleDistrictChange = (val: string) => setDistrict([val]);

  const handleFlavorToggle = (flavorId: string) => {
    setFlavors(prev => 
      prev.includes(flavorId) 
        ? prev.filter(f => f !== flavorId) 
        : [...prev, flavorId]
    );
  };

  const handleVibeToggle = (vibeId: string) => {
    setVibes(prev =>
        prev.includes(vibeId)
            ? prev.filter(v => v !== vibeId)
            : [...prev, vibeId]
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // --- [NEW] CACHE STATE TO SESSION STORAGE ---
    const currentPrefs = {
        keyword, userType, foodType, beverageOrFood,
        cuisine, flavors, vibes, courseType,
        minPrice, maxPrice, radius, district, ratingMin
    };
    sessionStorage.setItem("search_prefs", JSON.stringify(currentPrefs));

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      
      params.append("userType", userType);

      if (keyword) params.append("keyword", keyword);
      if (foodType !== 'both') params.append("foodType", MAPPINGS.foodType[foodType as keyof typeof MAPPINGS.foodType]);
      if (beverageOrFood !== 'both') params.append("beverageOrFood", MAPPINGS.beverageOrFood[beverageOrFood as keyof typeof MAPPINGS.beverageOrFood]);
      if (courseType !== 'both') params.append("courseType", MAPPINGS.courseType[courseType as keyof typeof MAPPINGS.courseType]);

      cuisine.forEach(c => params.append("cuisine", c));
      district.forEach(d => params.append("district", d));
      vibes.forEach(v => params.append("vibe", v)); 
      
      if (flavors.length > 0) {
          const mappedFlavors = flavors.map(f => MAPPINGS.flavors[f as keyof typeof MAPPINGS.flavors]);
          params.append("flavors", mappedFlavors.join(','));
      }

      const minP = minPrice ? parseInt(minPrice) : 0;
      const maxP = maxPrice ? parseInt(maxPrice) : 0;

      if (minP > 0) params.append("minPrice", minP.toString());
      if (maxP > 0) params.append("maxPrice", maxP.toString());

      params.append("radius", radius[0].toString());

      navigate(`/results?${params.toString()}`);
    } catch (error) {
      toast.error(t('common.error', "Lỗi xử lý tìm kiếm."));
    } finally {
      setIsLoading(false);
    }
  };

  // --- RENDER HELPERS ---
  const renderCompactCard = (id: string, label: string, isSelected: boolean, onClick: () => void) => (
    <div
      key={id}
      onClick={onClick}
      className={`
        relative flex items-center justify-center 
        h-10 cursor-pointer rounded-full border transition-all duration-200 select-none 
        px-5 min-w-[80px] text-sm whitespace-nowrap
        ${isSelected 
          ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm ring-1 ring-primary/20" 
          : "border-muted bg-white text-gray-600 hover:border-primary/50 hover:bg-gray-50"
        }
      `}
    >
      {label}
    </div>
  );

  const handlePriceChange = (val: string, setter: (v: string) => void) => {
      if (val === "") {
          setter("");
          return;
      }
      if (/^\d+$/.test(val)) {
          setter(val);
      }
  };

  const renderGridCard = (id: string, label: string, isSelected: boolean, onClick: () => void, hasCheckmark: boolean = true) => (
    <div
      key={id}
      onClick={onClick}
      className={`
        relative flex items-center justify-center 
        h-12 w-full cursor-pointer rounded-full border transition-all duration-200 select-none px-4
        ${isSelected 
          ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20" 
          : "border-muted bg-white hover:border-primary/50 hover:bg-gray-50"
        }
      `}
    >
      <span className={`text-sm font-medium ${isSelected ? "text-primary font-semibold" : "text-gray-600"}`}>
        {label}
      </span>
      {hasCheckmark && isSelected && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary animate-in zoom-in duration-200">
          <Check className="h-4 w-4" />
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      
      {/* --- NAVBAR STICKY --- */}
      <div className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md transition-all">
        <Navbar />
      </div>
      
      <div className="container mx-auto px-4 py-12 relative">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* --- PARALLAX TITLE --- */}
          <div 
            className="text-center relative z-0 origin-top"
            style={{
                transform: `translateY(${scrollY * 0.5}px) scale(${Math.max(0.8, 1 - scrollY * 0.001)})`,
                opacity: Math.max(0, 1 - scrollY * 0.003),
                transition: scrollY === 0 ? 'opacity 0.8s ease-out, transform 0.8s ease-out' : 'none' 
            }}
          >
            <div className="animate-slide-down opacity-0" style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}>
                <h1 className="text-4xl font-bold mb-3 tracking-tight">
                {t('search.hero_title_1', 'Tìm Kiếm Quán Ăn')}
                <span className="block bg-hero-gradient bg-clip-text text-transparent mt-1">
                  {t('search.hero_title_2', 'Hoàn Hảo Cho Bạn')}
                </span>
                </h1>
                <p className="text-muted-foreground text-lg">
                  {t('search.hero_desc', 'Cho chúng tôi biết sở thích của bạn để tìm ra lựa chọn phù hợp nhất')}
                </p>
            </div>
          </div>

          {/* --- [NÂNG CẤP] WEATHER WIDGET + CITY SELECTOR --- */}
          <div 
            className="relative z-10 mx-auto max-w-fit mb-8 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-700"
            style={{ transform: `translateY(-${scrollY * 0.15}px)` }}
          >
            {/* Dropdown chọn thành phố (Nhỏ gọn, tinh tế) */}
            <div className="bg-white/50 backdrop-blur-sm rounded-full border border-white/40 px-3 py-1 shadow-sm">
                <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-gray-500" />
                    <select 
                        className="bg-transparent text-xs font-semibold text-gray-700 outline-none cursor-pointer appearance-none text-center min-w-[80px]"
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                    >
                        {CITY_OPTIONS.map(c => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Widget hiển thị thông tin */}
            {weather && (
                <div className="flex items-center gap-3 bg-white/70 backdrop-blur-md border border-white/60 shadow-lg rounded-full py-2 px-5 hover:bg-white/80 transition-colors cursor-default">
                    <div className="bg-orange-100 p-1.5 rounded-full text-orange-500">
                        <CloudSun className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-0 md:gap-3">
                        <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <span>{weather.city}</span>
                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-md font-bold">
                                {Math.round(weather.temp)}°C
                            </span>
                        </div>
                        <div className="hidden md:block w-px h-4 bg-gray-300"></div>
                        <div className="text-xs font-medium text-emerald-600 italic capitalize">
                           {weather.desc} — {weather.temp < 20 ? "Trời lạnh, ăn đồ nướng/lẩu! 🍲" : (weather.temp > 30 ? "Nóng quá, giải khát thôi! 🍧" : "Thời tiết đẹp, đi ăn gì cũng ngon! 😋")}
                        </div>
                    </div>
                </div>
            )}
          </div>

          {/* --- PARALLAX FORM CARD --- */}
          <div 
            className="relative z-10"
            style={{
                transform: `translateY(-${scrollY * 0.1}px)`,
            }}
          >
            <Card className="p-6 md:p-8 shadow-2xl border-muted/60 bg-white/80 backdrop-blur-md opacity-0 animate-slide-up delay-200">
                <form onSubmit={handleSearch} className="space-y-8">
                
                {/* 1. KEYWORD */}
                <div className="space-y-3">
                    <Label htmlFor="keyword" className="text-base font-bold">{t('search.label_keyword', 'Từ khóa')}</Label>
                    <div className="relative group">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                        id="keyword" 
                        placeholder={t('search.ph_keyword', 'Tên quán, món ăn (VD: Phở Bò)...')} 
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="h-12 pl-10 text-base rounded-xl border-muted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    </div>
                </div>

                {/* --- SECTION PHONG CÁCH NGƯỜI DÙNG (USER TYPE) --- */}
                <div className="space-y-3">
                   <Label className="text-base font-bold">{t('search.label_style', 'Phong cách của bạn')}</Label>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                     {USER_TYPE_OPTIONS.map((opt) => {
                       const Icon = opt.icon;
                       const isSelected = userType === opt.id;
                       return (
                         <div
                           key={opt.id}
                           onClick={() => setUserType(opt.id)}
                           className={`
                             relative flex flex-col items-center justify-center p-3 cursor-pointer 
                             rounded-xl border-2 transition-all duration-200 select-none text-center h-24
                             ${isSelected 
                               ? "border-primary bg-primary/5 shadow-md scale-[1.02]" 
                               : "border-muted bg-white hover:border-primary/40 hover:bg-gray-50"
                             }
                           `}
                         >
                           <Icon className={`h-6 w-6 mb-1 ${isSelected ? "text-primary" : "text-gray-500"}`} />
                           <span className={`text-sm font-bold ${isSelected ? "text-primary" : "text-gray-700"}`}>
                             {opt.label}
                           </span>
                           <span className="text-[10px] text-muted-foreground line-clamp-1">
                             {opt.desc}
                           </span>
                           
                           {isSelected && (
                             <div className="absolute top-2 right-2 text-primary animate-in zoom-in">
                               <Check className="h-5 w-5" />
                             </div>
                           )}
                         </div>
                       );
                     })}
                   </div>
                </div>

                {/* 2. CUISINE */}
                <div className="space-y-3">
                    <Label className="text-base font-bold">{t('search.label_cuisine', 'Ẩm thực')}</Label>
                    <Select onValueChange={handleCuisineChange} value={cuisine.length > 0 ? cuisine[0] : undefined}>
                    <SelectTrigger className="h-12 text-base rounded-xl border-muted focus:ring-2 focus:ring-primary/20">
                        <SelectValue placeholder={t('search.ph_cuisine', 'Chọn nền ẩm thực')} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {CUISINE_OPTIONS.map(c => (
                            <SelectItem key={c.value} value={c.value} className="cursor-pointer focus:bg-primary/5 focus:text-primary font-medium py-2.5">
                                {c.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>

                {/* 3. HARD FILTERS (Loại, Món, Phân loại) */}
                <div className="space-y-6">
                    <div className="space-y-3">
                        <Label className="text-base font-bold">{t('search.label_diet', 'Chế độ ăn')}</Label>
                        <div className="flex flex-wrap gap-3"> 
                        {FOOD_TYPE_OPTIONS.map(opt => renderCompactCard(opt.id, opt.label, foodType === opt.id, () => setFoodType(opt.id)))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-base font-bold">{t('search.label_type', 'Loại hình')}</Label>
                        <div className="flex flex-wrap gap-3">
                        {BEV_FOOD_OPTIONS.map(opt => renderCompactCard(opt.id, opt.label, beverageOrFood === opt.id, () => setBeverageOrFood(opt.id)))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-base font-bold">{t('search.label_course', 'Phân loại món')}</Label>
                        <div className="flex flex-wrap gap-3">
                        {COURSE_TYPE_OPTIONS.map(opt => renderCompactCard(opt.id, opt.label, courseType === opt.id, () => setCourseType(opt.id)))}
                        </div>
                    </div>
                </div>

                {/* 4. FLAVORS */}
                <div className="space-y-3">
                    <Label className="text-base font-bold">{t('search.label_flavor', 'Bạn đang thèm vị gì?')}</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {FLAVOR_OPTIONS.map(opt => renderGridCard(opt.id, opt.label, flavors.includes(opt.id), () => handleFlavorToggle(opt.id), true))}
                    </div>
                </div>

                {/* 5. KHÔNG GIAN (VIBE) */}
                <div className="space-y-3">
                    <Label className="text-base font-bold">{t('search.label_vibe', 'Không gian')}</Label>
                    {/* UI Grid giống Flavor */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {VIBE_OPTIONS.map(opt => 
                            renderGridCard(
                                opt.id, 
                                opt.label, 
                                vibes.includes(opt.id), 
                                () => handleVibeToggle(opt.id), 
                                true 
                            )
                        )}
                    </div>
                </div>

                {/* 6. PRICE & BUDGET */}
                <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <Label className="text-base font-bold">{t('search.label_budget', 'Ngân sách (VNĐ)')}</Label>
                    <div className="grid grid-cols-2 gap-6 pt-2">
                    <div>
                        <Label htmlFor="minPrice" className="text-xs text-muted-foreground mb-2 block uppercase font-bold tracking-wider">{t('search.label_min', 'Tối thiểu')}</Label>
                        <div className="relative">
                        <Input 
                            id="minPrice" 
                            type="text" 
                            inputMode="numeric"
                            value={minPrice} 
                            onChange={(e) => handlePriceChange(e.target.value, setMinPrice)} 
                            placeholder="0" 
                            className="pl-8 h-11 font-medium" 
                        />
                        <span className="absolute left-3 top-3 text-muted-foreground text-sm font-semibold">₫</span>
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="maxPrice" className="text-xs text-muted-foreground mb-2 block uppercase font-bold tracking-wider">{t('search.label_max', 'Tối đa')}</Label>
                        <div className="relative">
                        <Input
                            id="maxPrice" 
                            type="text"
                            inputMode="numeric"
                            value={maxPrice} 
                            onChange={(e) => handlePriceChange(e.target.value, setMaxPrice)} 
                            placeholder="2000000" 
                            className="pl-8 h-11 font-medium" 
                        />
                        <span className="absolute left-3 top-3 text-muted-foreground text-sm font-semibold">₫</span>
                        </div>
                    </div>
                    </div>
                </div>

                {/* 7. RADIUS & DISTRICT */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                        <Label className="text-base font-semibold">{t('search.label_radius', 'Bán kính')}</Label>
                        <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">{radius[0]} km</span>
                        </div>
                        <Slider
                        value={radius}
                        onValueChange={setRadius}
                        min={1} max={20} step={1}
                        className="w-full py-2"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="district" className="text-base font-bold">{t('search.label_district', 'Khu vực')}</Label>
                        <Input
                        id="district"
                        placeholder={t('search.ph_district', 'VD: Quận 1...')}
                        value={district}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        className="h-11 rounded-xl"
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full h-14 text-lg font-bold bg-hero-gradient hover:opacity-90 transition-all shadow-lg hover:shadow-primary/30 rounded-xl mt-6 active:scale-[0.99]"
                    disabled={isLoading}
                >
                    {isLoading ? (
                    <span className="flex items-center gap-2">{t('common.processing', 'Đang xử lý...')}</span>
                    ) : (
                    <>
                        <Search className="mr-2 h-5 w-5" /> {t('search.btn_submit', 'Tìm Kiếm Ngay')}
                    </>
                    )}
                </Button>
                </form>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SearchPage;