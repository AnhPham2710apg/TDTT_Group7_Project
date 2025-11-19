export interface Restaurant {
  id: string;
  place_id: string;
  name: string;
  address: string;
  rating?: number;
  price_level?: number;
  photo_url?: string;
  lat: number;
  lng: number;
  is_favorite?: boolean;
  description?: string;
  phone_number?: string;
  website?: string;
}

export interface SearchFilters {
  foodType: string; // chay / mặn / cả 2
  beverageOrFood: string; // nước / khô / cả 2
  cuisine: string; // Việt / Hàn / Nhật / Thái / Ý / Pháp / etc
  flavor: string[]; // ngọt / mặn / cay / chua / đắng
  courseType: string; // tráng miệng / món chính / cả 2
  minPrice: number;
  maxPrice: number;
  radius: number; // km
  district: string;
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
