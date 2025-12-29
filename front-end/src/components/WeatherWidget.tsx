// src/components/WeatherWidget.tsx
import React, { useMemo } from 'react';
import { Cloud, Sun, CloudRain, Wind } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WeatherData {
    city: string;
    temp: number;
    desc: string;
    humidity: number;
}

interface WeatherWidgetProps {
    data: WeatherData | null;
}

const getRandomAdvice = (list: string[]) => {
    return list[Math.floor(Math.random() * list.length)];
};

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ data }) => {
    const { t } = useTranslation();

    const weatherTheme = useMemo(() => {
        // 1. CHUYỂN DỮ LIỆU LỜI KHUYÊN VÀO TRONG ĐỂ DÙNG HÀM t()
        const ADVICE_COLLECTION = {
            rain: [
                t('weather.advice.rain_1', "Mưa rồi, làm nồi lẩu chua cay thôi!"),
                t('weather.advice.rain_2', "Trời mưa, order phở nóng hổi nhé."),
                t('weather.advice.rain_3', "Mưa lạnh, mì cay là chân ái."),
                t('weather.advice.rain_4', "Mưa rơi, cafe ngắm cảnh cực chill.")
            ],
            hot: [
                t('weather.advice.hot_1', "Nóng quá, đi ăn kem/bingsu giải nhiệt!"),
                t('weather.advice.hot_2', "Nắng gắt, trà sữa full topping ngay."),
                t('weather.advice.hot_3', "Oi bức, làm cốc bia hơi cho mát."),
                t('weather.advice.hot_4', "Nắng lên, ăn món cuốn thanh mát nhé.")
            ],
            cool: [ 
                t('weather.advice.cool_1', "Trời mát, đi ăn ốc vỉa hè cực lý tưởng."),
                t('weather.advice.cool_2', "Trời đẹp, rủ bạn thân nướng BBQ đi."),
                t('weather.advice.cool_3', "Gió mát, ra bờ kè ăn vặt hóng gió."),
                t('weather.advice.cool_4', "Thời tiết đẹp, đi cafe rooftop ngay.")
            ],
            default: [ 
                t('weather.advice.default_1', "Thời tiết đẹp, đi Food Tour thôi!"),
                t('weather.advice.default_2', "Hôm nay ăn gì? Tìm quán ngon ngay."),
                t('weather.advice.default_3', "Đừng để bụng đói, khám phá quán hot.")
            ]
        };

        if (!data) return {
            icon: <Wind className="w-5 h-5 text-gray-400" />,
            color: "text-gray-600",
            advice: ""
        };

        const d = data.desc.toLowerCase();
        
        // 2. LOGIC CHỌN THEME & ADVICE
        // MƯA (Xanh dương)
        if (d.includes('mưa') || d.includes('rain')) {
            return {
                icon: <CloudRain className="w-5 h-5 text-blue-500" />,
                color: "text-blue-600",
                advice: getRandomAdvice(ADVICE_COLLECTION.rain)
            };
        }

        // NẮNG/NÓNG (Vàng cam)
        if (d.includes('nắng') || d.includes('clear') || data.temp > 32) {
            return {
                icon: <Sun className="w-5 h-5 text-amber-500" />,
                color: "text-amber-600",
                advice: getRandomAdvice(ADVICE_COLLECTION.hot)
            };
        }

        // MÁT/MÂY (Xanh ngọc)
        if (d.includes('mây') || d.includes('cloud') || (data.temp >= 20 && data.temp <= 28)) {
            return {
                icon: <Cloud className="w-5 h-5 text-emerald-500" />,
                color: "text-emerald-600",
                advice: getRandomAdvice(ADVICE_COLLECTION.cool)
            };
        }

        // DEFAULT
        return {
            icon: <Wind className="w-5 h-5 text-teal-500" />,
            color: "text-teal-600",
            advice: getRandomAdvice(ADVICE_COLLECTION.default)
        };
        
    }, [data, t]); // Thêm t vào dependency để cập nhật khi đổi ngôn ngữ

    if (!data) return null;

    return (
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

            {/* Phần 3: Lời khuyên (PC) */}
            <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600 italic whitespace-nowrap">
                    "{weatherTheme.advice}"
                </span>
            </div>

            {/* Phần 4: Mobile (Hiển thị description từ API) */}
            <div className="sm:hidden text-xs text-gray-500 capitalize">
                {data.desc}
            </div>
        </div>
    );
};

export default WeatherWidget;