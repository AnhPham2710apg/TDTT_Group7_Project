import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { UtensilsCrossed, Loader2, X } from "lucide-react"; // Import đủ icon cần thiết
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { API_BASE_URL } from "@/lib/api-config";
// 1. Import hook
import { useTranslation } from 'react-i18next';

const RegisterPage = () => {
  // 2. Khởi tạo hook
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const checkPasswordStrength = (pwd: string) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    return passwordRegex.test(pwd);
  };

  const handleConfirmPasswordFocus = () => {
    if (!checkPasswordStrength(password)) {
      toast.error(
        "Please create a strong password first! (At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)"
      );
      passwordInputRef.current?.focus();
    }
  };

  // --- LOGIC CHECK MẬT KHẨU (Từ bản mới, nhưng text dùng t()) ---
  const requirements = [
    { regex: /.{8,}/, text: t('register.req_length', "Ít nhất 8 ký tự") },
    { regex: /[0-9]/, text: t('register.req_number', "Ít nhất 1 số") },
    { regex: /[a-z]/, text: t('register.req_lowercase', "Ít nhất 1 chữ thường") },
    { regex: /[A-Z]/, text: t('register.req_uppercase', "Ít nhất 1 chữ hoa") },
    { regex: /[!@#$%^&*]/, text: t('register.req_special', "Ít nhất 1 ký tự đặc biệt (!@#$%^&*)") },
  ];

  const calculateStrength = (pwd: string) => {
    return requirements.filter((req) => req.regex.test(pwd)).length;
  };

  const strengthScore = calculateStrength(password);

  const getStrengthStyles = (score: number) => {
    if (score === 0) return { color: "bg-gray-200", label: "", width: "0%" };
    if (score <= 2) return { color: "bg-red-500", label: t('register.weak', "Yếu"), width: "33%" };
    if (score <= 4) return { color: "bg-yellow-500", label: t('register.medium', "Trung bình"), width: "66%" };
    return { color: "bg-green-500", label: t('register.strong', "Mạnh"), width: "100%" };
  };

  const strengthStyles = getStrengthStyles(strengthScore);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t('register.password_mismatch', "Mật khẩu không khớp!"));
      return;
    }

    // Check độ mạnh mật khẩu trước khi gửi
    if (strengthScore < 5) {
      toast.error(t('register.password_weak_msg', "Vui lòng đáp ứng đủ các tiêu chí mật khẩu."));
      return;
    }

    if (!checkPasswordStrength(password)) {
      toast.error(
        "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character (!@#$%^&*)."
      );
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || t('register.fail', "Đăng ký thất bại"));
        return;
      }

      toast.success(t('register.success', "Đăng ký thành công!"));
      navigate("/login");
    } catch (error) {
      toast.error(t('common.server_error', "Lỗi máy chủ!"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-emerald-50">
      <Navbar hideAuthButtons /> 
      <div className="flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-lg bg-hero-gradient mb-2">
              <UtensilsCrossed className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold">
              {t('register.title', 'Tạo tài khoản')}
            </h1>
            <p className="text-muted-foreground">
              {t('register.subtitle', 'Tham gia ngay để khám phá những quán ăn tuyệt vời')}
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">
                {t('register.username_label', 'Tên đăng nhập')}
              </Label>
              <Input
                id="username"
                type="text"
                placeholder={t('register.username_placeholder', 'Chọn tên đăng nhập')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {t('register.password_label', 'Mật khẩu')}
              </Label>
              <Input
                ref={passwordInputRef}
                id="password"
                type="password"
                placeholder={t('register.password_placeholder', 'Tạo mật khẩu')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              
              {/* --- UI CHECK ĐỘ MẠNH MẬT KHẨU --- */}
              {password && (
                <div className="space-y-3 pt-2">
                  {/* Thanh Progress Bar */}
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ease-out ${strengthStyles.color}`}
                      style={{ width: strengthStyles.width }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t('register.strength', 'Độ mạnh')}: <span className={`${strengthStyles.color.replace("bg-", "text-")} font-bold`}>{strengthStyles.label}</span>
                    </span>
                  </div>

                  {/* Danh sách yêu cầu chi tiết */}
                  <div className="space-y-0">
                    {requirements.map((req, index) => {
                      const isMet = req.regex.test(password);
                      
                      return (
                        <div
                          key={index}
                          className={`
                            grid transition-all ease-in-out
                            ${isMet 
                               ? "grid-rows-[0fr] opacity-0 duration-700" // Ẩn đi khi đạt
                               : "grid-rows-[1fr] opacity-100 duration-300" // Hiện khi chưa đạt
                            }
                          `}
                        >
                          <div className="overflow-hidden">
                            <div className="flex items-center text-xs text-muted-foreground py-1">
                                <div className={`
                                    h-1.5 w-1.5 rounded-full mr-2 flex-shrink-0 transition-colors duration-300
                                    ${isMet ? "bg-green-500" : "bg-red-400"} 
                                `} />
                                <span className={isMet ? "line-through text-green-600/50" : ""}>
                                    {req.text}
                                </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {t('register.confirm_password_label', 'Xác nhận mật khẩu')}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t('register.confirm_password_placeholder', 'Nhập lại mật khẩu')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={handleConfirmPasswordFocus}
                required
              />
              {/* UI báo lỗi ngay lập tức nếu không khớp */}
              {confirmPassword && password !== confirmPassword && (
                 <p className="text-xs text-red-500 flex items-center mt-1">
                    <X className="h-3 w-3 mr-1" /> {t('register.password_mismatch', "Mật khẩu không khớp")}
                 </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-hero-gradient hover:opacity-90"
              // Disable nếu đang load HOẶC mật khẩu chưa đủ mạnh
              disabled={isLoading || strengthScore < 5}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('register.creating', 'Đang tạo tài khoản...')}
                </>
              ) : (
                t('register.submit', 'Đăng ký')
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {t('register.have_account', 'Đã có tài khoản?')}{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              {t('register.login_link', 'Đăng nhập')}
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;