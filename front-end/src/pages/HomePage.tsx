// src/pages/HomePage.tsx
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Heart, Route, Star, Camera, MonitorPlay, Play } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion"; 
import { useState, useRef, useEffect } from "react";

// --- 1. ĐỊNH NGHĨA DỮ LIỆU FEATURE (Để dùng chung) ---
const featuresData = [
  {
    id: 1,
    title: "Smart Recommendations",
    desc: "Get personalized restaurant suggestions based on your taste.",
    icon: MapPin,
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
  },
  {
    id: 2,
    title: "Save Favorites",
    desc: "Keep track of your favorite spots effortlessly.",
    icon: Heart,
    colorClass: "text-accent",
    bgClass: "bg-accent/10",
  },
  {
    id: 3,
    title: "Optimized Routes",
    desc: "Plan your food tour with smart routing to save time.",
    icon: Route,
    colorClass: "text-secondary",
    bgClass: "bg-secondary/10",
  },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  // State để theo dõi slide hiện tại trên Mobile
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Hàm xử lý sự kiện cuộn để cập nhật chấm tròn (Dots)
  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft;
      const width = scrollRef.current.offsetWidth;
      const index = Math.round(scrollLeft / width);
      setActiveSlide(index);
    }
  };

  // === CẤU HÌNH HIỆU ỨNG ===
  const fadeUp = {
    initial: { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" as const }, 
    viewport: { once: true, margin: "-50px" },
  };

  const staggerContainer = {
    whileInView: {
      transition: { staggerChildren: 0.15 },
    },
    viewport: { once: true, margin: "-50px" },
  };

  const staggerItem = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: "easeOut" as const },
  };

  const slideInLeft = {
    initial: { opacity: 0, x: -30 },
    whileInView: { opacity: 1, x: 0 },
    transition: { duration: 0.6, ease: "easeOut" as const },
    viewport: { once: true },
  };

  const slideInRight = {
    initial: { opacity: 0, x: 30 },
    whileInView: { opacity: 1, x: 0 },
    transition: { duration: 0.6, ease: "easeOut" as const },
    viewport: { once: true },
  };
  
  const scaleIn = {
    initial: { opacity: 0, scale: 0.95 },
    whileInView: { opacity: 1, scale: 1 },
    transition: { duration: 0.5, ease: "easeOut" as const },
    viewport: { once: true },
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      
      {/* 1. NAVBAR STICKY: Ghim lên đầu trang + Hiệu ứng mờ nền */}
      <div className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/40">
        <Navbar />
      </div>
      
      {/* Hero Section */}
      <motion.section 
        className="relative overflow-hidden py-16 md:py-24 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 bg-hero-gradient opacity-5"></div>
        <div className="container mx-auto text-center relative z-10">
          <motion.h1 
            className="text-4xl md:text-6xl font-bold mb-4 md:mb-6 leading-tight"
            {...fadeUp}
          >
            Discover Your Perfect
            <span className="block mt-2 bg-hero-gradient bg-clip-text text-transparent pb-1">
              Food Tour
            </span>
          </motion.h1>
          
          <motion.p 
            className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto px-2"
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.1 }}
          >
            Find the best restaurants based on your preferences. 
            Get personalized recommendations for your culinary adventure.
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row gap-3 justify-center items-center"
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.2 }}
          >
            <Button
              size="lg"
              className="w-full sm:w-auto bg-hero-gradient hover:opacity-90 text-lg px-8 h-12 rounded-full shadow-lg hover:shadow-xl transition-all"
              onClick={() => navigate("/search")}
            >
              Start Exploring
            </Button>
            {!isLoggedIn && (
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full sm:w-auto text-lg px-8 h-12 rounded-full border-2" 
                onClick={() => navigate("/login")}
              >
                Login
              </Button>
            )}
          </motion.div>
        </div>
      </motion.section>

      {/* === FEATURES SECTION ĐÃ CHỈNH SỬA === */}
      <motion.section className="py-12 md:py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <motion.h2 
            className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12"
            {...fadeUp}
          >
            Why Choose Food Tour Assistant?
          </motion.h2>
          
          {/* --- GIAO DIỆN MOBILE: CAROUSEL / SLIDER --- */}
          <div className="md:hidden relative">
            {/* Container cuộn ngang */}
            <div 
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-4 pb-4"
              style={{ scrollBehavior: "smooth" }}
            >
              {featuresData.map((feature, index) => (
                <div 
                  key={feature.id} 
                  className="min-w-full snap-center flex flex-col"
                >
                  {/* Card UI giống hình tham khảo */}
                  <div className="bg-background border border-border/50 p-8 rounded-3xl shadow-sm text-center flex flex-col items-center justify-center h-full mx-2">
                    <div className={`inline-flex p-4 rounded-full ${feature.bgClass} mb-4`}>
                      <feature.icon className={`h-8 w-8 ${feature.colorClass}`} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Dots (Chấm tròn điều hướng) */}
            <div className="flex justify-center gap-2 mt-4">
              {featuresData.map((_, index) => (
                <div 
                  key={index}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    activeSlide === index 
                      ? "w-6 bg-primary"  // Active: Dài ra và màu đậm
                      : "w-2 bg-primary/20" // Inactive: Tròn nhỏ và màu nhạt
                  }`}
                />
              ))}
            </div>
          </div>

          {/* --- GIAO DIỆN PC: GRID (GIỮ NGUYÊN) --- */}
          <motion.div 
            className="hidden md:grid md:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            {featuresData.map((feature) => (
              <motion.div 
                key={feature.id}
                className="bg-background p-6 rounded-2xl shadow-sm border text-center space-y-3" 
                variants={staggerItem}
              >
                <div className={`inline-flex p-3 rounded-full ${feature.bgClass} mb-2`}>
                  <feature.icon className={`h-6 w-6 ${feature.colorClass}`} />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>

        </div>
      </motion.section>

      {/* 2. GRID GALLERY SECTION: Fix lại layout PC theo yêu cầu */}
      <motion.section className="py-12 px-4">
        <div className="container mx-auto">
          <motion.h2 
            className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-10 leading-snug"
            {...fadeUp}
          >
            Trải nghiệm ẩm thực
            <span className="block bg-hero-gradient bg-clip-text text-transparent font-extrabold mt-1">
              Đa dạng & Phong phú
            </span>
          </motion.h2>
          
          {/* Grid Layout Logic:
              - Mobile: grid-cols-2 (để vẫn đẹp trên đt)
              - PC (md): grid-cols-4
              - Row height: min 180px
          */}
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[120px] md:auto-rows-[180px]"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            {/* ITEM 1: Big Square (Góc trái trên) - Chiếm 2x2 */}
            <motion.div 
              className="col-span-2 row-span-2 rounded-xl overflow-hidden group relative bg-muted/50" 
              variants={staggerItem}
            >
               <div className="w-full h-full bg-muted/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                 <Camera className="h-12 w-12 text-muted-foreground/30" />
               </div>
            </motion.div>

            {/* ITEM 2: Tall Rectangle (Giữa) - Chiếm 1x2 */}
            <motion.div 
              className="col-span-1 md:col-span-1 row-span-2 rounded-xl overflow-hidden group relative bg-muted/50" 
              variants={staggerItem}
            >
              <div className="w-full h-full bg-muted/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                 <Camera className="h-8 w-8 text-muted-foreground/30" />
               </div>
            </motion.div>

            {/* ITEM 3: Small Square (Góc phải trên) - Chiếm 1x1 */}
            <motion.div 
              className="col-span-1 row-span-1 rounded-xl overflow-hidden group relative bg-muted/50" 
              variants={staggerItem}
            >
              <div className="w-full h-full bg-muted/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                 <Camera className="h-6 w-6 text-muted-foreground/30" />
               </div>
            </motion.div>
            
            {/* ITEM 4: Small Square (Góc phải dưới) - Chiếm 1x1 */}
             <motion.div 
               className="col-span-1 row-span-1 rounded-xl overflow-hidden group relative bg-muted/50" 
               variants={staggerItem}
             >
              <div className="w-full h-full bg-muted/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                 <Camera className="h-6 w-6 text-muted-foreground/30" />
               </div>
            </motion.div>

            {/* ITEM 5: Wide Rectangle (Dưới cùng bên trái) - Chiếm 2x1 
                Nằm dưới Item 1
            */}
            <motion.div 
              className="col-span-2 row-span-1 rounded-xl overflow-hidden group relative bg-muted/50" 
              variants={staggerItem}
            >
               <div className="w-full h-full bg-muted/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                 <Camera className="h-8 w-8 text-muted-foreground/30" />
               </div>
            </motion.div>

            {/* ITEM 6: Small Square (Góc trái dưới) - Chiếm 1x1 */}
             <motion.div 
               className="col-span-1 row-span-1 rounded-xl overflow-hidden group relative bg-muted/50" 
               variants={staggerItem}
             >
              <div className="w-full h-full bg-muted/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                 <Camera className="h-6 w-6 text-muted-foreground/30" />
               </div>
            </motion.div>
            
            {/* ITEM 7: Small Square (Góc phải dưới) - Chiếm 1x1 */}
             <motion.div 
               className="col-span-1 row-span-1 rounded-xl overflow-hidden group relative bg-muted/50" 
               variants={staggerItem}
             >
              <div className="w-full h-full bg-muted/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                 <Camera className="h-6 w-6 text-muted-foreground/30" />
               </div>
            </motion.div>

          </motion.div>
        </div>
      </motion.section>

      {/* How it works & Video Section */}
      <motion.section className="py-12 md:py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <motion.h2 
            className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12"
            {...fadeUp}
          >
            Hoạt động như thế nào?
          </motion.h2>

          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Steps */}
            <motion.div 
              className="space-y-6 md:space-y-8 order-2 lg:order-1"
              variants={staggerContainer}
              initial="initial"
              whileInView="whileInView"
              viewport={{ once: true }}
            >
              {[
                { id: 1, title: "Tìm kiếm thông minh", desc: "Sử dụng bộ lọc chi tiết để tìm nhà hàng phù hợp." },
                { id: 2, title: "Chọn và Lưu", desc: "Lưu lại các địa điểm yêu thích vào danh sách của bạn." },
                { id: 3, title: "Tối ưu hóa Lộ trình", desc: "Tự động sắp xếp lịch trình di chuyển thuận tiện nhất." }
              ].map((step) => (
                <motion.div key={step.id} className="flex gap-4" variants={slideInLeft}>
                  <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 text-white flex items-center justify-center font-bold text-lg shadow-md">
                    {step.id}
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-semibold mb-1">{step.title}</h3>
                    <p className="text-sm md:text-base text-muted-foreground">
                      {step.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Video Frame */}
            <motion.div 
              className="order-1 lg:order-2"
              {...slideInRight}
            >
              <div className="relative aspect-video rounded-2xl bg-background shadow-2xl border border-border/50 overflow-hidden group cursor-pointer">
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                </div>
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping opacity-75"></div>
                    <div className="relative bg-white text-primary h-14 w-14 md:h-16 md:w-16 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Play className="h-6 w-6 md:h-8 md:w-8 fill-current ml-1" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </motion.section>

      {/* 3. CTA SECTION: Khôi phục về phiên bản cũ (Original) */}
      <motion.section className="py-16 px-4">
        <div className="container mx-auto text-center">
          <motion.div 
            className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 rounded-2xl p-12"
            {...scaleIn}
          >
            <div className="flex justify-center gap-2 mb-4">
              <Star className="h-10 w-10 text-primary mt-3" />
              <Star className="h-11 w-11 text-primary mt-2" />
              <Star className="h-12 w-12 text-primary mt-1" />
              <Star className="h-11 w-11 text-primary mt-2" />
              <Star className="h-10 w-10 text-primary mt-3" />
            </div>
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