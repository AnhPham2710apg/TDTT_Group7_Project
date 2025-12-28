// src/types/index.ts

export interface Restaurant {
    match_score: number;
    id: string;
    place_id: string;
    name: string;
    address: string;
    rating?: number;
    price_level?: string; // Map từ cột range trong DB
    photo_url?: string;
    lat: number;
    lng: number;
    is_favorite?: boolean;
    description?: string;
    phone_number?: string;
    website?: string;
    working_hour?: string;

    subtypes?: string;       // Ví dụ: "Quán nhậu, Rooftop"

    // --- CÁC TRƯỜNG ĐỒNG BỘ VỚI MODELS.PY MỚI ---
    cuisine?: string;        // Ví dụ: "Món Việt"
    food_type?: string;      // Ví dụ: "mặn" (map từ foodType)
    bev_food?: string;       // Mới: "nước", "khô" (map từ bevFood)
    course_type?: string;    // Mới: "món chính" (map từ courseType)
    flavor?: string;         // Mới: "chua, cay" (map từ flavor)
    min_price?: number;      // Mới: Giá thấp nhất
    max_price?: number;      // Mới: Giá cao nhất

    // Đã xóa ai_vibe để tránh lỗi
}

export interface SearchFilters {
    keyword?: string;
    foodType: string;
    beverageOrFood: string;
    cuisine: string[];
    flavor: string[];
    courseType: string;
    minPrice: number;
    maxPrice: number;
    radius: number;
    district: string[];
    ratingMin?: number;
    openNow?: boolean;
}

export interface User {
    id: string;
    username: string;
    token: string;
}

export interface OptimizedRoute {
    order: string[];
    total_distance: number;
    total_duration: number;
    polyline: string;
}