import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import file json
import vi from './locales/vi.json';
import en from './locales/en.json';

// Định nghĩa resources
const resources = {
  en: {
    translation: en
  },
  vi: {
    translation: vi
  }
};

i18n
  .use(initReactI18next) // Kết nối với React
  .init({
    resources,
    // 1. Ưu tiên lấy ngôn ngữ từ localStorage trước
    // 2. Nếu không có thì mặc định là 'vi'
    lng: localStorage.getItem('i18nextLng') || 'vi', 
    
    fallbackLng: 'vi', // Ngôn ngữ dự phòng nếu file dịch bị lỗi
    
    interpolation: {
      escapeValue: false // React đã tự xử lý XSS nên không cần escape
    },
    
    // (Tùy chọn) Tắt log debug cho gọn console khi chạy thật
    debug: false 
  });

export default i18n;