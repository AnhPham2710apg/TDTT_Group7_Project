import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { UtensilsCrossed, Check, X } from "lucide-react"; // Thêm icon Check, X
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { API_BASE_URL } from "@/lib/api-config";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 1. Định nghĩa các tiêu chí kiểm tra mật khẩu
  const requirements = [
    { regex: /.{8,}/, text: "At least 8 characters" },
    { regex: /[0-9]/, text: "At least 1 number" },
    { regex: /[a-z]/, text: "At least 1 lowercase letter" },
    { regex: /[A-Z]/, text: "At least 1 uppercase letter" },
    { regex: /[!@#$%^&*]/, text: "At least 1 special char (!@#$%^&*)" },
  ];

  // 2. Tính toán độ mạnh mật khẩu dựa trên số tiêu chí đạt được
  const calculateStrength = (pwd: string) => {
    return requirements.filter((req) => req.regex.test(pwd)).length;
  };

  const strengthScore = calculateStrength(password);

  // 3. Hàm lấy màu sắc và text hiển thị dựa trên điểm số (0 - 5)
  const getStrengthStyles = (score: number) => {
    if (score === 0) return { color: "bg-gray-200", label: "", width: "0%" };
    if (score <= 2) return { color: "bg-red-500", label: "Weak", width: "33%" };
    if (score <= 4) return { color: "bg-yellow-500", label: "Medium", width: "66%" };
    return { color: "bg-green-500", label: "Strong", width: "100%" };
  };

  const strengthStyles = getStrengthStyles(strengthScore);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    // Kiểm tra xem đã đạt đủ 5 tiêu chí chưa
    if (strengthScore < 5) {
      toast.error("Please meet all password requirements before registering.");
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
        toast.error(data.message || "Register failed");
        return;
      }

      toast.success("Registration successful!");
      navigate("/login");
    } catch (error) {
      toast.error("Server error!");
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
            <h1 className="text-3xl font-bold">Create Account</h1>
            <p className="text-muted-foreground">
              Join us to discover amazing restaurants
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              
              {/* --- PHẦN UI MỚI: PASSWORD STRENGTH --- */}
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
                      Strength: <span className={`${strengthStyles.color.replace("bg-", "text-")} font-bold`}>{strengthStyles.label}</span>
                    </span>
                  </div>

                  {/* Danh sách yêu cầu chi tiết - UPDATED UI */}
                  <div className="space-y-0"> {/* Bỏ gap để animation mượt hơn */}
                    {requirements.map((req, index) => {
                      const isMet = req.regex.test(password);
                      
                      return (
                        <div
                          key={index}
                          // KỸ THUẬT: Dùng Grid để animate chiều cao (height) mượt mà
                          className={`
                            grid transition-all ease-in-out
                            ${isMet 
                               ? "grid-rows-[0fr] opacity-0 duration-700" // Khi ĐẠT: Thu gọn chiều cao về 0 & Mờ dần (Chậm)
                               : "grid-rows-[1fr] opacity-100 duration-300" // Khi CHƯA ĐẠT: Mở rộng chiều cao & Hiện rõ (Nhanh)
                            }
                          `}
                        >
                          {/* Inner container phải có overflow-hidden để nội dung bị cắt khi thu gọn */}
                          <div className="overflow-hidden">
                            <div className="flex items-center text-xs text-muted-foreground py-1">
                                {/* Icon cảnh báo hoặc chấm tròn */}
                                <div className={`
                                    h-1.5 w-1.5 rounded-full mr-2 flex-shrink-0 transition-colors duration-300
                                    ${isMet ? "bg-green-500" : "bg-red-400"} 
                                `} />
                                
                                {/* Nội dung text */}
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
              {/* --- KẾT THÚC PHẦN UI MỚI --- */}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {confirmPassword && password !== confirmPassword && (
                 <p className="text-xs text-red-500 flex items-center mt-1">
                    <X className="h-3 w-3 mr-1" /> Passwords do not match
                 </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-hero-gradient hover:opacity-90"
              disabled={isLoading || strengthScore < 5} // Disable nút nếu chưa đủ mạnh
            >
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Login
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;