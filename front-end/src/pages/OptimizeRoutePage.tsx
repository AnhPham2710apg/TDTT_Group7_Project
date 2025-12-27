// OptimizeRoutePage.tsx
import { useState, useEffect, KeyboardEvent, useRef } from "react";
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
  GripVertical, ArrowLeft, Save, Search, X,
  Info, CarTaxiFront, Car, Bike, LucideIcon
} from "lucide-react";
import { toast } from "sonner";
import RouteMap from "@/components/RouteMap";
import { useCart } from "@/context/CartContext";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/api-config";
import { createPortal } from "react-dom";

// --- INTERFACES (Giữ nguyên) ---
interface BackendErrorResponse { message?: string; detail?: string; }
interface Waypoint { id: string; address?: string; lat: number; lon: number; }
interface StartPointCoords { lat: number; lon: number; }
interface OptimizeResponse {
  optimized_order: string[]; distance_km: number; duration_min: number;
  polyline_outbound: string; polyline_return: string;
  start_point_coords: StartPointCoords; waypoints: Waypoint[];
}
interface InitialPlace { id: string; name: string; address: string; lat?: number; lon?: number; }

// NEW TYPE FOR VEHICLE
type VehicleType = "car" | "bike" | "taxi";

// --- NEW COMPONENT: VEHICLE SELECTOR ---
// Segmented control style for professional look
interface VehicleSelectorProps {
    value: VehicleType;
    onChange: (v: VehicleType) => void;
}

