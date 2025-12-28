// src/context/AuthProvider.tsx
import { useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // [NEW]
import { API_BASE_URL } from '@/lib/api-config'; // [NEW]
import { AuthContext, AuthContextType } from './AuthContext';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null); // [NEW]
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const storedUsername = localStorage.getItem('username');
      if (storedUsername) {
        setIsLoggedIn(true);
        setUsername(storedUsername);
        // [NEW] Fetch Avatar
        axios.get(`${API_BASE_URL}/api/profile/${storedUsername}`)
          .then(res => {
            if (res.data.avatar) setAvatarUrl(res.data.avatar);
          })
          .catch(err => console.error("Auto-fetch avatar failed", err));
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
    // [NEW] Fetch Avatar on login
    axios.get(`${API_BASE_URL}/api/profile/${newUsername}`)
      .then(res => {
        if (res.data.avatar) setAvatarUrl(res.data.avatar);
      })
      .catch(err => console.error("Login fetch avatar failed", err));
    navigate('/'); // Tự động điều hướng
  };

  // Hàm Logout (được gọi từ Navbar)
  const logout = () => {
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setUsername(null);
    setAvatarUrl(null); // [NEW]
    navigate('/'); // Tự động điều hướng
  };

  const updateUsername = (newUsername: string) => {
    // 1. Cập nhật localStorage
    localStorage.setItem('username', newUsername);
    // 2. Cập nhật state nội bộ
    setUsername(newUsername);
    // (Không cần navigate, vì người dùng vẫn đang ở trang Profile)
  };

  const updateAvatar = (newAvatarUrl: string) => {
    setAvatarUrl(newAvatarUrl);
  };

  const value: AuthContextType = { isLoggedIn, username, avatarUrl, isLoading, login, logout, updateUsername, updateAvatar };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};