import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import Navbar from "@/components/Navbar";
import { Search, Check } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/api-config";

// ... (GIỮ NGUYÊN CONST OPTIONS) ...
const FOOD_TYPE_OPTIONS = [
  { id: "vegetarian", label: "Chay" },
  { id: "non-vegetarian", label: "Mặn" },
  { id: "both", label: "Tất cả" },
];
const BEV_FOOD_OPTIONS = [
  { id: "beverage", label: "Đồ uống" },
  { id: "food", label: "Đồ ăn" },
  { id: "both", label: "Tất cả" },
];
const COURSE_TYPE_OPTIONS = [
  { id: "main", label: "Món chính" },
  { id: "dessert", label: "Tráng miệng" },
  { id: "both", label: "Tất cả" },
];
const FLAVOR_OPTIONS = [
  { id: "sweet", label: "Ngọt" },
  { id: "salty", label: "Mặn" },
  { id: "spicy", label: "Cay" },
  { id: "sour", label: "Chua" },
  { id: "bitter", label: "Đắng" },
  { id: "fatty", label: "Béo" },
  { id: "light", label: "Thanh đạm" },
];
const CUISINE_OPTIONS = [
  "Việt Nam", "Hàn Quốc", "Nhật Bản", "Thái Lan", "Trung Quốc", 
  "Ý", "Pháp", "Âu/Mỹ", "Ấn Độ", "Khác"
];

