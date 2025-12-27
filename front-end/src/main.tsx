import React from 'react';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Import file cấu hình i18n để nó chạy ngay khi app khởi động
import './i18n'; 

// (Tùy chọn) Xóa dòng console log nếu không cần thiết
// import { API_BASE_URL } from "@/lib/api-config";
// console.log(">>> URL BACKEND HIỆN TẠI:", API_BASE_URL);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);