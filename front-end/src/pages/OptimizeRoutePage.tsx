import { useState, useEffect, KeyboardEvent } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios"; 
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch"; 
import { 
  MapPin, Loader2, Navigation, ListChecks, 
  GripVertical
} from "lucide-react";
import { toast } from "sonner";
import RouteMap from "@/components/RouteMap"; 
import { useCart } from "@/context/CartContext";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/api-config";

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

interface OptimizeResponse {
  optimized_order: string[];
  distance_km: number;
  duration_min: number;
  polyline_outbound: string; 
  polyline_return: string;   
  start_point_coords: StartPointCoords;
  waypoints: Waypoint[];
}

interface InitialPlace {
  name: string;
  address: string;
  lat?: number;
  lon?: number;
}

const OptimizeRoutePage = () => {
  // --- STATES ---
  const [searchParams] = useSearchParams();
  const [startPoint, setStartPoint] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  const [useManualOrder, setUseManualOrder] = useState(false);

  const [optimizedRoute, setOptimizedRoute] = useState<string[]>([]);
  const [routeInfo, setRouteInfo] = useState({ distance: "", duration: "" });
  const [polyOutbound, setPolyOutbound] = useState<string | null>(null);
  const [polyReturn, setPolyReturn] = useState<string | null>(null);
  const [mapPoints, setMapPoints] = useState<Waypoint[]>([]);
  
  const [initialPlaces, setInitialPlaces] = useState<InitialPlace[]>([]);
  
  const [focusPoint, setFocusPoint] = useState<{lat: number, lon: number} | null>(null);
  const { clearCart } = useCart(); 

  const { username, isLoggedIn } = useAuth(); // Lấy thông tin user
  // --- EFFECT: Parse URL ---
  useEffect(() => {
    const separator = "|||";

    const namesStr = searchParams.get("names") || "";
    const addressesStr = searchParams.get("addresses") || "";
    const latsStr = searchParams.get("lats") || "";
    const lngsStr = searchParams.get("lngs") || "";

    // === 2. THÊM MỚI: Lấy tham số 'start' từ URL ===
    const startParam = searchParams.get("start");
    if (startParam) {
      setStartPoint(startParam); // Tự động điền vào ô input
    }
    // ===============================================
    
    if (namesStr && addressesStr) {
      const names = namesStr.split(separator);
      const addresses = addressesStr.split(separator);
      const lats = latsStr.split(separator);
      const lngs = lngsStr.split(separator);

      const places = names.map((name, index) => ({
        name: name,
        address: addresses[index] || "",
        lat: parseFloat(lats[index] || "0"),
        lon: parseFloat(lngs[index] || "0")
      }));
      
      setInitialPlaces(places);
    }
  }, [searchParams]);

  // --- DRAG & DROP ---
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(initialPlaces);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setInitialPlaces(items);
  };

  // --- OPTIMIZE ---
  const handleOptimize = async () => {
    if (!startPoint) { toast.error("Vui lòng nhập điểm xuất phát"); return; }

    setIsOptimizing(true);
    setFocusPoint(null); 
    setOptimizedRoute([]);
    setRouteInfo({ distance: "", duration: "" });
    setPolyOutbound(null);
    setPolyReturn(null);
    setMapPoints([]);

    try {
      if (initialPlaces.length === 0) {
        toast.error("Không có địa điểm nào để tối ưu.");
        setIsOptimizing(false);
        return;
      }
      
      const placesPayload = initialPlaces.map((place) => ({
        name: place.name,
        address: place.address,
        lat: place.lat || 0,
        lng: place.lon || 0
      }));

      const response = await axios.post<OptimizeResponse>(
        `${API_BASE_URL}/api/optimize`, 
        { 
            places: placesPayload, 
            starting_point: startPoint,
            use_manual_order: useManualOrder
        }
      );
      
      const data = response.data;

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
      
      setPolyOutbound(data.polyline_outbound);
      setPolyReturn(data.polyline_return);

      const start_Point: Waypoint = {
        id: 'Điểm xuất phát',
        address: startPoint,
        ...data.start_point_coords,
      };
      
      setMapPoints([start_Point, ...data.waypoints]);

      toast.success("Đã tối ưu hóa lộ trình!");

      // === THÊM ĐOẠN NÀY: TỰ ĐỘNG LƯU LỊCH SỬ ===
      if (isLoggedIn && username) {
          try {
              // placesPayload là biến bạn đã tạo ở đoạn trên để gửi đi optimize
              await axios.post(`${API_BASE_URL}/api/routes`, {
                  username: username,
                  start_point: startPoint,
                  places: placesPayload,
                  polyline_outbound: data.polyline_outbound,
                  polyline_return: data.polyline_return,
                  distance: data.distance_km,
                  duration: data.duration_min
              });
              toast.success("Đã lưu vào lịch sử lộ trình!");
          } catch (err) {
              console.error("Không thể lưu lịch sử", err);
          }
      }

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

  const handleCardClick = (index: number) => {
      if (mapPoints.length === 0) return;
      let targetPoint;
      if (index === 0 || index === optimizedRoute.length - 1) {
          targetPoint = mapPoints[0]; 
      } else {
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
    <div className="min-h-screen bg-background pb-10">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 h-[calc(100vh-80px)]">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Tối ưu hóa Lộ trình</h1>
          <p className="text-muted-foreground">
            Tạo lộ trình hiệu quả nhất để ghé thăm tất cả các nhà hàng đã chọn
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 h-full">
          
          {/* CỘT TRÁI */}
          <div className="lg:col-span-1 space-y-6 h-full overflow-y-auto pr-2 pb-20 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            
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
                  {isOptimizing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Navigation className="mr-2 h-5 w-5" />}
                  Tạo lộ trình tối ưu nhất
                </Button>
              </div>
            </Card>

            {/* DANH SÁCH ĐIỂM ĐẾN (DRAG & DROP) */}
            {optimizedRoute.length === 0 && initialPlaces.length > 0 && (
              <Card className="p-6 border-dashed border-2 relative">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <ListChecks className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold text-lg">Điểm cần đến ({initialPlaces.length})</h3>
                    </div>
                    
                    {/* SWITCH BẬT TẮT THỨ TỰ (Đã chỉnh màu) */}
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${useManualOrder ? "text-green-600" : "text-muted-foreground"}`}>
                            {useManualOrder ? "Thủ công" : "Tự động"}
                        </span>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                  <Switch 
                                    checked={useManualOrder}
                                    onCheckedChange={setUseManualOrder}
                                    // Giữ lại các class cơ bản về kích thước, viền
                                    className="border-2 border-transparent data-[state=unchecked]:bg-gray-200"
                                    // Dùng style để ép màu nền theo trạng thái
                                    style={{
                                        backgroundColor: useManualOrder ? '#16a34a' : '#d1d5db'
                                    }}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs text-xs">
                                        Bật: Đi theo thứ tự bạn sắp xếp bên dưới.<br/>
                                        Tắt: Hệ thống tự tính đường ngắn nhất.
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                  </div>
                
                  {/* DRAG DROP CONTEXT */}
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="places-list">
                      {(provided) => (
                        <div 
                            {...provided.droppableProps} 
                            ref={provided.innerRef}
                            className="space-y-3 max-h-[300px] overflow-y-auto pr-2" // Tăng khoảng cách space-y-3 cho thoáng
                        >
                          {initialPlaces.map((place, index) => (
                            <Draggable 
                                key={`${place.name}-${index}`} 
                                draggableId={`${place.name}-${index}`} 
                                index={index}
                                isDragDisabled={!useManualOrder}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  // Kéo toàn bộ card khi bật Manual
                                  {...(useManualOrder ? provided.dragHandleProps : {})}
                                  
                                  className={`
                                      relative flex items-center gap-3 p-3 rounded-xl border transition-shadow duration-200
                                      ${snapshot.isDragging 
                                          ? "bg-white border-green-600 shadow-2xl z-50 ring-2 ring-green-500" 
                                          : "bg-white border-gray-100 hover:border-green-600 hover:shadow-sm"
                                      }
                                      ${useManualOrder ? "cursor-grab active:cursor-grabbing" : "cursor-default"}
                                  `}
                                  // --- SỬA LỖI TẠI ĐÂY: ---
                                  // Chỉ sử dụng style của thư viện, KHÔNG override top/left nữa
                                  style={provided.draggableProps.style}
                                >
                                  {/* Icon Grip (Chỉ để trang trí, vì đã kéo được cả card) */}
                                  {useManualOrder && (
                                      <div className="text-gray-300 flex-shrink-0">
                                          <GripVertical className="h-5 w-5" />
                                      </div>
                                  )}

                                  {/* Số thứ tự */}
                                  <div className={`
                                      flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold border shadow-sm flex-shrink-0
                                      ${useManualOrder 
                                          ? 'bg-blue-50 text-blue-600 border-blue-100' 
                                          : 'bg-green-50 text-green-600 border-green-100'
                                      }
                                  `}>
                                    {index + 1}
                                  </div>
                                  
                                  {/* Nội dung Text */}
                                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <p className="font-semibold text-sm text-gray-900 truncate leading-tight mb-0.5">
                                        {place.name}
                                    </p>
                                    <p className="text-muted-foreground text-xs truncate leading-tight">
                                        {place.address}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {/* Fix lỗi giật: Placeholder giữ chỗ khi đang kéo */}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>

                </div>
              </Card>
            )}

            {/* KẾT QUẢ */}
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
                        onClick={() => handleCardClick(index)}
                        className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all border border-transparent hover:border-green-400 group"
                      >
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-sm ${
                            index === 0 || index === optimizedRoute.length - 1 
                            ? 'bg-green-700' 
                            : 'bg-green-500'
                        }`}>
                          {index === 0 || index === optimizedRoute.length - 1 ? <Navigation className="h-4 w-4" /> : index}
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

            {/* INFO BOX */}
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

          {/* CỘT PHẢI: MAP */}
          <div className="lg:col-span-2 h-[500px] lg:h-full relative pb-4">
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