import { useState, useEffect, KeyboardEvent, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios"; 
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch"; 
import { 
  MapPin, Loader2, Navigation, ListChecks, 
  GripVertical, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import RouteMap from "@/components/RouteMap"; 
import { useCart } from "@/context/CartContext";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/api-config";
import { Drawer } from "vaul"; 
import { createPortal } from "react-dom";
import React from "react";

// --- INTERFACES (GIỮ NGUYÊN) ---
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
  name: string;
  address: string;
  lat?: number;
  lon?: number;
}

// --- COMPONENT CON: INPUT SECTION ---
interface InputSectionProps {
  startPoint: string;
  setStartPoint: (val: string) => void;
  handleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  handleOptimize: () => void;
  isOptimizing: boolean;
}

const InputSection = ({ startPoint, setStartPoint, handleKeyDown, handleOptimize, isOptimizing }: InputSectionProps) => (
  <Card className="p-4 md:p-6 shadow-sm border-0 md:border">
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium mb-1 block">Điểm xuất phát</label>
        <Input
          id="startPoint"
          placeholder="VD: Khách sạn hoặc địa chỉ cụ thể"
          value={startPoint}
          onChange={(e) => setStartPoint(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-10 text-sm md:text-base"
        />
      </div>
      <Button
        onClick={handleOptimize}
        className="w-full bg-green-600 hover:bg-green-700 text-white transition-colors h-10"
        disabled={isOptimizing}
      >
        {isOptimizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Navigation className="mr-2 h-4 w-4" />}
        Tìm lộ trình
      </Button>
    </div>
  </Card>
);

// --- COMPONENT CON: DRAG LIST (ĐÃ FIX LỖI DRAG MOBILE) ---
interface DragDropListProps {
  initialPlaces: InitialPlace[];
  useManualOrder: boolean;
  setUseManualOrder: (val: boolean) => void;
  onDragEnd: (result: DropResult) => void;
}

const DragDropList = ({ initialPlaces, useManualOrder, setUseManualOrder, onDragEnd }: DragDropListProps) => (
  <Card className="p-4 md:p-6 border-dashed border-2 relative mt-4">
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
      
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="places-list">
          {(provided) => (
            <div 
                {...provided.droppableProps} 
                ref={provided.innerRef}
                className="space-y-2 max-h-[200px] md:max-h-[300px] overflow-y-auto pr-1"
            >
              {initialPlaces.map((place, index) => (
                <Draggable 
                    key={`${place.name}-${index}`} 
                    draggableId={`${place.name}-${index}`} 
                    index={index}
                    isDragDisabled={!useManualOrder}
                >
                  {(provided, snapshot) => {
                    // FIX: Thêm touchAction: 'none' để ngăn chặn hành vi cuộn/kéo của trình duyệt
                    const style = {
                        ...provided.draggableProps.style,
                        touchAction: 'none', 
                    } as React.CSSProperties;

                    const cardContent = (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...(useManualOrder ? provided.dragHandleProps : {})}
                        // data-vaul-no-drag báo cho Drawer biết đừng nhận sự kiện kéo ở đây
                        {...(useManualOrder ? { "data-vaul-no-drag": true } : {})}
                        style={{
                          ...style,
                          // Giữ kích thước khi đang kéo (tránh bị co lại)
                          ...(snapshot.isDragging ? { width: style?.width || "auto" } : {})
                        }}
                        className={`
                          relative flex items-center gap-2 p-2 rounded-lg border text-sm select-none
                          ${snapshot.isDragging 
                              ? "bg-white border-green-600 shadow-2xl z-[9999]" 
                              : "bg-white border-gray-100"
                          }
                        `}
                      >
                        {useManualOrder && <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0" />}
                        <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold border flex-shrink-0 ${useManualOrder ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{place.name}</p>
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

// --- COMPONENT CON: RESULT LIST ---
interface ResultListProps {
  optimizedRoute: string[];
  handleCardClick: (index: number) => void;
  routeInfo: { distance: string; duration: string };
}

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
          <h3 className="font-semibold mb-2 text-sm">Tổng quan</h3>
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

  // --- EFFECT: Parse URL ---
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
        name: name,
        address: addresses[index] || "",
        lat: parseFloat(lats[index] || "0"),
        lon: parseFloat(lngs[index] || "0")
      }));
      setInitialPlaces(places);
    }
  }, [searchParams]);

  // --- DRAG & DROP ITEMS ---
  const onDragEnd = (result: DropResult) => {
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
      <div className="md:hidden fixed inset-0 w-full h-[100dvh] flex flex-col overflow-hidden overscroll-none bg-background">
          
         {/* 1. NÚT BACK */}
         <div className="absolute top-10 left-0 w-full z-20 pt-4 pb-2 px-4 flex items-center gap-3 pointer-events-auto">
             <Button 
               variant="outline" 
               size="icon" 
               className="h-9 w-9 rounded-full shadow-lg transition-all duration-300
                          bg-white text-green-600 border border-green-600
                          hover:bg-green-600 hover:text-white hover:border-green-600" 
               onClick={() => navigate(-1)}
             >
                 <ArrowLeft className="h-5 w-5" />
             </Button>
         </div>

         {/* 2. MAP */}
         <div className={`absolute inset-0 z-0 bg-gray-100 transition-opacity duration-300 
                          [&_.leaflet-control-container]:hidden [&_.gmnoprint]:hidden [&_.mapboxgl-ctrl]:hidden
                          ${snap === "190px" ? "" : "pointer-events-none"}`}
         >
             <RouteMap 
               polylineOutbound={polyOutbound} 
               polylineReturn={polyReturn}
               points={mapPoints} 
               focusPoint={focusPoint}
             />
         </div>

         {/* 3. VAUL DRAWER */}
         <Drawer.Root 
           snapPoints={["190px", 0.61, 0.85]} 
           activeSnapPoint={snap} 
           setActiveSnapPoint={setSnap}
           modal={false}
           open={true}
           dismissible={false} 
         >
           <Drawer.Content className="fixed flex flex-col bg-white border border-gray-200 border-b-none rounded-t-[16px] bottom-0 left-0 right-0 h-full max-h-[96%] mx-[-1px] z-30 shadow-2xl outline-none">
              
             {/* Handle Bar */}
             <div className="w-full mx-auto flex flex-col items-center pt-3 pb-2 bg-white rounded-t-[16px] flex-shrink-0 cursor-grab active:cursor-grabbing z-10 border-b border-gray-50">
               <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-1" />
             </div>

             {/* Scrollable Content */}
             <div className="flex-1 overflow-y-auto px-4 pt-4 pb-safe bg-white">
               <div className="space-y-4 mb-4">
                 <div className="relative">
                   <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
                   <Input 
                     placeholder="Nhập điểm xuất phát..." 
                     value={startPoint}
                     onChange={(e) => setStartPoint(e.target.value)}
                     onKeyDown={handleKeyDown}
                     spellCheck={false}
                     onFocus={() => {
                       if (snap === "190px") setSnap(0.61);
                     }}
                     className="pl-9 bg-gray-50 border-gray-200 focus:bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500 h-10 shadow-sm transition-all"
                   />
                 </div>

                 <Button 
                   onClick={() => {
                       handleOptimize();
                   }}
                   className="w-full bg-green-600 hover:bg-green-700 text-white font-medium h-10 shadow-sm active:scale-[0.98] transition-transform"
                   disabled={isOptimizing}
                 >
                   {isOptimizing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Navigation className="h-4 w-4 mr-2" />}
                   {optimizedRoute.length > 0 ? "Tối ưu lại" : "Tìm lộ trình"}
                 </Button>
               </div>

               <div className="transition-opacity duration-300 pb-20">
                 {optimizedRoute.length === 0 && initialPlaces.length > 0 && 
                   <DragDropList 
                     initialPlaces={initialPlaces} 
                     useManualOrder={useManualOrder} 
                     setUseManualOrder={setUseManualOrder} 
                     onDragEnd={onDragEnd} 
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
          <div className="lg:col-span-1 space-y-6 h-full overflow-y-auto pr-2 pb-20">
             <InputSection 
               startPoint={startPoint} 
               setStartPoint={setStartPoint} 
               handleKeyDown={handleKeyDown} 
               handleOptimize={handleOptimize} 
               isOptimizing={isOptimizing} 
             />
             
             {optimizedRoute.length === 0 && initialPlaces.length > 0 && 
               <DragDropList 
                   initialPlaces={initialPlaces} 
                   useManualOrder={useManualOrder} 
                   setUseManualOrder={setUseManualOrder} 
                   onDragEnd={onDragEnd} 
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