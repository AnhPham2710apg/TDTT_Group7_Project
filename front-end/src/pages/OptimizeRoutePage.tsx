import { useState, useEffect, KeyboardEvent } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  MapPin, Loader2, Navigation, ListChecks,
  GripVertical, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import RouteMap from "@/components/RouteMap";
import { useCart } from "@/context/CartContext";
import { DragDropContext, Droppable, Draggable, DropResult, DragStart } from "@hello-pangea/dnd";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/api-config";
import { Drawer } from "vaul";
import { createPortal } from "react-dom";

// --- INTERFACES ---
interface Waypoint {
  id: string;
  address?: string;
  lat: number;
  lon: number;
}
interface StartPointCoords { lat: number; lon: number; }
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
  id: string; // ID bắt buộc cho Drag Key
  name: string;
  address: string;
  lat?: number;
  lon?: number;
}
// --- COMPONENT CON: DRAG LIST ---
interface DragDropListProps {
  initialPlaces: InitialPlace[];
  useManualOrder: boolean;
  setUseManualOrder: (val: boolean) => void;
  onDragEnd: (result: DropResult) => void;
  onDragStart: () => void;
}

const DragDropList = ({ 
    initialPlaces, 
    useManualOrder, 
    setUseManualOrder, 
    onDragEnd,
    onDragStart 
}: DragDropListProps) => {
  return (
    <Card className="p-4 md:p-6 border-dashed border-2 relative mt-2 md:mt-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm md:text-lg">Điểm cần đến ({initialPlaces.length})</h3>
          </div>
          <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${useManualOrder ? "text-green-600" : "text-muted-foreground"}`}>
                  {useManualOrder ? "Thủ công" : "Tự động"}
              </span>
              <Switch 
                checked={useManualOrder}
                onCheckedChange={setUseManualOrder}
                className="scale-75 data-[state=checked]:bg-green-600"
              />
          </div>
        </div>
        
        <DragDropContext 
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
          <Droppable droppableId="places-list">
            {(provided) => (
              <div 
                  {...provided.droppableProps} 
                  ref={provided.innerRef}
                  className="space-y-2 max-h-[200px] md:max-h-[300px] overflow-y-auto pr-1 overscroll-contain"
                  style={{ touchAction: "pan-y" }} 
              >
                {initialPlaces.map((place, index) => (
                  <Draggable 
                      key={place.id} 
                      draggableId={place.id} 
                      index={index}
                      isDragDisabled={!useManualOrder}
                  >
                    {(provided, snapshot) => {
                      const originalStyle = provided.draggableProps.style as React.CSSProperties;
                      const style: React.CSSProperties = {
                          ...originalStyle,
                          ...(snapshot.isDragging ? { 
                              zIndex: 99999,
                              background: "white",
                              border: "1px solid #16a34a",
                              boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
                              opacity: 0.95,
                              borderRadius: "0.5rem",
                          } : {
                              // transform: originalStyle.transform,
                          })
                      };

                      const cardContent = (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          // 1. CHUYỂN HANDLE VỀ THẺ CHA: Bây giờ chạm đâu trên thẻ cũng kéo được
                          {...(useManualOrder ? provided.dragHandleProps : {})}
                          
                          data-vaul-no-drag={useManualOrder}
                          style={{
                              ...style,
                              // 2. CHẶN CUỘN KHI Ở MANUAL MODE:
                              // Nếu bật Manual -> touchAction='none' (Ưu tiên kéo, chặn cuộn)
                              // Nếu tắt Manual -> touchAction='pan-y' (Cho phép cuộn bình thường)
                              touchAction: useManualOrder ? 'none' : 'pan-y' 
                          }}
                          className={`
                            relative flex items-center gap-3 p-3 rounded-lg border text-sm select-none
                            ${snapshot.isDragging ? "" : "bg-white border-gray-100 transition-colors"}
                            ${useManualOrder ? "cursor-grab active:cursor-grabbing" : ""}
                          `}
                        >
                          {/* Icon Grip vẫn giữ để làm dấu hiệu nhận biết, nhưng không chứa logic riêng nữa */}
                          {useManualOrder && (
                             <div className="p-2 -ml-2 text-gray-400 flex-shrink-0">
                                <GripVertical className="h-5 w-5" />
                             </div>
                          )}
                          
                          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold border flex-shrink-0 ${useManualOrder ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                            {index + 1}
                          </div>
                          
                          <div className="flex-1 min-w-0 pointer-events-none">
                            <p className="font-medium truncate text-gray-900">{place.name}</p>
                            <p className="text-muted-foreground text-xs truncate">{place.address}</p>
                          </div>
                        </div>
                      );

                      if (snapshot.isDragging) {
                        return createPortal(cardContent, document.body);
                      }

                      return cardContent;
                    }}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </Card>
  );
};

// 1. Định nghĩa kiểu dữ liệu rõ ràng cho Props
interface ResultListProps {
  optimizedRoute: string[]; // Mảng chứa tên các địa điểm
  handleCardClick: (index: number) => void; // Hàm xử lý click, nhận vào index (number)
  routeInfo: { 
    distance: string; 
    duration: string; 
  }; // Object chứa thông tin quãng đường/thời gian
}

// 2. Áp dụng interface vào component thay vì dùng 'any'
const ResultList = ({ optimizedRoute, handleCardClick, routeInfo }: ResultListProps) => (
  <div className="space-y-4 mt-4 pb-20 md:pb-0">
      <Card className="p-4 bg-green-50 dark:bg-green-900/10 border-green-200 shadow-sm">
          <h3 className="font-semibold text-sm mb-3 text-green-800 flex items-center gap-2">
          <MapPin className="h-4 w-4" /> Lộ trình gợi ý
          </h3>
          <div className="space-y-2">
          {optimizedRoute.map((stop, index) => (
              <div
              key={index}
              onClick={() => handleCardClick(index)}
              className="flex items-start gap-2 p-2 rounded-lg bg-white shadow-sm cursor-pointer active:scale-95 transition-transform border border-transparent hover:border-green-400"
              >
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-white ${index === 0 || index === optimizedRoute.length - 1 ? 'bg-green-700' : 'bg-green-500'}`}>
                  {index === 0 || index === optimizedRoute.length - 1 ? <Navigation className="h-3 w-3" /> : index}
              </div>
              <div className="flex-1">
                  <p className="text-xs font-medium text-gray-800 line-clamp-2">{stop}</p>
              </div>
              </div>
          ))}
          </div>
      </Card>
      <Card className="p-4 shadow-sm">
          <div className="flex justify-between text-sm border-b pb-2 mb-2">
              <span className="text-muted-foreground">Quãng đường:</span>
              <span className="font-bold text-green-600">{routeInfo.distance}</span>
          </div>
          <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Thời gian:</span>
              <span className="font-bold text-green-600">{routeInfo.duration}</span>
          </div>
      </Card>
  </div>
);

