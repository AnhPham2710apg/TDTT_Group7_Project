// src/pages/NotFound.tsx

import { useLocation } from "react-router-dom";
import { useEffect } from "react";
// 1. Import hook
import { useTranslation } from 'react-i18next';

const NotFound = () => {
  // 2. Khởi tạo hook
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">
          {t('not_found.message', 'Rất tiếc! Không tìm thấy trang này')}
        </p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          {t('not_found.return_home', 'Trở về Trang chủ')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;