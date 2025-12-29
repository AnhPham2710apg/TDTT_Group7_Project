// src/types/index.ts

export interface Restaurant {
    match_score: number;
    id: string;
    place_id: string;
    name: string;
    address: string;
    rating?: number;
    price_level?: string;
    photo_url?: string;
    lat: number;
    lng: number;
    is_favorite?: boolean;
    description?: string;
    phone_number?: string;
    website?: string;
    working_hour?: string;

    // --- [FIX] Thêm trường này để hết lỗi trong RestaurantCard ---
    is_open?: boolean;   // API có thể trả về true/false hoặc không trả về (undefined)

    subtypes?: string;

    // --- CÁC TRƯỜNG ĐỒNG BỘ VỚI MODELS.PY MỚI ---
    cuisine?: string;
    food_type?: string;
    bev_food?: string;
    course_type?: string;
    flavor?: string;
    min_price?: number;
    max_price?: number;
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