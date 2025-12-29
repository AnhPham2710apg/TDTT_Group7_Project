// src/pages/ResultsPage.tsx

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import RestaurantCard from "@/components/RestaurantCard";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Restaurant } from "@/types";
import {
    Search, Loader2,
    ArrowUp, ArrowDown,
    Star, DollarSign,
    ListFilter
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { API_BASE_URL } from "@/lib/api-config";
import { useTranslation } from 'react-i18next';

const ResultsPage = () => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Data States
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Sorting States
    const [sortBy, setSortBy] = useState<"price" | "rating" | null>(null);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    // --- HÀM FETCH KẾT QUẢ (CẬP NHẬT) ---
    const fetchResults = async () => {
        setIsLoading(true);
        try {
            const queryString = searchParams.toString();
            const response = await axios.get(`${API_BASE_URL}/api/search?${queryString}`);

            // LOGIC XỬ LÝ DATA MỚI TỪ BACKEND
            let apiResults: Restaurant[] = [];

            // Kiểm tra cấu trúc trả về
            if (response.data && response.data.results) {
                // Trường hợp API mới: { weather: {...}, results: [...] }
                apiResults = response.data.results;
            } else if (Array.isArray(response.data)) {
                // Trường hợp API cũ hoặc fallback: [...]
                apiResults = response.data;
            } else {
                // Trường hợp rỗng hoặc lỗi lạ
                apiResults = [];
            }

            const username = localStorage.getItem("username");
            let favoritePlaceIds = new Set<string>();

            if (username) {
                try {
                    const favRes = await axios.get(`${API_BASE_URL}/api/favorite/${username}`);
                    favoritePlaceIds = new Set(favRes.data.favorites);
                } catch (e) { console.error(e); }
            }

            const syncedResults = apiResults.map(r => ({
                ...r,
                is_favorite: favoritePlaceIds.has(r.place_id)
            }));

            setRestaurants(syncedResults);
        } catch (error) {
            console.error("Fetch error:", error);
            toast.error(t('results.toast_no_results', "Không tìm thấy kết quả phù hợp."));
            setRestaurants([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchResults();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // Logic sắp xếp Client-side (vẫn giữ để user sort lại nếu thích)
    const sortedRestaurants = useMemo(() => {
        // Nếu user chưa chọn sort thủ công -> Giữ nguyên thứ tự từ Server (đã ưu tiên mở cửa)
        if (!sortBy) return restaurants;

        return [...restaurants].sort((a, b) => {
            let valA = 0;
            let valB = 0;

            if (sortBy === "price") {
                valA = Number(a.price_level) || 0;
                valB = Number(b.price_level) || 0;
            } else if (sortBy === "rating") {
                valA = a.rating || 0;
                valB = b.rating || 0;
            }

            if (sortOrder === "asc") {
                return valA - valB;
            } else {
                return valB - valA;
            }
        });
    }, [restaurants, sortBy, sortOrder]);

    const toggleOrder = () => {
        setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    };

    const handleToggleFavorite = async (restaurant: Restaurant) => {
        const username = localStorage.getItem("username");
        if (!username) { toast.error(t('common.login_required', "Bạn cần đăng nhập")); return; }

        const isCurrentlyFavorite = restaurant.is_favorite;
        const method = isCurrentlyFavorite ? "delete" : "post";
        const url = `${API_BASE_URL}/api/favorite`;
        const data = { username: username, place_id: restaurant.place_id };

        try {
            setRestaurants(prev => prev.map(r => r.id === restaurant.id ? { ...r, is_favorite: !r.is_favorite } : r));
            if (method === "post") {
                await axios.post(url, data);
                toast.success(t('favorite.added_success', "Đã thêm vào yêu thích!"));
            } else {
                await axios.delete(url, { data: data });
                toast.success(t('favorite.removed_success', "Đã xóa khỏi yêu thích"));
            }
        } catch (error) {
            setRestaurants(prev => prev.map(r => r.id === restaurant.id ? { ...r, is_favorite: isCurrentlyFavorite } : r));
            toast.error(t('common.error', "Lỗi cập nhật"));
        }
    };

    // Component Nút Sắp Xếp
    const SortButtonGroup = ({ isMobile = false }) => (
        <div className={`flex items-center bg-white rounded-lg p-0.5 border border-border shadow-sm ${isMobile ? 'h-8' : ''}`}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`${isMobile ? 'h-7 px-2 text-xs' : 'h-8 px-3 text-sm'} gap-1.5 text-muted-foreground hover:text-primary hover:bg-gray/90`}
                    >
                        <ListFilter className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
                        <span className="font-medium">
                            {sortBy === "price"
                                ? t('results.sort_price', 'Giá cả')
                                : sortBy === "rating"
                                    ? t('results.sort_rating', 'Đánh giá')
                                    : t('results.sort_label', 'Sắp xếp')}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => { setSortBy("rating"); setSortOrder("desc"); }} className="cursor-pointer">
                        <Star className="mr-2 h-4 w-4 text-yellow-500" /> {t('results.sort_rating', 'Đánh giá')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy("price"); setSortOrder("asc"); }} className="cursor-pointer">
                        <DollarSign className="mr-2 h-4 w-4 text-green-600" /> {t('results.sort_price', 'Giá cả')}
                    </DropdownMenuItem>
                    {sortBy && (
                        <DropdownMenuItem onClick={() => setSortBy(null)} className="text-muted-foreground border-t mt-1 cursor-pointer">
                            {t('results.sort_default', 'Mặc định')}
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {sortBy && (
                <>
                    <div className={`w-[1px] bg-border mx-0.5 ${isMobile ? 'h-3' : 'h-4'}`}></div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`${isMobile ? 'h-7 w-7' : 'h-8 w-8'} p-0 hover:bg-background rounded-md`}
                        onClick={toggleOrder}
                        title={sortOrder === "asc" ? t('results.sort_asc', "Tăng dần") : t('results.sort_desc', "Giảm dần")}
                    >
                        {sortOrder === "asc" ? (
                            <ArrowUp className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-primary animate-in zoom-in duration-200`} />
                        ) : (
                            <ArrowDown className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-primary animate-in zoom-in duration-200`} />
                        )}
                    </Button>
                </>
            )}
        </div>
    );

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="flex items-center justify-center h-[calc(100vh-80px)]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="container mx-auto px-4 py-6 md:py-8">

                {/* === HEADER TOOLBAR (ĐÃ SỬA ĐỂ THÊM WEATHER WIDGET) === */}
                {/* === HEADER TOOLBAR (ĐÃ CHỈNH SỬA UI PC) === */}
                <div className="mb-6 md:mb-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">

                        {/* 1. CỤM TRÁI: Tiêu đề + Kết quả + Nút Sắp Xếp (PC) */}
                        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 w-full md:w-auto">
                            {/* Text Info */}
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold mb-1 leading-none">
                                    {t('results.title', 'Kết quả tìm kiếm')}
                                </h1>
                                <p className="text-muted-foreground text-sm">
                                    {t('results.found_prefix', 'Tìm thấy')}{" "}
                                    <span className="font-medium text-foreground">{restaurants.length}</span>{" "}
                                    {t('results.found_suffix', 'quán phù hợp.')}
                                </p>
                            </div>

                            {/* Nút Sắp xếp (Chỉ hiện trên PC - Nằm ngang hàng với Text) */}
                            <div className="hidden md:block pb-1"> {/* pb-1 để căn chỉnh đẹp hơn với dòng text cuối */}
                                <SortButtonGroup isMobile={false} />
                            </div>
                        </div>

                        {/* 2. CỤM PHẢI: Các nút hành động */}
                        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                            
                            {/* Nút Sắp xếp (Chỉ hiện trên Mobile) */}
                            <div className="md:hidden">
                                <SortButtonGroup isMobile={true} />
                            </div>

                            {/* Nhóm 2 nút: Tìm kiếm khác & Xem danh sách */}
                            <div className="flex items-center gap-2 flex-1 md:flex-none justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate("/search")}
                                    className="hover:bg-gray/90 hover:text-primary text-xs md:text-sm h-9 md:h-10 px-4 whitespace-nowrap"
                                >
                                    <Search className="mr-2 h-3.5 w-3.5 md:h-4 md:w-4" /> 
                                    {t('results.btn_search_other', 'Tìm kiếm khác')}
                                </Button>

                                <Button
                                    size="sm"
                                    onClick={() => navigate("/cart")}
                                    className="bg-primary/90 hover:bg-primary text-xs md:text-sm h-9 md:h-10 px-4 whitespace-nowrap shadow-sm"
                                >
                                    {t('results.btn_view_list', 'Xem danh sách')}
                                </Button>
                            </div>
                        </div>
                        
                    </div>
                </div>

                {/* GRID RESULTS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                    {sortedRestaurants.map((restaurant) => (
                        <RestaurantCard
                            key={restaurant.id}
                            restaurant={restaurant}
                            onToggleFavorite={handleToggleFavorite}
                        />
                    ))}
                </div>

                {/* EMPTY STATE */}
                {restaurants.length === 0 && (
                    <div className="text-center py-16">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                            <Search className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-1">
                            {t('results.empty_title', 'Không tìm thấy kết quả')}
                        </h3>
                        <p className="text-muted-foreground max-w-xs mx-auto">
                            {t('results.empty_desc', 'Hãy thử thay đổi từ khóa hoặc bộ lọc tìm kiếm của bạn.')}
                        </p>
                        <Button variant="link" onClick={() => navigate("/search")} className="mt-4 text-primary">
                            {t('results.btn_back_search', 'Quay lại tìm kiếm')}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResultsPage;