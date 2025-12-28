// src/pages/LoginPage.tsx

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { UtensilsCrossed, Loader2 } from "lucide-react"; 
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/api-config";
// 1. Import hook
import { useTranslation } from 'react-i18next';

const LoginPage = () => {
  // 2. Khởi tạo hook
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  // === BẮT ĐẦU THAY ĐỔI LOGIC ===
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Backend trả về lỗi thì ưu tiên hiện lỗi đó, nếu không thì hiện text mặc định đã dịch
        toast.error(data.error || t('login.toast_fail', "Đăng nhập thất bại"));
        return;
      }

      // Gọi hàm 'login' từ Context
      login(data.user.username);
      
      toast.success(t('login.toast_success', "Đăng nhập thành công!"));
      
    } catch (e) {
      toast.error(t('common.server_error', "Lỗi máy chủ hoặc kết nối thất bại"));
    } finally {
      setIsLoading(false);
    }
  };
  // === KẾT THÚC THAY ĐỔI LOGIC ===

  return (
    // Thay đổi class ở đây để thêm gradient pastel
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-emerald-50">
      <Navbar hideAuthButtons /> 
      <div className="flex items-center justify-center px-4 py-12"> 
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-lg bg-hero-gradient mb-2">
              <UtensilsCrossed className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold">
              {t('login.title', 'Chào mừng trở lại')}
            </h1>
            <p className="text-muted-foreground">
              {t('login.subtitle', 'Đăng nhập để tiếp tục hành trình khám phá ẩm thực')}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">
                {t('login.username_label', 'Tên đăng nhập')}
              </Label>
              <Input
                id="username"
                type="text"
                placeholder={t('login.username_placeholder', 'Nhập tên đăng nhập')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {t('login.password_label', 'Mật khẩu')}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={t('login.password_placeholder', 'Nhập mật khẩu')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-hero-gradient hover:opacity-90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('login.logging_in', 'Đang đăng nhập...')}
                </>
              ) : (
                t('login.login_button', 'Đăng nhập')
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {t('login.no_account', 'Chưa có tài khoản?')}{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">
              {t('login.sign_up', 'Đăng ký ngay')}
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;