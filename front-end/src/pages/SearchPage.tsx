import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import Navbar from "@/components/Navbar";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { SearchFilters } from "@/types"; // Import type

const SearchPage = () => {
  const navigate = useNavigate();
  // State mới khớp với SearchFilters
  const [keyword, setKeyword] = useState("");
  const [foodType, setFoodType] = useState("both");
  const [beverageOrFood, setBeverageOrFood] = useState("both");
  const [cuisine, setCuisine] = useState<string[]>([]); // Array
  const [flavors, setFlavors] = useState<string[]>([]);
  const [courseType, setCourseType] = useState("both");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(2000000);
  const [radius, setRadius] = useState([5]);
  const [district, setDistrict] = useState<string[]>([]); // Array
  const [ratingMin, setRatingMin] = useState(0);

  const [isLoading, setIsLoading] = useState(false);

  const handleCuisineChange = (val: string) => {
     // Logic demo: Nếu UI vẫn là Select đơn, ta đưa vào mảng 1 phần tử
     setCuisine([val]); 
  };

  const handleDistrictChange = (val: string) => {
     setDistrict([val]);
  };

  const handleFlavorChange = (flavor: string, checked: boolean) => {
    if (checked) {
      setFlavors([...flavors, flavor]);
    } else {
      setFlavors(flavors.filter(f => f !== flavor));
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Xây dựng Query Params
      const params = new URLSearchParams();

      if (keyword) params.append("keyword", keyword);
      params.append("foodType", foodType);
      params.append("beverageOrFood", beverageOrFood);
      
      // Append mảng (cuisine=A&cuisine=B)
      cuisine.forEach(c => params.append("cuisine", c));
      district.forEach(d => params.append("district", d));
      
      params.append("flavors", flavors.join(',')); // Backend sẽ split dấu phẩy
      params.append("courseType", courseType);
      params.append("minPrice", minPrice.toString());
      params.append("maxPrice", maxPrice.toString());
      params.append("radius", radius[0].toString());
      params.append("ratingMin", ratingMin.toString());

      // Navigate sang trang kết quả với params thực tế
      navigate(`/results?${params.toString()}`);
    } catch (error) {
      toast.error("Lỗi xử lý tìm kiếm.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-3">
              Tìm Kiếm Quán Ăn
              <span className="block bg-hero-gradient bg-clip-text text-transparent">
                Hoàn Hảo Cho Bạn
              </span>
            </h1>
            <p className="text-muted-foreground">
              Cho chúng tôi biết sở thích của bạn để tìm ra lựa chọn phù hợp nhất
            </p>
          </div>

          <Card className="p-8">
            <form onSubmit={handleSearch} className="space-y-8">
              <div className="space-y-2">
                <Label htmlFor="keyword">Từ khóa</Label>
                <Input 
                  id="keyword" 
                  placeholder="Tên quán, món ăn..." 
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
              {/* Món của quốc gia nào */}
              <div className="space-y-2">
                <Label>Ẩm thực</Label>
                <Select onValueChange={handleCuisineChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn ẩm thực" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vietnamese">Việt Nam</SelectItem>
                    <SelectItem value="korean">Hàn Quốc</SelectItem>
                    <SelectItem value="japanese">Nhật Bản</SelectItem>
                    <SelectItem value="thai">Thái Lan</SelectItem>
                    <SelectItem value="chinese">Trung Quốc</SelectItem>
                    <SelectItem value="italian">Ý</SelectItem>
                    <SelectItem value="french">Pháp</SelectItem>
                    <SelectItem value="american">Mỹ</SelectItem>
                    <SelectItem value="indian">Ấn Độ</SelectItem>
                    <SelectItem value="other">Khác</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Loại đồ ăn */}
              <div className="space-y-3">
                <Label>Loại đồ ăn</Label>
                <RadioGroup value={foodType} onValueChange={setFoodType}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="vegetarian" id="vegetarian" />
                    <Label htmlFor="vegetarian" className="font-normal cursor-pointer">Chay</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="non-vegetarian" id="non-vegetarian" />
                    <Label htmlFor="non-vegetarian" className="font-normal cursor-pointer">Mặn</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="food-both" />
                    <Label htmlFor="food-both" className="font-normal cursor-pointer">Cả hai</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Đồ nước hay khô */}
              <div className="space-y-3">
                <Label>Đồ uống hay đồ ăn</Label>
                <RadioGroup value={beverageOrFood} onValueChange={setBeverageOrFood}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="beverage" id="beverage" />
                    <Label htmlFor="beverage" className="font-normal cursor-pointer">Đồ nước</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="food" id="food" />
                    <Label htmlFor="food" className="font-normal cursor-pointer">Đồ khô</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="bev-both" />
                    <Label htmlFor="bev-both" className="font-normal cursor-pointer">Cả hai</Label>
                  </div>
                </RadioGroup>
              </div>

              

              {/* Vị như nào */}
              <div className="space-y-3">
                <Label>Hương vị</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="sweet" 
                      checked={flavors.includes("sweet")}
                      onCheckedChange={(checked) => handleFlavorChange("sweet", checked as boolean)}
                    />
                    <Label htmlFor="sweet" className="font-normal cursor-pointer">Ngọt</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="salty" 
                      checked={flavors.includes("salty")}
                      onCheckedChange={(checked) => handleFlavorChange("salty", checked as boolean)}
                    />
                    <Label htmlFor="salty" className="font-normal cursor-pointer">Mặn</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="spicy" 
                      checked={flavors.includes("spicy")}
                      onCheckedChange={(checked) => handleFlavorChange("spicy", checked as boolean)}
                    />
                    <Label htmlFor="spicy" className="font-normal cursor-pointer">Cay</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="sour" 
                      checked={flavors.includes("sour")}
                      onCheckedChange={(checked) => handleFlavorChange("sour", checked as boolean)}
                    />
                    <Label htmlFor="sour" className="font-normal cursor-pointer">Chua</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="bitter" 
                      checked={flavors.includes("bitter")}
                      onCheckedChange={(checked) => handleFlavorChange("bitter", checked as boolean)}
                    />
                    <Label htmlFor="bitter" className="font-normal cursor-pointer">Đắng</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="umami" 
                      checked={flavors.includes("umami")}
                      onCheckedChange={(checked) => handleFlavorChange("umami", checked as boolean)}
                    />
                    <Label htmlFor="umami" className="font-normal cursor-pointer">Umami</Label>
                  </div>
                </div>
              </div>

              {/* Món chính hay tráng miệng */}
              <div className="space-y-3">
                <Label>Loại món</Label>
                <RadioGroup value={courseType} onValueChange={setCourseType}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="main" id="main" />
                    <Label htmlFor="main" className="font-normal cursor-pointer">Món chính</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dessert" id="dessert" />
                    <Label htmlFor="dessert" className="font-normal cursor-pointer">Tráng miệng</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="course-both" />
                    <Label htmlFor="course-both" className="font-normal cursor-pointer">Cả hai</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Giá tiền */}
              <div className="space-y-3">
                <Label>Khoảng giá (VNĐ)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minPrice" className="text-sm text-muted-foreground">Tối thiểu</Label>
                    <Input
                      id="minPrice"
                      type="number"
                      value={minPrice}
                      onChange={(e) => setMinPrice(Number(e.target.value))}
                      min={0}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxPrice" className="text-sm text-muted-foreground">Tối đa</Label>
                    <Input
                      id="maxPrice"
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(Number(e.target.value))}
                      min={0}
                    />
                  </div>
                </div>
              </div>

              {/* Bán kính */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Bán kính tìm kiếm</Label>
                  <span className="text-sm text-muted-foreground">{radius[0]} km</span>
                </div>
                <Slider
                  value={radius}
                  onValueChange={setRadius}
                  min={1}
                  max={20}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Khu vực */}
              <div className="space-y-2">
                <Label htmlFor="district">Khu vực *</Label>
                <Input
                  id="district"
                  type="text"
                  placeholder="VD: Quận 1, Thủ Đức..."
                  value={district}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-hero-gradient hover:opacity-90"
                disabled={isLoading}
              >
                <Search className="mr-2 h-5 w-5" />
                {isLoading ? "Đang tìm kiếm..." : "Tìm kiếm quán ăn"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
