// src/lib/api-config.ts

// Khi chạy local, nó sẽ dùng localhost.
// Khi deploy lên Vercel, nó sẽ dùng biến môi trường VITE_API_URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Hàm tiện ích để nối chuỗi cho gọn
export const getApiUrl = (endpoint: string) => `${API_BASE_URL}${endpoint}`;