const SearchPage = () => {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [keyword, setKeyword] = useState("");
  const [foodType, setFoodType] = useState("both");
  const [beverageOrFood, setBeverageOrFood] = useState("both");
  const [cuisine, setCuisine] = useState<string[]>([]); 
  const [flavors, setFlavors] = useState<string[]>([]);
  const [courseType, setCourseType] = useState("both");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(2000000);
  const [radius, setRadius] = useState([5]);
  const [district, setDistrict] = useState<string[]>([]); 
  const [ratingMin, setRatingMin] = useState(0);

  const [isLoading, setIsLoading] = useState(false);

  // --- PARALLAX STATE ---
  const [scrollY, setScrollY] = useState(0);

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

  // --- MAPPING LOGIC (Giữ nguyên) ---
  const MAPPINGS = {
    foodType: { vegetarian: "chay", "non-vegetarian": "mặn", both: "both" },
    beverageOrFood: { beverage: "nước", food: "khô", both: "both" },
    courseType: { main: "món chính", dessert: "tráng miệng", both: "both" },
    flavors: {
      sweet: "ngọt", salty: "mặn", spicy: "cay", sour: "chua",
      bitter: "đắng", fatty: "béo", light: "thanh đạm"
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.append("keyword", keyword);
      if (foodType !== 'both') params.append("foodType", MAPPINGS.foodType[foodType as keyof typeof MAPPINGS.foodType]);
      if (beverageOrFood !== 'both') params.append("beverageOrFood", MAPPINGS.beverageOrFood[beverageOrFood as keyof typeof MAPPINGS.beverageOrFood]);
      if (courseType !== 'both') params.append("courseType", MAPPINGS.courseType[courseType as keyof typeof MAPPINGS.courseType]);

      cuisine.forEach(c => params.append("cuisine", c));
      district.forEach(d => params.append("district", d));
      
      if (flavors.length > 0) {
          const mappedFlavors = flavors.map(f => MAPPINGS.flavors[f as keyof typeof MAPPINGS.flavors]);
          params.append("flavors", mappedFlavors.join(','));
      }

      if (minPrice > 0) params.append("minPrice", minPrice.toString());
      if (maxPrice < 10000000) params.append("maxPrice", maxPrice.toString());
      params.append("radius", radius[0].toString());
      if (ratingMin > 0) params.append("ratingMin", ratingMin.toString());

      navigate(`/results?${params.toString()}`);
    } catch (error) {
      toast.error("Lỗi xử lý tìm kiếm.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- RENDER HELPER COMPACT ---
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

  // --- RENDER HELPER GRID ---
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
                Tìm Kiếm Quán Ăn
                <span className="block bg-hero-gradient bg-clip-text text-transparent mt-1">
                    Hoàn Hảo Cho Bạn
                </span>
                </h1>
                <p className="text-muted-foreground text-lg">
                Cho chúng tôi biết sở thích của bạn để tìm ra lựa chọn phù hợp nhất
                </p>
            </div>
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
                
                {/* ... (TOÀN BỘ NỘI DUNG FORM GIỮ NGUYÊN NHƯ CŨ) ... */}
                <div className="space-y-3">
                    <Label htmlFor="keyword" className="text-base font-bold">Từ khóa</Label>
                    <div className="relative group">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                        id="keyword" 
                        placeholder="Tên quán, món ăn (VD: Phở Bò)..." 
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="h-12 pl-10 text-base rounded-xl border-muted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    </div>
                </div>

                <div className="space-y-3">
                    <Label className="text-base font-bold">Ẩm thực</Label>
                    <Select onValueChange={handleCuisineChange}>
                    <SelectTrigger className="h-12 text-base rounded-xl border-muted focus:ring-2 focus:ring-primary/20">
                        <SelectValue placeholder="Chọn nền ẩm thực" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {CUISINE_OPTIONS.map(c => (
                            <SelectItem key={c} value={c} className="cursor-pointer focus:bg-primary/5 focus:text-primary font-medium py-2.5">{c}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>

                <div className="space-y-6">
                    <div className="space-y-3">
                        <Label className="text-base font-bold">Chế độ ăn</Label>
                        <div className="flex flex-wrap gap-3"> 
                        {FOOD_TYPE_OPTIONS.map(opt => renderCompactCard(opt.id, opt.label, foodType === opt.id, () => setFoodType(opt.id)))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-base font-bold">Loại hình</Label>
                        <div className="flex flex-wrap gap-3">
                        {BEV_FOOD_OPTIONS.map(opt => renderCompactCard(opt.id, opt.label, beverageOrFood === opt.id, () => setBeverageOrFood(opt.id)))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-base font-bold">Phân loại món</Label>
                        <div className="flex flex-wrap gap-3">
                        {COURSE_TYPE_OPTIONS.map(opt => renderCompactCard(opt.id, opt.label, courseType === opt.id, () => setCourseType(opt.id)))}
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <Label className="text-base font-bold">Bạn đang thèm vị gì?</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {FLAVOR_OPTIONS.map(opt => renderGridCard(opt.id, opt.label, flavors.includes(opt.id), () => handleFlavorToggle(opt.id), true))}
                    </div>
                </div>

                <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <Label className="text-base font-bold">Ngân sách (VNĐ)</Label>
                    <div className="grid grid-cols-2 gap-6 pt-2">
                    <div>
                        <Label htmlFor="minPrice" className="text-xs text-muted-foreground mb-2 block uppercase font-bold tracking-wider">Tối thiểu</Label>
                        <div className="relative">
                        <Input
                            id="minPrice"
                            type="number"
                            value={minPrice}
                            onChange={(e) => setMinPrice(Number(e.target.value))}
                            className="pl-8 h-11 font-medium"
                            step={10000}
                        />
                        <span className="absolute left-3 top-3 text-muted-foreground text-sm font-semibold">₫</span>
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="maxPrice" className="text-xs text-muted-foreground mb-2 block uppercase font-bold tracking-wider">Tối đa</Label>
                        <div className="relative">
                        <Input
                            id="maxPrice"
                            type="number"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(Number(e.target.value))}
                            className="pl-8 h-11 font-medium"
                            step={10000}
                        />
                        <span className="absolute left-3 top-3 text-muted-foreground text-sm font-semibold">₫</span>
                        </div>
                    </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                        <Label className="text-base font-semibold">Bán kính</Label>
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
                        <Label htmlFor="district" className="text-base font-bold">Khu vực</Label>
                        <Input
                        id="district"
                        placeholder="VD: Quận 1..."
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
                    <span className="flex items-center gap-2">Đang xử lý...</span>
                    ) : (
                    <>
                        <Search className="mr-2 h-5 w-5" /> Tìm Kiếm Ngay
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