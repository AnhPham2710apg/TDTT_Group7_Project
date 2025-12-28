// src/context/AuthContext.tsx
import { createContext, useContext } from 'react';

// 1. Định nghĩa kiểu dữ liệu
export interface AuthContextType {
  isLoggedIn: boolean;
  username: string | null;
  avatarUrl: string | null; // [NEW]
  isLoading: boolean;
  login: (username: string) => void;
  logout: () => void;
  updateUsername: (newUsername: string) => void;
  updateAvatar: (newAvatarUrl: string) => void; // [NEW]
}

// 2. Tạo Context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Tạo và export hook `useAuth`
// Tệp này không export component nào, nên ESLint sẽ hài lòng
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};