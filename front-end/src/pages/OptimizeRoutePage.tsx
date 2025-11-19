import { useState, KeyboardEvent } from "react"; // 1. Import thêm KeyboardEvent
import { useSearchParams } from "react-router-dom";
import axios from "axios"; 
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, Navigation } from "lucide-react";
import { toast } from "sonner";
import RouteMap from "@/pages/RouteMap"; 

// --- Interface (Giữ nguyên) ---
interface Waypoint {
  id: string;
  lat: number;
  lon: number;
}
interface StartPointCoords {
  lat: number;
  lon: number;
}
interface GeoJSONLineString {
  type: "LineString";
  coordinates: [number, number][]; 
}
interface OptimizeResponse {
  optimized_order: string[];
  distance_km: number;
  duration_min: number;
  polyline: GeoJSONLineString;
  start_point_coords: StartPointCoords;
  waypoints: Waypoint[];
}
// --- Hết Interface ---

const OptimizeRoutePage = () => {
  // --- States (Giữ nguyên) ---
  const [searchParams] = useSearchParams();
  const [startPoint, setStartPoint] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<string[]>([]);
  const [routeInfo, setRouteInfo] = useState({ distance: "", duration: "" });
  const [routePolyline, setRoutePolyline] = useState<GeoJSONLineString | null>(null);
  const [mapPoints, setMapPoints] = useState<Waypoint[]>([]);
  // --- Hết States ---

  // --- handleOptimize (Giữ nguyên) ---
  const handleOptimize = async () => {
    if (!startPoint) {
      toast.error("Vui lòng nhập điểm xuất phát");
      return;
    }

    setIsOptimizing(true);
    setOptimizedRoute([]);
    setRouteInfo({ distance: "", duration: "" });
    setRoutePolyline(null);
    setMapPoints([]);

    try {
      const separator = "|||";
      const addressesStr = searchParams.get("addresses") || "";
      const namesStr = searchParams.get("names") || "";

      const addresses = addressesStr.split(separator);
      const names = namesStr.split(separator);

      if (addresses.length === 0 || addresses[0] === "" || addresses.length !== names.length) {
        toast.error("Không có địa điểm nào được chọn hoặc dữ liệu không hợp lệ.");
        setIsOptimizing(false);
        return;
      }
      
      const placesPayload = addresses.map((address, index) => ({
        name: names[index],
        address: address
      }));

      const response = await axios.post<OptimizeResponse>(
        'http://localhost:5000/api/optimize', 
        {
          places: placesPayload,
          starting_point: startPoint
        }
      );
      
      const data = response.data;

      const formattedRoute = [
        `Xuất phát: ${startPoint}`,
        ...data.optimized_order.map((placeName, index) => {
          return `${index + 1}. ${placeName}`;
        }),
        `Kết thúc: ${startPoint}`
      ];
      setOptimizedRoute(formattedRoute);
      
      setRouteInfo({
        distance: `${data.distance_km.toFixed(1)} km`,
        duration: `${Math.round(data.duration_min)} phút`,
      });
      
      setRoutePolyline(data.polyline);

      const start_Point: Waypoint = {
        id: 'start-point',
        ...data.start_point_coords,
      };
      const end_Point: Waypoint = {
        id: 'end-point',
        ...data.start_point_coords,
      };
      const allPoints = [start_Point, ...data.waypoints, end_Point];
      setMapPoints(allPoints);

      toast.success("Đã tối ưu hóa lộ trình!");

    } catch (error: unknown) {
      console.error("Lỗi khi tối ưu hóa:", error);
      let errorMessage = "Tối ưu hóa thất bại";
      
      if (axios.isAxiosError(error)) {
        const serverError = error.response?.data as { error?: string } | undefined;
        if (serverError && typeof serverError.error === "string") {
          errorMessage = serverError.error;
        } else if (typeof error.message === "string") {
          errorMessage = error.message;
        }
      } else if (error instanceof Error && typeof error.message === "string") {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsOptimizing(false);
    }
  };
  // --- Hết handleOptimize ---

  // --- BẮT ĐẦU THAY ĐỔI 1: Thêm hàm xử lý KeyDown ---
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Nếu nhấn phím Enter, không đang tối ưu, và có điểm xuất phát
    if (e.key === 'Enter' && !isOptimizing && startPoint) {
      e.preventDefault(); // Ngăn hành vi mặc định (nếu có)
      handleOptimize();
    }
  };
  // --- KẾT THÚC THAY ĐỔI 1 ---

  // --- JSX ---
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Tối ưu hóa Lộ trình</h1>
          <p className="text-muted-foreground">
            Tạo lộ trình hiệu quả nhất để ghé thăm tất cả các nhà hàng đã chọn
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* === CỘT BÊN TRÁI === */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* 1. Card: Điểm xuất phát */}
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="startPoint">Điểm xuất phát</Label>
                  <Input
                    id="startPoint"
                    placeholder="VD: Khách sạn hoặc địa chỉ"
                    value={startPoint}
                    onChange={(e) => setStartPoint(e.target.value)}
                    onKeyDown={handleKeyDown} // --- THAY ĐỔI 2: Thêm prop onKeyDown ---
                    className="mt-2"
                  />
                </div>
                <Button
                  onClick={handleOptimize}
                  className="w-full bg-hero-gradient hover:opacity-90"
                  disabled={isOptimizing}
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Đang tối ưu...
                    </>
                  ) : (
                    <>
                      <Navigation className="mr-2 h-5 w-5" />
                      Tối ưu hóa
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* 2. Card: Lộ trình đã Tối ưu hóa */}
            {optimizedRoute.length > 0 && (
              <Card className="p-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg mb-4">Lộ trình đã Tối ưu hóa</h3>
                  {optimizedRoute.map((stop, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                        {index === 0 || index === optimizedRoute.length - 1 ? (
                          <MapPin className="h-5 w-5" />
                        ) : (
                          index
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{stop}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* 3. Card: Tóm tắt Lộ trình */}
            {optimizedRoute.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Tóm tắt Lộ trình</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tổng quãng đường:</span>
                    <span className="font-medium">{routeInfo.distance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Thời gian (ước tính):</span>
                    <span className="font-medium">{routeInfo.duration}</span>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* === CỘT BÊN PHẢI (CHỈ CHỨA MAP) === */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              {optimizedRoute.length > 0 ? (
                
                // 1. Trạng thái CÓ kết quả: Hiển thị Map
                <div className="h-[500px] rounded-lg">
                  <RouteMap polylineData={routePolyline} points={mapPoints} />
                </div>

              ) : (
                
                // 2. Trạng thái KHÔNG có kết quả: Hiển thị Placeholder
                <div className="h-[500px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Navigation className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nhập điểm xuất phát và nhấn Tối ưu hóa để xem lộ trình</p>
                  </div>
                </div>

              )}
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OptimizeRoutePage;