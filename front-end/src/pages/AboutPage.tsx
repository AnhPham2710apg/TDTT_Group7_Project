// src/pages/AboutPage.tsx

import Navbar from "@/components/Navbar";
import { 
  UtensilsCrossed, 
  Users, 
  Target,
  HelpCircle, // Thêm từ GuidePage
  Search,     // Thêm từ GuidePage
  Route,      // Thêm từ GuidePage
  Heart       // Thêm từ GuidePage
} from "lucide-react";

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          
          {/* === PHẦN 1: GIỚI THIỆU (TỪ ABOUTPAGE) === */}
          <div className="text-center mb-12">
            <div className="inline-flex p-4 rounded-lg bg-hero-gradient mb-4">
              <UtensilsCrossed className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Về Food Tour Assistant</h1>
            <p className="text-xl text-muted-foreground">
              Người bạn đồng hành đáng tin cậy cho mọi chuyến phiêu lưu ẩm thực.
            </p>
          </div>

          <div className="space-y-10">
            <div className="bg-card p-6 rounded-lg border">
              <h2 className="text-2xl font-semibold mb-3 flex items-center gap-2">
                <Target className="h-6 w-6 text-primary" />
                Sứ mệnh của chúng tôi
              </h2>
              <p className="text-muted-foreground">
                Mục tiêu của chúng tôi là giúp những người yêu ẩm thực dễ dàng khám phá
                những hương vị mới, lập kế hoạch cho các chuyến đi ăn uống hiệu quả,
                và chia sẻ trải nghiệm của họ. Chúng tôi tin rằng ẩm thực là
                một phần quan trọng của văn hóa và trải nghiệm du lịch.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border">
              <h2 className="text-2xl font-semibold mb-3 flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Đội ngũ phát triển
              </h2>
              <p className="text-muted-foreground">
                (Đây là nơi bạn có thể giới thiệu về bản thân hoặc đội ngũ của mình!)
                <br />
                Chúng tôi là những nhà phát triển đam mê công nghệ và ẩm thực,
                luôn nỗ lực xây dựng những công cụ hữu ích để kết nối mọi người
                với những bữa ăn ngon.
              </p>
            </div>
          </div>

          {/* === ĐƯỜNG PHÂN CÁCH === */}
          <hr className="my-16 border-border" />

          {/* === PHẦN 2: HƯỚNG DẪN (TỪ GUIDEPAGE) === */}
          <div className="text-center mb-12">
            <div className="inline-flex p-4 rounded-lg bg-hero-gradient mb-4">
              <HelpCircle className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Hướng dẫn sử dụng</h1>
            <p className="text-xl text-muted-foreground">
              Cách tận dụng tối đa Food Tour Assistant.
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-card p-6 rounded-lg border">
              <h2 className="text-2xl font-semibold mb-3 flex items-center gap-2">
                <Search className="h-6 w-6 text-primary" />
                1. Tìm kiếm nhà hàng
              </h2>
              <p className="text-muted-foreground">
                Truy cập trang "Search" từ thanh điều hướng. Sử dụng các bộ lọc
                như ẩm thực, khẩu vị, giá cả và khu vực để tìm kiếm. Nhấn
                "Tìm kiếm" để xem kết quả.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border">
              <h2 className="text-2xl font-semibold mb-3 flex items-center gap-2">
                <Heart className="h-6 w-6 text-primary" />
                2. Lưu và Chọn nhà hàng
              </h2>
              <p className="text-muted-foreground">
                Trên trang kết quả, nhấp vào biểu tượng trái tim để thêm nhà hàng
                vào danh sách Yêu thích. Nhấp vào bất kỳ đâu trên thẻ nhà hàng
                để chọn (tối đa 5) cho chuyến đi của bạn.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border">
              <h2 className="text-2xl font-semibold mb-3 flex items-center gap-2">
                <Route className="h-6 w-6 text-primary" />
                3. Tối ưu hóa Lộ trình
              </h2>
              <p className="text-muted-foreground">
                Sau khi chọn ít nhất 2 nhà hàng, nút "Optimize Route" sẽ xuất hiện.
                Nhấp vào đó, nhập điểm xuất phát của bạn, và chúng tôi sẽ
                sắp xếp các điểm đến theo thứ tự hiệu quả nhất.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AboutPage;