import { useState, useEffect, KeyboardEvent } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios"; 
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, Navigation, ListChecks } from "lucide-react";
import { toast } from "sonner";
import RouteMap from "@/components/RouteMap"; 
import { useCart } from "@/context/CartContext";

// --- INTERFACES ---
interface Waypoint {
  id: string;
  address?: string;
  lat: number;
  lon: number;
}

interface StartPointCoords {
  lat: number;
  lon: number;
}

// Interface khớp với phản hồi mới từ Backend
interface OptimizeResponse {
  optimized_order: string[];
  distance_km: number;
  duration_min: number;
  polyline_outbound: string; // Đường chiều đi (Xanh)
  polyline_return: string;   // Đường chiều về (Cam)
  start_point_coords: StartPointCoords;
  waypoints: Waypoint[];
}

interface InitialPlace {
  name: string;
  address: string;
}

const OptimizeRoutePage = () => {
  // --- STATES ---
  const [searchParams] = useSearchParams();
  const [startPoint, setStartPoint] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  // Kết quả hiển thị
  const [optimizedRoute, setOptimizedRoute] = useState<string[]>([]);
  const [routeInfo, setRouteInfo] = useState({ distance: "", duration: "" });
  
  // Tách thành 2 state cho 2 đoạn đường
  const [polyOutbound, setPolyOutbound] = useState<string | null>(null);
  const [polyReturn, setPolyReturn] = useState<string | null>(null);
  
  const [mapPoints, setMapPoints] = useState<Waypoint[]>([]);
  const [initialPlaces, setInitialPlaces] = useState<InitialPlace[]>([]);
  
  // State dùng để zoom map khi click vào thẻ
  const [focusPoint, setFocusPoint] = useState<{lat: number, lon: number} | null>(null);

  const { clearCart } = useCart(); 

  // --- EFFECT: Lấy dữ liệu ban đầu từ URL ---
  useEffect(() => {
    const separator = "|||";
    const namesStr = searchParams.get("names") || "";
    const addressesStr = searchParams.get("addresses") || "";
    
    if (namesStr && addressesStr) {
      const names = namesStr.split(separator);
      const addresses = addressesStr.split(separator);
      const places = names.map((name, index) => ({
        name: name,
        address: addresses[index] || ""
      }));
      setInitialPlaces(places);
    }
  }, [searchParams]);

  // --- FUNCTION: Xử lý tối ưu hóa ---
  const handleOptimize = async () => {
    if (!startPoint) {
      toast.error("Vui lòng nhập điểm xuất phát");
      return;
    }

    setIsOptimizing(true);
    setFocusPoint(null); // Reset trạng thái focus
    setOptimizedRoute([]);
    setRouteInfo({ distance: "", duration: "" });
    setPolyOutbound(null);
    setPolyReturn(null);
    setMapPoints([]);

    try {
      // 1. Lấy và kiểm tra dữ liệu từ URL
      const separator = "|||";
      const addressesStr = searchParams.get("addresses") || "";
      const namesStr = searchParams.get("names") || "";
      const latsStr = searchParams.get("lats"); 
      const lngsStr = searchParams.get("lngs"); 

      if (!latsStr || !lngsStr) {
        toast.error("Thiếu dữ liệu tọa độ. Vui lòng chọn lại.");
        setIsOptimizing(false);
        return;
      }

      const addresses = addressesStr.split(separator);
      const names = namesStr.split(separator);
      const lats = latsStr.split(separator);
      const lngs = lngsStr.split(separator);

      if (addresses.length === 0 || addresses.length !== names.length) {
        toast.error("Dữ liệu không đồng bộ.");
        setIsOptimizing(false);
        return;
      }
      
      // 2. Chuẩn bị payload gửi Backend
      const placesPayload = addresses.map((address, index) => {
        const latVal = parseFloat(lats[index] || "0");
        const lngVal = parseFloat(lngs[index] || "0");
        return {
          name: names[index],
          address: address,
          lat: isNaN(latVal) ? 0 : latVal,
          lng: isNaN(lngVal) ? 0 : lngVal
        };
      });

      // 3. Gọi API
      const response = await axios.post<OptimizeResponse>(
        'http://localhost:5000/api/optimize', 
        { places: placesPayload, starting_point: startPoint }
      );
      
      const data = response.data;

      // 4. Cập nhật State hiển thị
      const formattedRoute = [
        `Xuất phát: ${startPoint}`,
        ...data.optimized_order.map((placeName, index) => `${index + 1}. ${placeName}`),
        `Kết thúc: ${startPoint}`
      ];
      setOptimizedRoute(formattedRoute);
      
      setRouteInfo({
        distance: `${data.distance_km.toFixed(1)} km`,
        duration: `${Math.round(data.duration_min)} phút`,
      });
      
      // Cập nhật 2 đường đi riêng biệt
      setPolyOutbound(data.polyline_outbound);
      setPolyReturn(data.polyline_return);

      // Tạo danh sách điểm để hiển thị Marker
      const start_Point: Waypoint = {
        id: 'Điểm xuất phát',
        address: startPoint,
        ...data.start_point_coords,
      };
      
      // Gộp điểm đầu và các điểm trung gian
      setMapPoints([start_Point, ...data.waypoints]);

      toast.success("Đã tối ưu hóa lộ trình!");
      clearCart();

    } catch (error: unknown) {
      console.error("Lỗi:", error);
      let errorMessage = "Tối ưu hóa thất bại";
      if (axios.isAxiosError(error) && error.response?.data?.error) {
          errorMessage = error.response.data.error;
      }
      toast.error(errorMessage);
    } finally {
      setIsOptimizing(false);
    }
  };

  // --- FUNCTION: Xử lý khi click vào thẻ địa điểm ---
  const handleCardClick = (index: number) => {
      if (mapPoints.length === 0) return;

      let targetPoint;
      // Index 0: Start Point
      // Index 1..n: Waypoints
      // Index n+1: End Point (chính là Start Point)
      
      if (index === 0 || index === optimizedRoute.length - 1) {
          targetPoint = mapPoints[0]; // Start point
      } else {
          // Vì danh sách optimizedRoute có thêm dòng "Xuất phát", nên index waypoint bị lệch 1
          targetPoint = mapPoints[index]; 
      }

      if (targetPoint) {
          setFocusPoint({ lat: targetPoint.lat, lon: targetPoint.lon });
      }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isOptimizing && startPoint) {
      e.preventDefault();
      handleOptimize();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      {/* Container chính: Giới hạn chiều cao để tính toán cuộn */}
      <div className="container mx-auto px-4 py-8 h-[calc(100vh-80px)]">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Tối ưu hóa Lộ trình</h1>
          <p className="text-muted-foreground">
            Tạo lộ trình hiệu quả nhất để ghé thăm tất cả các nhà hàng đã chọn
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 h-full">
          
          {/* === CỘT TRÁI: INPUT & DANH SÁCH (Scrollable) === */}
          <div className="lg:col-span-1 space-y-6 h-full overflow-y-auto pr-2 pb-20 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            
            {/* Card nhập liệu */}
            <Card className="p-6 shadow-sm">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="startPoint">Điểm xuất phát</Label>
                  <Input
                    id="startPoint"
                    placeholder="VD: Khách sạn hoặc địa chỉ cụ thể"
                    value={startPoint}
                    onChange={(e) => setStartPoint(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="mt-2"
                  />
                </div>
                <Button
                  onClick={handleOptimize}
                  className="w-full bg-green-600 hover:bg-green-700 text-white transition-colors"
                  disabled={isOptimizing}
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Đang tính toán...
                    </>
                  ) : (
                    <>
                      <Navigation className="mr-2 h-5 w-5" />
                      Tìm đường tối ưu
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Danh sách chờ (Chưa tối ưu) */}
            {optimizedRoute.length === 0 && initialPlaces.length > 0 && (
              <Card className="p-6 border-dashed border-2">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <ListChecks className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">Điểm cần đến ({initialPlaces.length})</h3>
                  </div>
                  <div className="space-y-3">
                    {initialPlaces.map((place, index) => (
                      <div key={index} className="flex gap-3 p-3 bg-secondary/20 rounded-lg">
                        <div className="h-6 w-6 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full text-xs font-bold border shadow-sm shrink-0 text-green-700">
                           {index + 1}
                        </div>
                        <div className="text-sm">
                           <p className="font-medium line-clamp-1">{place.name}</p>
                           <p className="text-muted-foreground text-xs line-clamp-1">{place.address}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Kết quả lộ trình (Đã tối ưu) */}
            {optimizedRoute.length > 0 && (
              <Card className="p-6 bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 shadow-sm">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg mb-4 text-green-800 dark:text-green-400 flex items-center gap-2">
                    <MapPin className="h-5 w-5" /> Lộ trình gợi ý
                  </h3>
                  <div className="space-y-3">
                    {optimizedRoute.map((stop, index) => (
                      <div
                        key={index}
                        onClick={() => handleCardClick(index)} // Click để zoom map
                        className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all border border-transparent hover:border-green-400 group"
                      >
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-sm ${
                            index === 0 || index === optimizedRoute.length - 1 
                            ? 'bg-green-700' 
                            : 'bg-green-500'
                        }`}>
                          {index === 0 || index === optimizedRoute.length - 1 ? (
                            <Navigation className="h-4 w-4" />
                          ) : (
                            index
                          )}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-green-700 transition-colors">
                            {stop}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Thông tin tổng quan */}
            {optimizedRoute.length > 0 && (
              <Card className="p-6 shadow-sm">
                <h3 className="font-semibold mb-4 text-gray-700 dark:text-gray-300">Tổng quan chuyến đi</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-muted-foreground">Tổng quãng đường:</span>
                    <span className="font-bold text-green-600 text-base">{routeInfo.distance}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-muted-foreground">Thời gian dự kiến:</span>
                    <span className="font-bold text-green-600 text-base">{routeInfo.duration}</span>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* === CỘT PHẢI: MAP (Sticky) === */}
          <div className="lg:col-span-2 h-[500px] lg:h-full relative">
            <div className="sticky top-0 h-full w-full">
                <Card className="p-0 overflow-hidden h-full w-full shadow-lg border-0 rounded-xl ring-1 ring-gray-200">
                {optimizedRoute.length > 0 ? (
                    <RouteMap 
                        polylineOutbound={polyOutbound} 
                        polylineReturn={polyReturn}
                        points={mapPoints} 
                        focusPoint={focusPoint}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center flex-col gap-4 bg-gray-50 dark:bg-gray-900/50 text-gray-400">
                        <div className="p-6 bg-white dark:bg-gray-800 rounded-full shadow-sm">
                            <Navigation className="h-16 w-16 opacity-20 text-green-600" />
                        </div>
                        <div className="text-center px-6">
                            <p className="text-lg font-medium text-gray-600 dark:text-gray-300">Bản đồ lộ trình</p>
                            <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
                            Nhập điểm xuất phát và nhấn "Tìm đường tối ưu" để xem chi tiết trên bản đồ.
                            </p>
                        </div>
                    </div>
                )}
                </Card>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OptimizeRoutePage;