const VehicleSelector = ({ value, onChange }: VehicleSelectorProps) => {
    const options: { id: VehicleType; label: string; icon: LucideIcon }[] = [
        { id: "bike", label: "Bike", icon: Bike },
        { id: "car", label: "Car", icon: Car },
        { id: "taxi", label: "Taxi", icon: CarTaxiFront },
    ];

    return (
        <div className="flex p-1 bg-gray-100 rounded-lg w-full">
            {options.map((opt) => {
                const isActive = value === opt.id;
                const Icon = opt.icon;
                return (
                    <button
                        key={opt.id}
                        onClick={() => onChange(opt.id)}
                        className={`
                            flex-1 flex items-center justify-center gap-2 py-1.5 px-2 rounded-md text-sm font-medium transition-all duration-200
                            ${isActive 
                                ? "bg-white text-green-700 shadow-sm border border-green-200" 
                                : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
                            }
                        `}
                    >
                        <Icon className={`h-4 w-4 ${isActive ? "fill-green-100" : ""}`} />
                        <span className="hidden sm:inline lg:hidden xl:inline">{opt.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

// --- VEHICLE SELECTOR (MOBILE PILL) ---
const VehicleSelectorMobile = ({ value, onChange }: VehicleSelectorProps) => {
    const options: { id: VehicleType; label: string; icon: LucideIcon }[] = [
        { id: "bike", label: "Bike", icon: Bike },
        { id: "car", label: "Car", icon: Car },
        { id: "taxi", label: "Taxi", icon: CarTaxiFront },
    ];

    return (
        <div className="flex justify-center gap-3 py-2">
            {options.map((opt) => {
                const isActive = value === opt.id;
                const Icon = opt.icon;
                return (
                    <button
                        key={opt.id}
                        onClick={() => onChange(opt.id)}
                        className={`
                            flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium shadow-md transition-all duration-200 active:scale-95
                            ${isActive 
                                ? "bg-white text-green-600 ring-1 ring-green-100 border border-green-600 " 
                                : "bg-white text-gray-600 border border-transparent"
                            }
                        `}
                    >
                        <Icon className={`h-3.5 w-3.5 ${isActive ? "text-green-600 fill-green-50" : "text-gray-500"}`} />
                        <span>{opt.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

// --- COMPONENT CON (Giữ nguyên logic, chỉnh style nhẹ nếu cần) ---
// 1. DragDropList
interface DragDropListProps {
  initialPlaces: InitialPlace[]; useManualOrder: boolean;
  setUseManualOrder: (val: boolean) => void;
  onDragEnd: (result: DropResult) => void;
  onDragStart: () => void;
}
// --- COMPONENT CON: DRAG LIST (Đã chỉnh sửa UI số đếm) ---
const DragDropList = ({ 
    initialPlaces, 
    useManualOrder, 
    setUseManualOrder, 
    onDragEnd,
    onDragStart 
}: DragDropListProps) => {
  return (
    <div className="w-full md:border-2 md:border-dashed md:border-green-600 md:rounded-3xl md:p-5 md:bg-green-50/20">
        {/* Header giữ nguyên */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
             <ListChecks className="h-4 w-4 text-green-600" />
             <h3 className="font-semibold text-sm text-gray-700">Điểm cần đến ({initialPlaces.length})</h3>
          </div>

          {/* --- BẮT ĐẦU PHẦN TOOLTIP --- */}
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                {/* Bọc div này để khi rê chuột hoặc nhấn vào đều hiện giải thích */}
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg cursor-help select-none">
                   <span className={`text-[10px] font-bold uppercase ${useManualOrder ? "text-green-600" : "text-gray-500"}`}>
                      {useManualOrder ? "Thủ công" : "Tự động"}
                   </span>
                   <Switch checked={useManualOrder} onCheckedChange={setUseManualOrder} className="scale-75 data-[state=checked]:bg-green-600" />
                </div>
              </TooltipTrigger>
              
              <TooltipContent side="left" className="max-w-[220px] bg-slate-800 text-white border-none shadow-xl p-3">
                {useManualOrder ? (
                  <div className="space-y-1">
                    <p className="font-bold text-green-400 text-xs flex items-center gap-1">Chế độ Thủ công</p>
                    <p className="text-[11px] leading-tight text-gray-300">
                      Bạn tự do <b>kéo thả</b> để sắp xếp thứ tự đi. Hệ thống sẽ giữ nguyên thứ tự này khi tìm đường.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="font-bold text-blue-400 text-xs">Chế độ Tự động</p>
                    <p className="text-[11px] leading-tight text-gray-300">
                      Hệ thống sẽ <b>tự động sắp xếp lại</b> thứ tự các điểm đến sao cho tổng quãng đường đi là ngắn nhất.
                    </p>
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {/* --- KẾT THÚC PHẦN TOOLTIP --- */}
        </div>
        
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <Droppable droppableId="places-list">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3 pb-2">
                {initialPlaces.map((place, index) => (
                  <Draggable key={place.id} draggableId={place.id} index={index} isDragDisabled={!useManualOrder}>
                    {(provided, snapshot) => {
                       const originalStyle = provided.draggableProps.style as React.CSSProperties;
                       const style: React.CSSProperties = {
                          ...originalStyle,
                          ...(snapshot.isDragging ? { position: "fixed", zIndex: 99999, background: "white", border: "1px solid #16a34a", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", opacity: 0.95, borderRadius: "0.5rem" } : { transform: originalStyle.transform })
                       };
                       
                       const content = (
                         <div ref={provided.innerRef} {...provided.draggableProps} {...(useManualOrder ? provided.dragHandleProps : {})}
                           style={{ ...style, touchAction: useManualOrder ? 'none' : 'pan-y' }}
                           className={`
                                relative flex items-center gap-3 p-4 rounded-2xl border text-sm select-none transition-all
                                ${snapshot.isDragging ? "shadow-lg" : "bg-white border-gray-100 shadow-sm"}
                           `}
                         >
                           {/* UI SỐ ĐẾM ĐÃ SỬA: Dùng border thay vì bg */}
                           <div className={`
                                flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold flex-shrink-0 border-2
                                ${useManualOrder 
                                    ? 'border-green-500 text-green-600 bg-white'  // Style khi ở chế độ Thủ công
                                    : 'border-green-500 text-green-700 bg-white' // Style khi ở chế độ Tự động (GIỐNG ẢNH BẠN GỬI)
                                }
                           `}>
                                {index + 1}
                           </div>

                           <div className="flex-1 min-w-0 pointer-events-none">
                             <p className="font-semibold text-gray-800 truncate text-base">{place.name}</p>
                             {/* Ẩn địa chỉ trên mobile nếu quá dài để giống ảnh minimalist hơn, hoặc giữ lại tùy bạn */}
                             <p className="text-gray-500 text-xs truncate mt-0.5">{place.address}</p>
                           </div>
                           
                           {/* Icon nắm kéo thả chỉ hiện khi ở chế độ thủ công */}
                           {useManualOrder && <GripVertical className="h-5 w-5 text-gray-300" />}
                         </div>
                       );
                       return snapshot.isDragging ? createPortal(content, document.body) : content;
                    }}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
    </div>
  );
};

// 2. ResultList (UPDATED)
interface ResultListProps { 
    optimizedRoute: string[]; 
    handleCardClick: (index: number) => void; 
    routeInfo: { distance: string; duration: string; };
    vehicle?: VehicleType; // Passed from calculated state
}

const ResultList = ({ optimizedRoute, handleCardClick, routeInfo, vehicle = "car" }: ResultListProps) => {
  const vehicleConfig = {
      car: { label: "Ô tô", icon: Car },
      bike: { label: "Xe máy", icon: Bike },
      taxi: { label: "Taxi", icon: CarTaxiFront },
  };

  const currentVehicle = vehicleConfig[vehicle] || vehicleConfig.car;
  const VehicleIcon = currentVehicle.icon;

  return (
      <div className="space-y-3 pb-safe">
          <div className="space-y-2">
              {optimizedRoute.map((stop, index) => (
                  <div key={index} onClick={() => handleCardClick(index)}
                   className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-sm active:scale-[0.98] transition-transform"
                  >
                     <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-green-600 shadow-sm ${index === 0 || index === optimizedRoute.length - 1 ? 'bg-green-600' : 'bg-white border-2 border-green-500 text-green-700'}`}>
                        {index === 0 || index === optimizedRoute.length - 1 ? <Navigation className="h-4 w-4 text-white" /> : index}
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className={`text-sm ${index === 0 || index === optimizedRoute.length - 1 ? 'font-bold text-green-800' : 'font-medium text-gray-700'} truncate`}>{stop}</p>
                     </div>
                  </div>
              ))}
          </div>

          {/* --- HEADER TỔNG QUAN --- */}
          <div className="pt-2 pb-1">
              <div className="h-px w-full bg-gray-200" />
              <h4 className="text-md font-bold text-gray-700 flex items-center gap-2 mt-2">
                  <Info className="h-5 w-5 text-green-600" />
                  Tổng quan chuyến đi
              </h4>
          </div>

          {/* --- GRID THÔNG TIN --- */}
          <div className="grid grid-cols-3 gap-2 mb-2">
          
             <div className="bg-green-50 p-2 rounded-xl border border-green-300 flex flex-col items-center justify-center text-center mb-2">
                <span className="text-[10px] text-green-600 uppercase font-bold mb-1">Quãng đường</span>
                <span className="text-sm font-bold text-green-700">{routeInfo.distance}</span>
             </div>

             <div className="bg-green-50 p-2 rounded-xl border border-green-300 flex flex-col items-center justify-center text-center mb-2">
                <span className="text-[10px] text-green-600 uppercase font-bold mb-1">Thời gian</span>
                <span className="text-sm font-bold text-green-700">{routeInfo.duration}</span>
             </div>

             <div className="bg-green-50 p-2 rounded-xl border border-green-300 flex flex-col items-center justify-center text-center mb-2">
                <span className="text-[10px] text-green-600 uppercase font-bold mb-1">Phương tiện</span>
                <div className="flex items-center justify-center gap-1 text-green-700">
                    <VehicleIcon className="h-4 w-4" />
                    <span className="text-sm font-bold">{currentVehicle.label}</span>
                </div>
             </div>
             
          </div>
      </div>
  );
};

// --- COMPONENT CHÍNH ---
const OptimizeRoutePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const { username, isLoggedIn } = useAuth();

  // State dữ liệu
  const [startPoint, setStartPoint] = useState("");
  const [initialPlaces, setInitialPlaces] = useState<InitialPlace[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<string[]>([]);
  const [routeInfo, setRouteInfo] = useState({ distance: "", duration: "" });
  const [mapPoints, setMapPoints] = useState<Waypoint[]>([]);
  const [polyOutbound, setPolyOutbound] = useState<string | null>(null);
  const [polyReturn, setPolyReturn] = useState<string | null>(null);
  const [focusPoint, setFocusPoint] = useState<{lat: number, lon: number} | null>(null);
  const [rawRouteData, setRawRouteData] = useState<{ distance: number; duration: number; } | null>(null);

  // State điều khiển UI
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [useManualOrder, setUseManualOrder] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Selection State (Input)
  const [vehicle, setVehicle] = useState<VehicleType>("car");
  // 2. Display State (Result) - Fixes logical flaw
  const [calculatedVehicle, setCalculatedVehicle] = useState<VehicleType | null>(null);
  // Vehicle Selector State
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  
  // Custom Drawer State
  // 0: Mini (20%), 1: Medium (50%), 2: Max (85%)
  const [drawerLevel, setDrawerLevel] = useState<0 | 1 | 2>(1); 
  const [isDragging, setIsDragging] = useState(false);
  // Refs lưu trữ giá trị tạm thời để tính toán (tránh re-render)
  const drawerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);       // Vị trí ngón tay lúc chạm
  const drawerStartHeight = useRef<number>(0); // Chiều cao drawer lúc chạm

  // Hàm tính chiều cao đích (Target Height) dựa trên Level hiện tại
  // Dùng để Snap về sau khi thả tay
  const getTargetHeightStyle = (level: 0 | 1 | 2) => {
      switch(level) {
          case 0: return "100px"; 
          case 1: return "50dvh"; 
          case 2: return "calc(100dvh - 120px)"; 
          default: return "50dvh";
      }
  };

  // Parse URL
  useEffect(() => {
    const separator = "|||";
    const names = (searchParams.get("names") || "").split(separator).filter(Boolean);
    const addresses = (searchParams.get("addresses") || "").split(separator);
    const lats = (searchParams.get("lats") || "").split(separator);
    const lngs = (searchParams.get("lngs") || "").split(separator);
    const startParam = searchParams.get("start");

    if (startParam) setStartPoint(startParam);
    if (names.length > 0) {
      setInitialPlaces(names.map((name, i) => ({
        id: `place-${i}-${Date.now()}`, name, address: addresses[i] || "",
        lat: parseFloat(lats[i] || "0"), lon: parseFloat(lngs[i] || "0")
      })));
    }
  }, [searchParams]);

  // 1. CHẠM VÀO (TOUCH START) - FIX TUYỆT ĐỐI
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!drawerRef.current) return;
    
    // B1: Lấy chiều cao THỰC TẾ hiện tại (pixel)
    const currentHeight = drawerRef.current.getBoundingClientRect().height;
    
    // B2: Lưu ngay vào ref để dùng cho lần render tiếp theo và tính toán di chuyển
    drawerStartHeight.current = currentHeight;
    touchStartY.current = e.touches[0].clientY;

    // B3: Cập nhật state. 
    // Quan trọng: Vì drawerStartHeight.current đã có dữ liệu, 
    // khi React render lại với isDragging=true, nó sẽ lấy đúng chiều cao này.
    setIsDragging(true);
  };

  // 2. DI CHUYỂN (TOUCH MOVE)
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !drawerRef.current) return;

    // e.preventDefault(); // Có thể bật nếu muốn chặn scroll trang nền

    const currentY = e.touches[0].clientY;
    const deltaY = touchStartY.current - currentY; // Kéo lên (+), Kéo xuống (-)
    
    // Tính toán chiều cao mới dựa trên chiều cao thực tế lúc bắt đầu
    let newHeight = drawerStartHeight.current + deltaY;

    // Giới hạn (Clamping)
    const maxHeight = window.innerHeight - 120; 
    const minHeight = 100; 

    // Hiệu ứng kháng lực (Elastic) khi kéo quá giới hạn
    if (newHeight > maxHeight) newHeight = maxHeight + (newHeight - maxHeight) * 0.2;
    if (newHeight < minHeight) newHeight = minHeight - (minHeight - newHeight) * 0.2;

    // Cập nhật DOM trực tiếp để đạt 60fps
    drawerRef.current.style.height = `${newHeight}px`;
  };

  // 3. THẢ TAY (TOUCH END)
  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsDragging(false); // Kết thúc kéo
    if (!drawerRef.current) return;

    const endY = e.changedTouches[0].clientY;
    const deltaY = touchStartY.current - endY;
    const threshold = window.innerHeight * 0.10; // 10% màn hình

    let nextLevel = drawerLevel;

    // Logic xác định hướng Snap
    if (deltaY > threshold) {
        // Kéo lên mạnh
        if (drawerLevel === 0) nextLevel = 1;
        else if (drawerLevel === 1) nextLevel = 2;
    } 
    else if (deltaY < -threshold) {
        // Kéo xuống mạnh
        if (drawerLevel === 2) nextLevel = 1;
        else if (drawerLevel === 1) nextLevel = 0;
    }
    
    setDrawerLevel(nextLevel);
    
    // Xóa style height inline để React quay lại quản lý bằng class/style prop
    // (Việc này sẽ xảy ra sau khi state isDragging cập nhật về false)
    drawerRef.current.style.height = ''; 
  };

  // Tính toán chiều cao dựa trên level
  const getDrawerHeight = () => {
      switch(drawerLevel) {
          case 0: 
              // Mini: Dùng px cố định để đảm bảo hiển thị đủ nội dung tối thiểu (khoảng 2 dòng list)
              return "100px"; 
          case 1: 
              // Medium: 50% màn hình
              return "50dvh"; 
          case 2: 
              // Max: 100% màn hình trừ đi 120px (Khoảng cách an toàn cho thanh Input phía trên)
              // 120px bao gồm: Tai thỏ + Margin top + Chiều cao Input + Khoảng hở thẩm mỹ
              return "calc(100dvh - 120px)"; 
          default: 
              return "50dvh";
      }
  };

  // --- API HANDLERS ---
  const handleOptimize = async () => {
    if (!startPoint) { toast.error("Vui lòng nhập điểm xuất phát"); return; }
    setIsOptimizing(true);
    setDrawerLevel(0); 
    setShowVehicleSelector(false);

    try {
      if (initialPlaces.length === 0) throw new Error("Không có địa điểm.");
      
      const placesPayload = initialPlaces.map(p => ({ name: p.name, address: p.address, lat: p.lat || 0, lng: p.lon || 0 }));
      
      const response = await axios.post<OptimizeResponse>(`${API_BASE_URL}/api/optimize`, {
        places: placesPayload, 
        starting_point: startPoint, 
        use_manual_order: useManualOrder,
        vehicle: vehicle 
      });
      
      const data = response.data;
      setOptimizedRoute([`Xuất phát: ${startPoint}`, ...data.optimized_order.map((n, i) => `${i + 1}. ${n}`), `Kết thúc: ${startPoint}`]);
      setRouteInfo({ distance: `${data.distance_km.toFixed(1)} km`, duration: `${Math.round(data.duration_min)} phút` });
      setRawRouteData({ distance: data.distance_km, duration: data.duration_min });
      setPolyOutbound(data.polyline_outbound);
      setPolyReturn(data.polyline_return);
      setMapPoints([{ id: 'start', address: startPoint, ...data.start_point_coords }, ...data.waypoints]);
      
      // *** CRITICAL UPDATE: Commit the selected vehicle to display state ONLY on success ***
      setCalculatedVehicle(vehicle);

      toast.success(`Đã tối ưu lộ trình (${vehicle.toUpperCase()})`);
      clearCart();
      setDrawerLevel(1); 
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<BackendErrorResponse>;
        const message = axiosError.response?.data?.message || axiosError.response?.data?.detail || "Lỗi khi tối ưu lộ trình.";
        toast.error(message);
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Lỗi không xác định xảy ra.");
      }
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSaveRoute = async () => {
    if (!isLoggedIn || !username) { navigate("/login"); return; }
    if (!rawRouteData) return;
    setIsSaving(true);
    try {
       await axios.post(`${API_BASE_URL}/api/routes`, {
         username, start_point: startPoint,
         places: initialPlaces.map(p => ({ name: p.name, address: p.address, lat: p.lat||0, lng: p.lon||0 })),
         distance: rawRouteData.distance, duration: rawRouteData.duration,
         polyline_outbound: polyOutbound || "", polyline_return: polyReturn || ""
       });
       toast.success("Đã lưu lộ trình!");
    } catch { toast.error("Lỗi khi lưu"); } 
    finally { setIsSaving(false); }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isOptimizing && startPoint) {
      e.preventDefault(); // Ngăn xuống dòng hoặc submit form mặc định
      // Tự động đóng bàn phím trên mobile
      (e.target as HTMLInputElement).blur(); 
      handleOptimize();
    }
  };

  // --- DRAG HANDLERS (LIST) ---
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(initialPlaces);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setInitialPlaces(items);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-white md:bg-gray-50 overflow-hidden relative">
      
      {/* ================= PC UI (Giữ nguyên không đổi) ================= */}
      <div className="hidden md:block">
         <Navbar />
         <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-80px)]">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Tối ưu hóa Lộ trình</h1>
                <p className="text-muted-foreground">Tạo lộ trình hiệu quả nhất trên màn hình lớn</p>
            </div>
            <div className="grid lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-1 space-y-6">
                    <Card className="p-6">
                        <Label>Điểm xuất phát</Label>
                        <Input value={startPoint} onChange={e => setStartPoint(e.target.value)} className="mt-2 mb-4" placeholder="Nhập địa chỉ..." onKeyDown={handleKeyDown} />
                        <div className="mb-4">
                            <Label className="mb-2 block">Phương tiện</Label>
                            <VehicleSelector value={vehicle} onChange={setVehicle} />
                        </div>
                        <Button onClick={handleOptimize} disabled={isOptimizing} className="w-full bg-green-600 hover:bg-green-700">{isOptimizing ? "Đang xử lý..." : "Tối ưu ngay"}</Button>
                    </Card>
                    {optimizedRoute.length === 0 && <DragDropList initialPlaces={initialPlaces} useManualOrder={useManualOrder} setUseManualOrder={setUseManualOrder} onDragEnd={onDragEnd} onDragStart={() => {}} />}
                    {optimizedRoute.length > 0 && (
                        <div className="space-y-4">
                            {/* --- BẮT ĐẦU: THÊM HEADER CHO PC --- */}
                            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 animate-slide-up">
                                <MapPin className="h-5 w-5 text-green-600" />
                                <h3 className="font-bold text-lg text-green-800">Lộ trình tối ưu</h3>
                            </div>
                            {/* --- KẾT THÚC: THÊM HEADER CHO PC --- */}
                            <ResultList 
                                optimizedRoute={optimizedRoute} 
                                handleCardClick={(i) => setFocusPoint(mapPoints[i] ? {lat: mapPoints[i].lat, lon: mapPoints[i].lon} : null)} 
                                routeInfo={routeInfo} 
                                // Pass the CALCULATED vehicle (or fallback to current if first run)
                                vehicle={calculatedVehicle ?? vehicle} 
                            />
                            {isLoggedIn && (<Button onClick={handleSaveRoute} disabled={isSaving} className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-md text-base font-medium">{isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />} Lưu chuyến đi này</Button>)}
                        </div>
                    )}
                 </div>
                 <div className="lg:col-span-2 h-[600px] rounded-xl overflow-hidden border shadow-lg">
                    <RouteMap polylineOutbound={polyOutbound} polylineReturn={polyReturn} points={mapPoints} focusPoint={focusPoint} />
                 </div>
            </div>
         </div>
      </div>

      {/* ================= MOBILE UI (ĐÃ CẬP NHẬT KHOẢNG CÁCH) ================= */}
      <div className="md:hidden w-full h-[100dvh] relative flex flex-col">
          
          {/* 1. TOP BAR FLOATING: Input & Buttons */}
          {/* UPDATE: Thêm `px-4` (padding ngang) và `pt-safe` (tránh tai thỏ).
              Quan trọng: Thêm div con với `mt-3` hoặc `mt-4` để tạo khoảng cách với mép trên. 
          */}
          {/* 1. FLOATING TOP CONTROLS */}
          <div className="absolute top-0 left-0 right-0 z-[50] px-4 pt-safe pointer-events-none">
              <div className="mt-4 flex flex-col pointer-events-auto pb-2">
                   {/* Row 1: Search Bar & Actions */}
                   <div className="flex items-center gap-3">
                        <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-11 w-11 rounded-full shadow-lg bg-white border border-gray-100 text-gray-700 shrink-0 active:scale-95 transition-transform hover:bg-green-600 hover:text-white" 
                            onClick={() => navigate(-1)}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        
                        <div className="flex-1 relative shadow-lg rounded-full group">
                            <Input 
                                className="h-11 pl-11 pr-9 rounded-full border-none shadow-sm bg-white text-base focus-visible:ring-2 focus-visible:ring-green-500 transition-all" 
                                placeholder="Điểm xuất phát..." 
                                value={startPoint} 
                                onChange={(e) => setStartPoint(e.target.value)} 
                                // EVENT UPDATE: Hiện Vehicle Selector khi focus
                                onFocus={() => {
                                    setDrawerLevel(0);
                                    setShowVehicleSelector(true);
                                }} 
                                onKeyDown={handleKeyDown}
                            />
                            <Search className="absolute left-4 top-3 h-5 w-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                            {startPoint && (
                                <button 
                                    className="absolute right-3 top-2.5 p-1 rounded-full hover:bg-gray-100 text-gray-400" 
                                    onClick={() => setStartPoint("")}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        <Button 
                            size="icon" 
                            className={`h-11 w-11 rounded-full shadow-lg shrink-0 transition-all active:scale-95 ${optimizedRoute.length > 0 ? 'bg-green-600 hover:bg-green-700 border-2 border-white' : 'bg-green-600 hover:bg-green-700 border-2 border-white'}`} 
                            onClick={handleOptimize} 
                            disabled={isOptimizing}
                        >
                            {isOptimizing ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Navigation className="h-5 w-5 text-white" />}
                        </Button>
                   </div>

                   {/* Row 2: PILL VEHICLE SELECTOR (FLOATING & CONDITIONAL) */}
                   {/* Animation mượt mà: max-height từ 0 -> 60px */}
                   <div 
                       className={`
                           overflow-hidden transition-all duration-300 ease-in-out
                           ${showVehicleSelector ? 'max-h-[60px] opacity-100 mt-1' : 'max-h-0 opacity-0 mt-0'}
                       `}
                   >
                       <VehicleSelectorMobile value={vehicle} onChange={setVehicle} />
                   </div>
              </div>
          </div>

          {/* 2. MAP BACKGROUND (Full Screen) */}
          <div className="absolute inset-0 z-0">
             <RouteMap 
                 polylineOutbound={polyOutbound} 
                 polylineReturn={polyReturn}
                 points={mapPoints} 
                 focusPoint={focusPoint}
             />
          </div>

          {/* 3. CUSTOM DRAWER (Bottom Sheet) */}
          {/* Overlay (Hiện khi Max drawer để tập trung) */}
          <div 
            className={`absolute inset-0 bg-black/30 z-[30] transition-opacity duration-300 ${drawerLevel === 2 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
            onClick={() => setDrawerLevel(1)} 
          />

          {/* 4. DRAWER CONTAINER - ĐÃ SỬA LỖI GIẬT */}
          <div 
             ref={drawerRef}
             className={`
                absolute bottom-0 left-0 right-0 bg-white rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] z-[40] flex flex-col 
                will-change-height
                ${isDragging ? '' : 'transition-all duration-300 cubic-bezier(0.25, 1, 0.5, 1)'}
             `}
             style={{ 
                 // FIX QUAN TRỌNG: 
                 // Khi đang kéo (isDragging=true), dùng drawerStartHeight.current (chiều cao pixel thực tế).
                 // Điều này đảm bảo React render ra đúng chiều cao hiện tại, không bị nhảy về undefined hay giá trị khác.
                 height: isDragging ? `${drawerStartHeight.current}px` : getTargetHeightStyle(drawerLevel),
                 touchAction: 'none'
             }}
          >
              {/* Handle Bar */}
              <div 
                  className="w-full flex flex-col items-center justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onClick={(e) => { if (!isDragging) setDrawerLevel(prev => prev === 0 ? 1 : prev === 1 ? 2 : 1) }}
              >
                  <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-1" />
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto px-4 pb-safe pt-1 overscroll-contain no-scrollbar select-none">
                  {optimizedRoute.length === 0 && (
                      <div className="animate-slide-up">
                          <DragDropList initialPlaces={initialPlaces} useManualOrder={useManualOrder} setUseManualOrder={setUseManualOrder} onDragEnd={onDragEnd} onDragStart={() => {}} />
                          {initialPlaces.length > 0 && (
                            <div className="flex items-start gap-2 mt-4 p-3 bg-green-50 text-green-700 rounded-xl text-xs">
                                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                <p>Nhập điểm xuất phát ở thanh trên cùng, sau đó nhấn nút mũi tên xanh để bắt đầu tìm đường.</p>
                            </div>
                          )}
                      </div>
                  )}
                  {optimizedRoute.length > 0 && (
                      <div className="animate-slide-up space-y-4">
                          <div className="flex items-center justify-between top-0 bg-white z-10 py-2 border-b border-gray-50">
                              <h3 className="font-bold text-lg text-green-800 flex items-center gap-2"><MapPin className="h-5 w-5" /> Lộ trình tối ưu</h3>
                          </div>
                          <ResultList optimizedRoute={optimizedRoute} routeInfo={routeInfo} vehicle={calculatedVehicle ?? vehicle} handleCardClick={(i) => {
                                 const p = mapPoints[i] || mapPoints[0];
                                 if (p) setFocusPoint({lat: p.lat, lon: p.lon});
                                 setDrawerLevel(0); 
                             }} 
                          />
                          {isLoggedIn && (<Button onClick={handleSaveRoute} disabled={isSaving} className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-md text-base font-medium">{isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />} Lưu chuyến đi này</Button>)}
                          <div className="h-6" />
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default OptimizeRoutePage;