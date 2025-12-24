import { useState, useEffect, KeyboardEvent } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios, { AxiosError } from "axios";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  MapPin, Loader2, Navigation, ListChecks,
  GripVertical, ArrowLeft, Save, Info
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

interface BackendErrorResponse {
  message?: string;
  detail?: string;
}

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

          {/* --- BẮT ĐẦU PHẦN THÊM TOOLTIP --- */}
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                {/* Bọc div này để khi rê vào cả chữ và nút đều hiện tooltip */}
                <div className="flex items-center gap-2 cursor-help select-none hover:bg-gray-100 p-1 rounded-md transition-colors">
                    <span className={`text-xs font-medium ${useManualOrder ? "text-green-600" : "text-muted-foreground"}`}>
                        {useManualOrder ? "Thủ công" : "Tự động"}
                    </span>
                    <Switch 
                      checked={useManualOrder}
                      onCheckedChange={setUseManualOrder}
                      className="scale-75 data-[state=checked]:bg-green-600"
                    />
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[250px] bg-slate-900 text-white p-3 border-none shadow-xl">
                {useManualOrder ? (
                  <div className="space-y-1">
                    <p className="font-bold text-green-400 flex items-center gap-1">Chế độ Thủ công</p>
                    <p className="text-xs text-gray-300">
                      Bạn có toàn quyền <b>kéo thả</b> để sắp xếp thứ tự các điểm đến theo ý thích. Thuật toán tối ưu sẽ bị tắt.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="font-bold text-blue-400">Chế độ Tự động</p>
                    <p className="text-xs text-gray-300">
                      Hệ thống sẽ tự động tính toán và sắp xếp thứ tự đi sao cho <b>tổng quãng đường là ngắn nhất</b>.
                    </p>
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {/* --- KẾT THÚC PHẦN THÊM TOOLTIP --- */}

        </div>
        
        <DragDropContext 
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
          {/* ... (Phần DragDropContext giữ nguyên không đổi) ... */}
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
                              position: "fixed", 
                              zIndex: 99999,
                              background: "white",
                              border: "1px solid #16a34a",
                              boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
                              opacity: 0.95,
                              borderRadius: "0.5rem",
                          } : {
                              transform: originalStyle.transform,
                          })
                      };

                      const cardContent = (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...(useManualOrder ? provided.dragHandleProps : {})}
                          data-vaul-no-drag={useManualOrder}
                          style={{
                              ...style,
                              touchAction: useManualOrder ? 'none' : 'pan-y' 
                          }}
                          className={`
                            relative flex items-center gap-3 p-3 rounded-lg border text-sm select-none
                            ${snapshot.isDragging ? "" : "bg-white border-gray-100 transition-colors"}
                            ${useManualOrder ? "cursor-grab active:cursor-grabbing hover:border-green-200" : "opacity-80"}
                          `}
                        >
                          {useManualOrder ? (
                             <div className="p-2 -ml-2 text-gray-400 flex-shrink-0">
                                <GripVertical className="h-5 w-5" />
                             </div>
                          ) : (
                            // Thêm icon khóa hoặc dấu chấm để user biết không kéo được khi ở mode Tự động
                            <div className="w-2 h-2 rounded-full bg-gray-300 ml-1 mr-2" />
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

  const [isSaving, setIsSaving] = useState(false);
  // State để lưu dữ liệu thô từ API optimize (để gửi lại cho API save)
  const [rawRouteData, setRawRouteData] = useState<{
    distance: number;
    duration: number;
  } | null>(null);

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
  // --- OPTIMIZE LOGIC ---
  const handleOptimize = async () => {
    if (!startPoint) { toast.error("Vui lòng nhập điểm xuất phát"); return; }
    setIsOptimizing(true);
    // Reset states
    setFocusPoint(null);
    setOptimizedRoute([]);
    setRouteInfo({ distance: "", duration: "" });
    setPolyOutbound(null);
    setPolyReturn(null);
    setMapPoints([]);
    setRawRouteData(null); // Reset raw data

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
      
      // 1. Cập nhật UI hiển thị
      const formattedRoute = [
        `Xuất phát: ${startPoint}`,
        ...data.optimized_order.map((placeName, index) => `${index + 1}. ${placeName}`),
        `Kết thúc: ${startPoint}`
      ];
      setOptimizedRoute(formattedRoute);
      
      // Hiển thị dạng chuỗi đẹp
      setRouteInfo({
        distance: `${data.distance_km.toFixed(1)} km`,
        duration: `${Math.round(data.duration_min)} phút`,
      });

      // 2. LƯU DỮ LIỆU THÔ (Để dùng cho nút Save) [NEW]
      setRawRouteData({
        distance: data.distance_km,
        duration: data.duration_min
      });

      setPolyOutbound(data.polyline_outbound);
      setPolyReturn(data.polyline_return);
      
      const start_Point: Waypoint = {
        id: 'Điểm xuất phát', address: startPoint, ...data.start_point_coords,
      };
      setMapPoints([start_Point, ...data.waypoints]);
      
      toast.success("Đã tối ưu hóa lộ trình!");
      setSnap(0.61); 

      // --- XÓA ĐOẠN CODE AUTO-SAVE CŨ Ở ĐÂY ---
      // (Chúng ta sẽ chuyển nó sang nút bấm riêng)
      
      clearCart();
    } catch (error: unknown) {
      console.error("Chi tiết lỗi:", error);

      if (axios.isAxiosError(error)) {
        // TRƯỜNG HỢP 1: Server phản hồi với mã lỗi (4xx, 5xx)
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data as BackendErrorResponse;

          // Ưu tiên lấy message từ backend trả về (thường là data.message hoặc data.detail)
          const serverMessage = data?.message || data?.detail || "Lỗi xử lý từ máy chủ";

          if (status === 400) {
            toast.error(`Dữ liệu không hợp lệ: ${serverMessage}`);
          } else if (status === 404) {
            toast.error("Không tìm thấy dữ liệu hoặc API endpoint sai.");
          } else if (status === 500) {
            toast.error("Máy chủ gặp sự cố nội bộ (500). Vui lòng thử lại sau.");
          } else {
            toast.error(`Lỗi (${status}): ${serverMessage}`);
          }
        } 
        // TRƯỜNG HỢP 2: Không nhận được phản hồi (Server down, sai URL, mất mạng)
        else if (error.request) {
          toast.error("Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng hoặc liên hệ admin.");
        } 
        // TRƯỜNG HỢP 3: Lỗi khi setup request
        else {
          toast.error(`Lỗi cấu hình: ${error.message}`);
        }
      } else {
        // Lỗi không phải do Axios (ví dụ lỗi logic code React)
        toast.error("Đã xảy ra lỗi không xác định.");
      }
    } finally {
      setIsOptimizing(false);
    }
  };

  // --- SAVE ROUTE HANDLER [NEW] ---
  const handleSaveRoute = async () => {
    if (!isLoggedIn || !username) {
      toast.error("Vui lòng đăng nhập để lưu lộ trình");
      navigate("/login");
      return;
    }

    if (!rawRouteData) {
      toast.error("Chưa có dữ liệu lộ trình để lưu");
      return;
    }

    setIsSaving(true);
    try {
      // Chuẩn bị payload đúng format backend yêu cầu
      const placesPayload = initialPlaces.map((place) => ({
        name: place.name, 
        address: place.address, 
        lat: place.lat || 0, 
        lng: place.lon || 0
      }));

      const payload = {
        username: username,
        start_point: startPoint,
        places: placesPayload,
        distance: rawRouteData.distance,   // Gửi số (float)
        duration: rawRouteData.duration,   // Gửi số (float)
        polyline_outbound: polyOutbound || "",
        polyline_return: polyReturn || ""
      };

      await axios.post(`${API_BASE_URL}/api/routes`, payload);
      toast.success("Đã lưu lộ trình vào lịch sử!");
    } catch (error) {
      console.error("Save route error:", error);
      toast.error("Không thể lưu lộ trình. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
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
    // SỬ DỤNG h-[100dvh] thay vì min-h-screen để fix lỗi trình duyệt mobile
    <div className="h-[100dvh] w-full bg-background flex flex-col md:block overflow-hidden relative">
      
      {/* PC Navbar */}
      <div className="hidden md:block">
         <Navbar />
      </div>

      {/* --- MOBILE LAYOUT --- */}
      {/* Container chính full màn hình mobile */}
      <div className="md:hidden absolute inset-0 w-full h-full z-0">
         
         {/* NÚT BACK: Thêm pt-safe và top-4 để tránh tai thỏ */}
         <div className="absolute top-0 left-4 z-20 pt-safe mt-4 pointer-events-auto">
             <Button 
               variant="outline" 
               size="icon" 
               className="h-10 w-10 rounded-full shadow-lg bg-white/90 backdrop-blur-sm text-green-600 border-green-600/20 hover:bg-green-600 hover:text-white transition-all" 
               onClick={() => navigate(-1)}
             >
                 <ArrowLeft className="h-5 w-5" />
             </Button>
         </div>

         {/* BẢN ĐỒ: Full height */}
         <div className={`absolute inset-0 z-0 bg-gray-100 transition-all duration-500 ease-in-out`}>
             <RouteMap 
               polylineOutbound={polyOutbound} 
               polylineReturn={polyReturn}
               points={mapPoints} 
               focusPoint={focusPoint}
             />
             {/* Lớp phủ mờ khi Drawer kéo lên Full màn hình để tập trung nội dung */}
             <div className={`absolute inset-0 bg-black/20 pointer-events-none transition-opacity duration-300 ${snap === 1 ? 'opacity-100' : 'opacity-0'}`} />
         </div>

         {/* --- DRAWER (VAUL) --- */}
         <Drawer.Root 
            snapPoints={isDragging && snap ? [snap] : ["190px", 0.55, 1]} 
            activeSnapPoint={snap} 
            setActiveSnapPoint={setSnap}
            modal={false} 
            open={true}
            dismissible={false} // Không cho phép đóng hẳn Drawer
         >
           <Drawer.Content 
             // Cập nhật CSS cho Drawer:
             // max-h-[96dvh]: Chừa lại 1 chút xíu ở trên cùng để người dùng thấy map phía sau
             // pb-safe: Đẩy nội dung lên trên thanh Home Indicator của iPhone
             className="fixed flex flex-col bg-white border border-gray-200 border-b-none rounded-t-[20px] bottom-0 left-0 right-0 h-full max-h-[96dvh] mx-[-1px] z-30 shadow-[0_-5px_40px_rgba(0,0,0,0.1)] outline-none"
           >
             
             {/* THANH KÉO (HANDLE) */}
             <div className="w-full mx-auto flex flex-col items-center pt-3 pb-2 bg-white rounded-t-[20px] flex-shrink-0 z-10 cursor-grab active:cursor-grabbing">
               <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-1" />
             </div>

             {/* HEADER CỦA DRAWER (Ô TÌM KIẾM) */}
             <div className="px-4 pb-2 bg-white border-b border-gray-50 flex-shrink-0 pt-1">
                 <div className="relative mb-3">
                   <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
                   <Input 
                     placeholder="Nhập điểm xuất phát..." 
                     value={startPoint}
                     onChange={(e) => setStartPoint(e.target.value)}
                     onKeyDown={handleKeyDown}
                     // Khi focus vào input, tự động nhảy lên mức Medium (0.55) hoặc Full
                     onFocus={() => {
                        if (snap === "190px") setSnap(0.55);
                     }}
                     className="pl-9 bg-gray-50 border-gray-200 focus:bg-white focus:border-green-500 h-10 shadow-sm rounded-lg text-base" 
                     // text-base quan trọng trên iOS để tránh tự động zoom in khi nhập liệu
                   />
                 </div>

                 <Button 
                   onClick={handleOptimize}
                   className="w-full bg-green-600 hover:bg-green-700 text-white font-medium h-10 rounded-lg shadow-sm active:scale-[0.98] transition-transform"
                   disabled={isOptimizing}
                 >
                   {isOptimizing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Navigation className="h-4 w-4 mr-2" />}
                   {optimizedRoute.length > 0 ? "Tối ưu lại" : "Tìm lộ trình"}
                 </Button>
             </div>

             {/* BODY CỦA DRAWER (LIST QUÁN ĂN) */}
             {/* Thêm pb-safe để nội dung cuối cùng không bị thanh Home đè lên */}
             <div className="flex-1 overflow-y-auto px-4 pt-2 pb-safe overscroll-contain bg-white">
                <div className="pb-4"> 
                  {optimizedRoute.length === 0 && initialPlaces.length > 0 && 
                    <DragDropList 
                      initialPlaces={initialPlaces} 
                      useManualOrder={useManualOrder} 
                      setUseManualOrder={setUseManualOrder} 
                      onDragEnd={onDragEnd}
                      onDragStart={handleDragStart} 
                    />
                  }
                  
                  {optimizedRoute.length > 0 && (
                   <div className="space-y-3 animate-slide-up">
                     <ResultList 
                       optimizedRoute={optimizedRoute} 
                       handleCardClick={handleCardClick} 
                       routeInfo={routeInfo} 
                     />
                     
                     {isLoggedIn && (
                       <Button 
                         variant="outline" 
                         className="w-full border-green-600 text-green-700 hover:bg-green-50 h-12 text-base font-medium"
                         onClick={handleSaveRoute}
                         disabled={isSaving}
                       >
                         {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                         Lưu lộ trình này
                       </Button>
                     )}
                   </div>
                  )}
                </div>
             </div>
           </Drawer.Content>
         </Drawer.Root>
      </div>
      
      {/* --- PC LAYOUT --- */}
      {/* 1. CONTAINER: Đổi h-[calc...] thành min-h-[...] để trang có thể dài ra */}
      <div className="hidden md:block container mx-auto px-4 py-8 min-h-[calc(100vh-80px)]">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Tối ưu hóa Lộ trình</h1>
          <p className="text-muted-foreground">Tạo lộ trình hiệu quả nhất để ghé thăm tất cả các nhà hàng đã chọn</p>
        </div>

        {/* 2. GRID: Bỏ h-full, giữ items-stretch (mặc định của grid) */}
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* --- CỘT TRÁI --- */}
          {/* 3. Thay đổi class:
              - Bỏ: h-full, overflow-y-auto, scrollbar-thin... (Để nó tự dài ra theo nội dung)
              - Thêm: h-fit (để đảm bảo nó ôm nội dung) hoặc để trống (nó sẽ stretch theo grid)
          */}
          <div className="lg:col-span-1 space-y-6">
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

             {/* DragDropList tự đẩy chiều cao xuống */}
             {optimizedRoute.length === 0 && initialPlaces.length > 0 && (
                <DragDropList 
                     initialPlaces={initialPlaces} 
                     useManualOrder={useManualOrder} 
                     setUseManualOrder={setUseManualOrder} 
                     onDragEnd={onDragEnd} 
                     onDragStart={() => {}} 
                />
             )}

             {/* ResultList tự đẩy chiều cao xuống */}
             {optimizedRoute.length > 0 && (
              <div className="space-y-4"> {/* Bọc div để tạo khoảng cách */}
                <ResultList 
                    optimizedRoute={optimizedRoute} 
                    handleCardClick={handleCardClick} 
                    routeInfo={routeInfo} 
                />
                
                {/* NÚT SAVE CHO PC */}
                {isLoggedIn && (
                  <Button 
                    variant="outline" 
                    className="w-full border-green-600 text-green-700 hover:bg-green-600"
                    onClick={handleSaveRoute}
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Lưu vào lịch sử
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* --- CỘT PHẢI (BẢN ĐỒ) --- */}
          {/* 4. Thay đổi class:
              - h-full: Để nó cao bằng cột trái (nhờ Grid layout).
              - min-h-[500px]: Đặt chiều cao tối thiểu để lỡ cột trái ít nội dung quá thì bản đồ vẫn đẹp.
          */}
          <div className="lg:col-span-2 h-[580px] relative rounded-xl overflow-hidden border shadow-lg">
             <div className="w-full h-full">
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
    </div>
  );
};

export default OptimizeRoutePage;