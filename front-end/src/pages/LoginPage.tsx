import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { UtensilsCrossed, Loader2 } from "lucide-react"; // Thêm Loader2
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";

const LoginPage = () => {
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
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // 1. Sửa: Backend trả về 'data.error' (không phải 'data.message')
        toast.error(data.error || "Login failed");
        return;
      }

      // 3. THAY ĐỔI LỚN: Gọi hàm 'login' từ Context
      // Nó sẽ tự set localStorage, cập nhật state, và điều hướng
      login(data.user.username);
      
      toast.success("Login successful!");
      // Không cần 'navigate("/")' ở đây nữa
      
    } catch (e) {
      toast.error("Server error or connection failed");
    } finally {
      setIsLoading(false);
    }
  };
  // === KẾT THÚC THAY ĐỔI LOGIC ===

  return (
    // Thay đổi class ở đây để thêm gradient pastel
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-emerald-50">
      <Navbar hideAuthButtons /> {/* Thêm prop hideAuthButtons */}
      <div className="flex items-center justify-center px-4 py-12"> {/* Thêm py-12 */}
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-lg bg-hero-gradient mb-2">
              <UtensilsCrossed className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold">Welcome Back</h1>
            <p className="text-muted-foreground">
              Login to continue your food tour adventure
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
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
                placeholder="Enter your password"
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
              {/* 4. Thêm icon loading cho nút */}
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;