// --- COMPONENT CHÍNH ---

const OptimizeRoutePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
  const { username, isLoggedIn } = useAuth();

  // === VAUL DRAWER CONFIG ===
  const [snap, setSnap] = useState<number | string | null>("190px");
  
  // STATE MỚI: Theo dõi trạng thái đang kéo
  const [isDragging, setIsDragging] = useState(false);

  // --- EFFECT: Parse URL & Tạo ID duy nhất ---
  useEffect(() => {
    const separator = "|||";
    const namesStr = searchParams.get("names") || "";
    const addressesStr = searchParams.get("addresses") || "";
    const latsStr = searchParams.get("lats") || "";
    const lngsStr = searchParams.get("lngs") || "";
    const startParam = searchParams.get("start");

    if (startParam) setStartPoint(startParam);

    if (namesStr && addressesStr) {
      const names = namesStr.split(separator);
      const addresses = addressesStr.split(separator);
      const lats = latsStr.split(separator);
      const lngs = lngsStr.split(separator);

      const places = names.map((name, index) => ({
        id: `place-${index}-${Date.now()}`, 
        name: name,
        address: addresses[index] || "",
        lat: parseFloat(lats[index] || "0"),
        lon: parseFloat(lngs[index] || "0")
      }));
      setInitialPlaces(places);
    }
  }, [searchParams]);

  // --- HANDLERS CHO DRAG ---
  const handleDragStart = () => {
      // Khi bắt đầu kéo -> Khóa Drawer lại
      setIsDragging(true);
  };

  const onDragEnd = (result: DropResult) => {
    // Khi thả ra -> Mở khóa Drawer
    setIsDragging(false);

    if (!result.destination) return;
    const items = Array.from(initialPlaces);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setInitialPlaces(items);
  };

  // --- OPTIMIZE LOGIC ---
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
        name: place.name, address: place.address, lat: place.lat || 0, lng: place.lon || 0
      }));

      const response = await axios.post<OptimizeResponse>(
        `${API_BASE_URL}/api/optimize`,
        { places: placesPayload, starting_point: startPoint, use_manual_order: useManualOrder }
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
        id: 'Điểm xuất phát', address: startPoint, ...data.start_point_coords,
      };
      setMapPoints([start_Point, ...data.waypoints]);
      toast.success("Đã tối ưu hóa lộ trình!");

      setSnap(0.61); 

      if (isLoggedIn && username) {
          try {
              await axios.post(`${API_BASE_URL}/api/routes`, {
                  username: username, start_point: startPoint, places: placesPayload,
                  polyline_outbound: data.polyline_outbound, polyline_return: data.polyline_return,
                  distance: data.distance_km, duration: data.duration_min
              });
              toast.success("Đã lưu vào lịch sử lộ trình!");
          } catch (err) { console.error("Không thể lưu lịch sử", err); }
      }
      clearCart();
    } catch (error: unknown) {
      toast.error("Tối ưu hóa thất bại");
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
          setSnap("190px"); 
      }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isOptimizing && startPoint) {
      e.preventDefault();
      handleOptimize();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:block overflow-hidden">
      {/* PC Navbar */}
      <div className="hidden md:block">
         <Navbar />
      </div>

      {/* --- MOBILE LAYOUT --- */}
      <div className="md:hidden fixed inset-0 w-full h-[100dvh] bg-background">
         <div className="absolute top-10 left-4 z-20 pointer-events-auto">
             <Button 
               variant="outline" 
               size="icon" 
               className="h-10 w-10 rounded-full shadow-lg bg-white text-green-600 border border-green-600 hover:bg-green-600 hover:text-white" 
               onClick={() => navigate(-1)}
             >
                 <ArrowLeft className="h-5 w-5" />
             </Button>
         </div>

         <div className={`absolute inset-0 z-0 bg-gray-100 transition-opacity duration-300 ${snap === "190px" ? "" : "pointer-events-none"}`}>
             <RouteMap 
               polylineOutbound={polyOutbound} 
               polylineReturn={polyReturn}
               points={mapPoints} 
               focusPoint={focusPoint}
             />
         </div>

         <Drawer.Root 
           // [KEY LOGIC] Khi đang Drag (isDragging=true), ép snapPoints chỉ còn 1 giá trị hiện tại.
           // Điều này khiến Drawer bị "kẹt" lại, không thể trượt đi đâu được.
           snapPoints={isDragging && snap ? [snap] : ["190px", 0.61, 0.95]} 
           activeSnapPoint={snap} 
           setActiveSnapPoint={setSnap}
           modal={false} 
           open={true}
           // [KEY LOGIC] Không cho phép vuốt đóng/mở khi đang drag
           dismissible={!isDragging} 
         >
           <Drawer.Content 
             className="fixed flex flex-col bg-white border border-gray-200 border-b-none rounded-t-[20px] bottom-0 left-0 right-0 h-full max-h-[96%] mx-[-1px] z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] outline-none"
             style={{ display: 'flex', flexDirection: 'column' }}
           >
             <div className="w-full mx-auto flex flex-col items-center pt-3 pb-2 bg-white rounded-t-[20px] flex-shrink-0 cursor-grab active:cursor-grabbing z-10">
               <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-2" />
             </div>

             <div className="px-4 pb-2 bg-white border-b border-gray-50 flex-shrink-0">
                 <div className="relative mb-3 pt-2">
                   <MapPin className="absolute left-3 top-5 h-4 w-4 text-gray-400 z-10" />
                   <Input 
                     placeholder="Nhập điểm xuất phát..." 
                     value={startPoint}
                     onChange={(e) => setStartPoint(e.target.value)}
                     onKeyDown={handleKeyDown}
                     spellCheck={false}
                     onFocus={() => { if (snap === "190px") setSnap(0.61); }}
                     className="pl-9 bg-gray-50 border-gray-200 focus:bg-white focus:border-green-500 h-10 shadow-sm rounded-lg text-sm"
                   />
                 </div>

                 <Button 
                   onClick={handleOptimize}
                   className="w-full bg-green-600 hover:bg-green-700 text-white font-medium h-10 rounded-lg shadow-sm"
                   disabled={isOptimizing}
                 >
                   {isOptimizing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Navigation className="h-4 w-4 mr-2" />}
                   {optimizedRoute.length > 0 ? "Tối ưu lại" : "Tìm lộ trình"}
                 </Button>
             </div>

             <div className="flex-1 overflow-y-auto px-4 pt-2 pb-safe bg-white overscroll-contain">
               <div className="pb-20">
                 {optimizedRoute.length === 0 && initialPlaces.length > 0 && 
                   <DragDropList 
                     initialPlaces={initialPlaces} 
                     useManualOrder={useManualOrder} 
                     setUseManualOrder={setUseManualOrder} 
                     onDragEnd={onDragEnd}
                     onDragStart={handleDragStart} // Truyền handler xuống
                   />
                 }
                 {optimizedRoute.length > 0 && 
                   <ResultList 
                     optimizedRoute={optimizedRoute} 
                     handleCardClick={handleCardClick} 
                     routeInfo={routeInfo} 
                   />
                 }
               </div>
             </div>
           </Drawer.Content>
         </Drawer.Root>
      </div>
      
      {/* --- PC LAYOUT (GIỮ NGUYÊN) --- */}
      <div className="hidden md:block container mx-auto px-4 py-8 h-[calc(100vh-80px)]">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Tối ưu hóa Lộ trình</h1>
          <p className="text-muted-foreground">Tạo lộ trình hiệu quả nhất để ghé thăm tất cả các nhà hàng đã chọn</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 h-full">
          <div className="lg:col-span-1 space-y-6 h-full overflow-y-auto pr-2 pb-20 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
             <Card className="p-6 shadow-sm">
               <div className="space-y-4">
                 <div>
                   <Label htmlFor="startPointPC">Điểm xuất phát</Label>
                   <Input
                     id="startPointPC"
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

             {optimizedRoute.length === 0 && initialPlaces.length > 0 && (
                <DragDropList 
                     initialPlaces={initialPlaces} 
                     useManualOrder={useManualOrder} 
                     setUseManualOrder={setUseManualOrder} 
                     onDragEnd={onDragEnd} 
                     onDragStart={() => {}} // PC không cần logic khóa drawer
                />
             )}

             {optimizedRoute.length > 0 && (
               <ResultList 
                   optimizedRoute={optimizedRoute} 
                   handleCardClick={handleCardClick} 
                   routeInfo={routeInfo} 
               />
             )}
          </div>

          <div className="lg:col-span-2 h-full relative rounded-xl overflow-hidden border shadow-lg bottom-5">
             <RouteMap 
               polylineOutbound={polyOutbound} 
               polylineReturn={polyReturn} 
               points={mapPoints} 
               focusPoint={focusPoint} 
             />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizeRoutePage;