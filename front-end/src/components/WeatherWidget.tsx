// src/components/WeatherWidget.tsx
import React from 'react';
import { Cloud, Sun, CloudRain, CloudLightning, Wind } from 'lucide-react';

interface WeatherData {
    city: string;
    temp: number;
    desc: string;
    humidity: number;
}

interface WeatherWidgetProps {
    data: WeatherData | null;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ data }) => {
    if (!data) return null;

    // Chon icon dua theo mo ta (don gian)
    const getIcon = (desc: string) => {
        const d = desc.toLowerCase();
        if (d.includes('m?a') || d.includes('rain')) return <CloudRain className="h-6 w-6 text-blue-400" />;
        if (d.includes('mây') || d.includes('cloud')) return <Cloud className="h-6 w-6 text-gray-400" />;
        if (d.includes('n?ng') || d.includes('clear')) return <Sun className="h-6 w-6 text-yellow-500" />;
        return <Wind className="h-6 w-6 text-teal-400" />;
    };

    // Lay loi khuyen
    const getAdvice = (temp: number, desc: string) => {
        const d = desc.toLowerCase();
        if (d.includes('m?a')) return "Tr?i ?ang m?a, làm n?i l?u cho ?m nhé!";
        if (temp > 32) return "N?ng nóng quá, tìm món gì gi?i nhi?t thôi!";
        if (temp < 20) return "Tr?i se l?nh, ?? n??ng là chân ái.";
        return "Th?i ti?t ??p ?? khám phá quán ngon!";
    };

    return (
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-white/40 shadow-sm text-sm md:text-base animate-in fade-in duration-500">
            <div className="flex items-center gap-2 pr-3 border-r border-gray-300">
                {getIcon(data.desc)}
                <div className="flex flex-col leading-none">
                    <span className="font-bold text-gray-800">{Math.round(data.temp)}°C</span>
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">{data.city}</span>
                </div>
            </div>

            <div className="text-gray-700 italic hidden sm:block">
                "{getAdvice(data.temp, data.desc)}"
            </div>

            {/* Mobile chi hien icon va nhiet do, an text dai */}
        </div>
    );
};

export default WeatherWidget;