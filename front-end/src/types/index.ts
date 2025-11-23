// src/types/index.ts

export interface Restaurant {
  id: string;
  place_id: string;
  name: string;
  address: string;
  rating?: number;
  price_level?: number; // Sẽ được map từ minPrice/maxPrice ở backend
  photo_url?: string;
  lat: number;
  lng: number;
  is_favorite?: boolean;
  description?: string;
  phone_number?: string;
  website?: string;
  working_hour?: string; // Thêm mới
}

export interface SearchFilters {
  keyword?: string; // Mới
  foodType: string;
  beverageOrFood: string;
  cuisine: string[]; // Đổi thành mảng string
  flavor: string[]; 
  courseType: string;
  minPrice: number;
  maxPrice: number;
  radius: number;
  district: string[]; // Đổi thành mảng string
  ratingMin?: number; // Mới
  openNow?: boolean; // Mới
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
