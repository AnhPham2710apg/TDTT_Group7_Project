// src/context/AuthProvider.tsx
import { useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, AuthContextType } from './AuthContext';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const storedUsername = localStorage.getItem('username');
      if (storedUsername) {
        setIsLoggedIn(true);
        setUsername(storedUsername);
      }
    } catch (e) {
      console.error("Lỗi khi đọc auth state", e);
      // Đảm bảo logout nếu có lỗi
      localStorage.removeItem('username');
      setIsLoggedIn(false);
      setUsername(null);
    } finally {
      // 2. Bất kể thành công hay thất bại, set loading thành false
      setIsLoading(false);
    }
  }, []); // Chỉ chạy 1 lần

  // Hàm Login (được gọi từ LoginPage)
  const login = (newUsername: string) => {
    localStorage.setItem('username', newUsername);
    setIsLoggedIn(true);
    setUsername(newUsername);
    navigate('/'); // Tự động điều hướng
  };

  // Hàm Logout (được gọi từ Navbar)
  const logout = () => {
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setUsername(null);
    navigate('/'); // Tự động điều hướng
  };

  const updateUsername = (newUsername: string) => {
    // 1. Cập nhật localStorage
    localStorage.setItem('username', newUsername);
    // 2. Cập nhật state nội bộ
    setUsername(newUsername);
    // (Không cần navigate, vì người dùng vẫn đang ở trang Profile)
  };

  const value: AuthContextType = { isLoggedIn, username, isLoading, login, logout, updateUsername };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};