// src/components/WeatherWidget.tsx
import React, { useMemo } from 'react';
import { Cloud, Sun, CloudRain, Wind, Droplets, MapPin } from 'lucide-react';

interface WeatherData {
    city: string;
    temp: number;
    desc: string;
    humidity: number;
}

interface WeatherWidgetProps {
    data: WeatherData | null;
}

// 1. KHO DỮ LIỆU LỜI KHUYÊN (Giữ nguyên nhưng rút gọn câu văn chút cho compact)
const ADVICE_COLLECTION = {
    rain: [
        "Mưa rồi, làm nồi lẩu chua cay thôi!",
        "Trời mưa, order phở nóng hổi nhé.",
        "Mưa lạnh, mì cay là chân ái.",
        "Mưa rơi, cafe ngắm cảnh cực chill."
    ],
    hot: [
        "Nóng quá, đi ăn kem/bingsu giải nhiệt!",
        "Nắng gắt, trà sữa full topping ngay.",
        "Oi bức, làm cốc bia hơi cho mát.",
        "Nắng lên, ăn món cuốn thanh mát nhé."
    ],
    cool: [ 
        "Trời mát, đi ăn ốc vỉa hè cực lý tưởng.",
        "Trời đẹp, rủ bạn thân nướng BBQ đi.",
        "Gió mát, ra bờ kè ăn vặt hóng gió.",
        "Thời tiết đẹp, đi cafe rooftop ngay."
    ],
    default: [ 
        "Thời tiết đẹp, đi Food Tour thôi!",
        "Hôm nay ăn gì? Tìm quán ngon ngay.",
        "Đừng để bụng đói, khám phá quán hot."
    ]
};

const getRandomAdvice = (list: string[]) => {
    return list[Math.floor(Math.random() * list.length)];
};

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ data }) => {
    
    const weatherTheme = useMemo(() => {
        if (!data) return {
            icon: <Wind className="w-5 h-5 text-gray-400" />,
            color: "text-gray-600",
            advice: ""
        };

        const d = data.desc.toLowerCase();
        
        // 1. MƯA (Xanh dương)
        if (d.includes('mưa') || d.includes('rain')) {
            return {
                icon: <CloudRain className="w-5 h-5 text-blue-500" />,
                color: "text-blue-600",
                advice: getRandomAdvice(ADVICE_COLLECTION.rain)
            };
        }

        // 2. NẮNG/NÓNG (Vàng cam - nhưng dùng tone dịu)
        if (d.includes('nắng') || d.includes('clear') || data.temp > 32) {
            return {
                icon: <Sun className="w-5 h-5 text-amber-500" />,
                color: "text-amber-600",
                advice: getRandomAdvice(ADVICE_COLLECTION.hot)
            };
        }

        // 3. MÁT/MÂY (Xanh ngọc - Hợp theme web)
        if (d.includes('mây') || d.includes('cloud') || (data.temp >= 20 && data.temp <= 28)) {
            return {
                icon: <Cloud className="w-5 h-5 text-emerald-500" />, // Dùng màu Emerald của web
                color: "text-emerald-600",
                advice: getRandomAdvice(ADVICE_COLLECTION.cool)
            };
        }

        // 4. DEFAULT
        return {
            icon: <Wind className="w-5 h-5 text-teal-500" />,
            color: "text-teal-600",
            advice: getRandomAdvice(ADVICE_COLLECTION.default)
        };
        
    }, [data]);

    if (!data) return null;

    return (
        // Container chính: Nhỏ gọn, bo tròn, nền trắng mờ, viền xanh nhẹ
        <div className="
            flex items-center gap-3 py-1.5 px-4 rounded-full 
            bg-white/90 backdrop-blur-sm border border-emerald-100 shadow-sm
            animate-in fade-in slide-in-from-bottom-2 duration-500
            hover:shadow-md transition-all cursor-default
            max-w-fit mx-auto
        ">
            {/* Phần 1: Icon + Nhiệt độ */}
            <div className="flex items-center gap-2">
                {weatherTheme.icon}
                <span className={`text-sm font-bold ${weatherTheme.color}`}>
                    {Math.round(data.temp)}°C
                </span>
            </div>

            {/* Phần 2: Vách ngăn nhỏ */}
            <div className="w-px h-3 bg-gray-300 hidden sm:block"></div>

            {/* Phần 3: Lời khuyên (Chỉ hiện trên PC, Mobile ẩn để gọn) */}
            <div className="hidden sm:flex items-center gap-2">
                {/* Xóa 'truncate' và 'max-w-[200px]', thêm 'whitespace-nowrap' để giữ text trên 1 dòng */}
                <span className="text-xs font-medium text-gray-600 italic whitespace-nowrap">
                    "{weatherTheme.advice}"
                </span>
            </div>

            {/* Phần 4: Mobile thay thế lời khuyên bằng mô tả ngắn */}
            <div className="sm:hidden text-xs text-gray-500 capitalize">
                {data.desc}
            </div>
        </div>
    );
};

export default WeatherWidget;