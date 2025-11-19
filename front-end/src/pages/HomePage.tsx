// src/pages/HomePage.tsx
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Heart, Route, Star, Camera, MonitorPlay } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion"; 

const HomePage = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  // === 2. ĐỊNH NGHĨA CÁC HIỆU ỨNG (VARIANTS) ===

  // Hiệu ứng chung: Fade-in và trượt lên (dùng cho tiêu đề, văn bản)
  const fadeUp = {
    initial: { opacity: 0, y: 60 },
    whileInView: { opacity: 1, y: 0 },
    // Thêm 'as const' để TypeScript hiểu 'easeOut' là 1 giá trị cụ thể
    transition: { duration: 0.8, ease: "easeOut" as const }, 
    viewport: { once: true },
  };

  // Hiệu ứng "Stagger": Dùng cho các container chứa nhiều item (như grid)
  const staggerContainer = {
    whileInView: {
      transition: {
        staggerChildren: 0.2,
      },
    },
    viewport: { once: true },
  };

  // Hiệu ứng cho từng item con trong "Stagger"
  const staggerItem = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" as const }, // <-- SỬA LỖI
  };

  // Hiệu ứng trượt từ trái
  const slideInLeft = {
    initial: { opacity: 0, x: -50 },
    whileInView: { opacity: 1, x: 0 },
    transition: { duration: 0.7, ease: "easeOut" as const }, // <-- SỬA LỖI
    viewport: { once: true },
  };

  // Hiệu ứng trượt từ phải
  const slideInRight = {
    initial: { opacity: 0, x: 50 },
    whileInView: { opacity: 1, x: 0 },
    transition: { duration: 0.7, ease: "easeOut" as const }, // <-- SỬA LỖI
    viewport: { once: true },
  };
  
  // Hiệu ứng scale-in
  const scaleIn = {
    initial: { opacity: 0, scale: 0.9 },
    whileInView: { opacity: 1, scale: 1 },
    transition: { duration: 0.5, ease: "easeOut" as const }, // <-- SỬA LỖI
    viewport: { once: true },
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <motion.section 
        className="relative overflow-hidden py-20 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 bg-hero-gradient opacity-5"></div>
        <div className="container mx-auto text-center relative z-10">
          
          {/* Giờ đây các lỗi 'báo đỏ' sẽ biến mất */}
          <motion.h1 
            className="text-5xl md:text-6xl font-bold mb-6"
            {...fadeUp}
          >
            Discover Your Perfect
            <span className="block bg-hero-gradient bg-clip-text text-transparent">
              Food Tour
            </span>
          </motion.h1>
          
          <motion.p 
            className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.2 }} // Sẽ không còn lỗi
          >
            Find the best restaurants based on your preferences, budget, and location. 
            Get personalized recommendations and optimized routes for your culinary adventure.
          </motion.p>
          
          <motion.div 
            className="flex gap-4 justify-center"
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.4 }}
          >
            <Button
              size="lg"
              className="bg-hero-gradient hover:opacity-90 text-lg px-8"
              onClick={() => navigate("/search")}
            >
              Start Exploring
            </Button>
            {!isLoggedIn && (
              <Button size="lg" variant="outline" className="text-lg px-8" onClick={() => navigate("/login")}>
                Login
              </Button>
            )}
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <motion.h2 
            className="text-3xl font-bold text-center mb-12"
            {...fadeUp}
          >
            Why Choose Food Tour Assistant?
          </motion.h2>
          
          <motion.div 
            className="grid md:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            <motion.div className="text-center space-y-4" variants={staggerItem}>
              <div className="inline-flex p-4 rounded-full bg-primary/10">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Smart Recommendations</h3>
              <p className="text-muted-foreground">
                Get personalized restaurant suggestions based on your taste preferences...
              </p>
            </motion.div>

            <motion.div className="text-center space-y-4" variants={staggerItem}>
              <div className="inline-flex p-4 rounded-full bg-accent/10">
                <Heart className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold">Save Favorites</h3>
              <p className="text-muted-foreground">
                Keep track of your favorite restaurants and build your personal...
              </p>
            </motion.div>

            <motion.div className="text-center space-y-4" variants={staggerItem}>
              <div className="inline-flex p-4 rounded-full bg-secondary/10">
                <Route className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold">Optimized Routes</h3>
              <p className="text-muted-foreground">
                Plan your food tour with optimized routes that save time...
              </p>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Food Gallery Section */}
      <motion.section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.h2 
            className="text-3xl font-bold text-center mb-12"
            {...fadeUp}
          >
            Trải nghiệm ẩm thực
            <span className="block bg-hero-gradient bg-clip-text text-transparent">
              Đa dạng & Phong phú
            </span>
          </motion.h2>
          
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            <motion.div className="h-64 rounded-lg overflow-hidden group" variants={staggerItem}>
              <div className="w-full h-full bg-muted/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <Camera className="h-12 w-12 text-muted-foreground/30" />
              </div>
            </motion.div>
            <motion.div className="h-64 rounded-lg overflow-hidden group col-span-2" variants={staggerItem}>
              <div className="w-full h-full bg-muted/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <Camera className="h-12 w-12 text-muted-foreground/30" />
              </div>
            </motion.div>
            <motion.div className="h-64 rounded-lg overflow-hidden group" variants={staggerItem}>
              <div className="w-full h-full bg-muted/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <Camera className="h-12 w-12 text-muted-foreground/30" />
              </div>
            </motion.div>
             <motion.div className="h-64 rounded-lg overflow-hidden group col-span-2" variants={staggerItem}>
               <div className="w-full h-full bg-muted/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                 <Camera className="h-12 w-12 text-muted-foreground/30" />
               </div>
             </motion.div>
             <motion.div className="h-64 rounded-lg overflow-hidden group" variants={staggerItem}>
               <div className="w-full h-full bg-muted/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                 <Camera className="h-12 w-12 text-muted-foreground/30" />
               </div>
             </motion.div>
             <motion.div className="h-64 rounded-lg overflow-hidden group" variants={staggerItem}>
               <div className="w-full h-full bg-muted/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                 <Camera className="h-12 w-12 text-muted-foreground/30" />
               </div>
             </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* How it works Section */}
      <motion.section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <motion.h2 
            className="text-3xl font-bold text-center mb-12"
            {...fadeUp}
          >
            Hoạt động như thế nào?
          </motion.h2>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            <motion.div 
              className="space-y-6"
              variants={staggerContainer}
              initial="initial"
              whileInView="whileInView"
              viewport={{ once: true }}
            >
              <motion.div className="flex gap-4" variants={slideInLeft}>
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-hero-gradient text-white flex items-center justify-center font-bold text-lg">1</div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Tìm kiếm thông minh</h3>
                  <p className="text-muted-foreground">
                    Sử dụng bộ lọc chi tiết để tìm nhà hàng...
                  </p>
                </div>
              </motion.div>
              <motion.div className="flex gap-4" variants={slideInLeft}>
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-hero-gradient text-white flex items-center justify-center font-bold text-lg">2</div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Chọn và Lưu</h3>
                  <p className="text-muted-foreground">
                    Chọn các nhà hàng bạn yêu thích...
                  </p>
                </div>
              </motion.div>
              <motion.div className="flex gap-4" variants={slideInLeft}>
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-hero-gradient text-white flex items-center justify-center font-bold text-lg">3</div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Tối ưu hóa Lộ trình</h3>
                  <p className="text-muted-foreground">
                    Nhập điểm xuất phát của bạn và để chúng tôi tạo ra...
                  </p>
                </div>
              </motion.div>
            </motion.div>

            <motion.div 
              className="rounded-lg bg-muted h-80 flex items-center justify-center text-center text-muted-foreground overflow-hidden"
              {...slideInRight}
            >
              <div className="text-center">
                <MonitorPlay className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Placeholder cho Video Hướng dẫn / Demo Sản phẩm</p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section className="py-16 px-4">
        <div className="container mx-auto text-center">
          <motion.div 
            className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 rounded-2xl p-12"
            {...scaleIn}
          >
            {/* === BẮT ĐẦU THAY ĐỔI === */}
            {/* 1. Tạo một flex container để căn giữa nhóm sao */}
            <div className="flex justify-center gap-2 mb-4">
              {/* 2. Lặp lại component Star (ví dụ: 5 sao) */}
              {/* Bạn có thể đổi kích thước 'h-12 w-12' thành 'h-8 w-8' nếu thấy to quá */}
              <Star className="h-10 w-10 text-primary mt-3" />
              <Star className="h-11 w-11 text-primary mt-2" />
              <Star className="h-12 w-12 text-primary mt-1" />
              <Star className="h-11 w-11 text-primary mt-2" />
              <Star className="h-10 w-10 text-primary mt-3" />
            </div>
            {/* === KẾT THÚC THAY ĐỔI === */}
            <h2 className="text-3xl font-bold mb-4">Ready to Start Your Food Journey?</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Join thousands of food lovers discovering amazing restaurants and 
              creating unforgettable culinary experiences.
            </p>
            
            {!isLoggedIn && (
              <Button size="lg" className="bg-hero-gradient hover:opacity-90" onClick={() => navigate("/register")}>
                Sign Up Free
              </Button>
            )}
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
};

export default HomePage;