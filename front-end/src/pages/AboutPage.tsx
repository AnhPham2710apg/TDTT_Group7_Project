// src/pages/AboutPage.tsx

import Navbar from "@/components/Navbar";
import { 
  UtensilsCrossed, 
  Users, 
  Target,
  HelpCircle, 
  Search,     
  Route as RouteIcon, 
  Heart,
  ChevronRight,
  Info
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
// 1. Import hook
import { useTranslation } from 'react-i18next';

const AboutPage = () => {
  // 2. Khởi tạo hook
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* ============================================================
          1. GIAO DIỆN PC (GIỮ NGUYÊN - ẨN TRÊN MOBILE)
         ============================================================ */}
      <div className="hidden md:block container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          
          {/* Intro Section */}
          <div className="text-center mb-12">
            <div className="inline-flex p-4 rounded-lg bg-hero-gradient mb-4">
              <UtensilsCrossed className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">
              {t('about.title', 'Về Food Tour Assistant')}
            </h1>
            <p className="text-xl text-muted-foreground">
              {t('about.subtitle', 'Người bạn đồng hành đáng tin cậy cho mọi chuyến phiêu lưu ẩm thực.')}
            </p>
          </div>

          <div className="space-y-10">
            <div className="bg-card p-6 rounded-lg border">
              <h2 className="text-2xl font-semibold mb-3 flex items-center gap-2">
                <Target className="h-6 w-6 text-primary" />
                {t('about.mission_title', 'Sứ mệnh của chúng tôi')}
              </h2>
              <p className="text-muted-foreground">
                {t('about.mission_desc', 'Mục tiêu của chúng tôi là giúp những người yêu ẩm thực dễ dàng khám phá những hương vị mới, lập kế hoạch cho các chuyến đi ăn uống hiệu quả, và chia sẻ trải nghiệm của họ. Chúng tôi tin rằng ẩm thực là một phần quan trọng của văn hóa và trải nghiệm du lịch.')}
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border">
              <h2 className="text-2xl font-semibold mb-3 flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                {t('about.team_title', 'Đội ngũ phát triển')}
              </h2>
              <p className="text-muted-foreground">
                {t('about.team_desc', 'Chúng tôi là những nhà phát triển đam mê công nghệ và ẩm thực, luôn nỗ lực xây dựng những công cụ hữu ích để kết nối mọi người với những bữa ăn ngon.')}
              </p>
            </div>
          </div>

          <hr className="my-16 border-border" />

          {/* Guide Section */}
          <div className="text-center mb-12">
            <div className="inline-flex p-4 rounded-lg bg-hero-gradient mb-4">
              <HelpCircle className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">
              {t('about.guide_title', 'Hướng dẫn sử dụng')}
            </h1>
            <p className="text-xl text-muted-foreground">
              {t('about.guide_subtitle', 'Cách tận dụng tối đa Food Tour Assistant.')}
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-card p-6 rounded-lg border">
              <h2 className="text-2xl font-semibold mb-3 flex items-center gap-2">
                <Search className="h-6 w-6 text-primary" />
                {t('about.step1_title', '1. Tìm kiếm nhà hàng')}
              </h2>
              <p className="text-muted-foreground">
                {t('about.step1_desc', 'Truy cập trang "Search" từ thanh điều hướng. Sử dụng các bộ lọc như ẩm thực, khẩu vị, giá cả và khu vực để tìm kiếm.')}
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border">
              <h2 className="text-2xl font-semibold mb-3 flex items-center gap-2">
                <Heart className="h-6 w-6 text-primary" />
                {t('about.step2_title', '2. Lưu và Chọn nhà hàng')}
              </h2>
              <p className="text-muted-foreground">
                {t('about.step2_desc', 'Trên trang kết quả, nhấp vào biểu tượng trái tim để thêm nhà hàng vào danh sách Yêu thích.')}
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border">
              <h2 className="text-2xl font-semibold mb-3 flex items-center gap-2">
                <RouteIcon className="h-6 w-6 text-primary" />
                {t('about.step3_title', '3. Tối ưu hóa Lộ trình')}
              </h2>
              <p className="text-muted-foreground">
                {t('about.step3_desc', 'Sau khi chọn ít nhất 2 nhà hàng, nút "Optimize Route" sẽ xuất hiện để sắp xếp lộ trình.')}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ============================================================
          2. GIAO DIỆN MOBILE (THIẾT KẾ MỚI - CHỈ HIỆN TRÊN MOBILE)
         ============================================================ */}
      <div className="md:hidden pb-10">
        
        {/* MOBILE HEADER BRANDING */}
        <div className="bg-gradient-to-b from-green-50 to-white pt-8 pb-4 px-4 text-center border-b border-gray-100 rounded-b-3xl shadow-sm mb-4">
            <div className="inline-flex p-3 rounded-2xl bg-hero-gradient shadow-lg mb-3">
              <UtensilsCrossed className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('common.app_name', 'Food Tour Assistant')}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('about.version', 'Phiên bản 1.0.0')}
            </p>
        </div>

        <div className="container mx-auto px-4">
            <Tabs defaultValue="about" className="w-full">
                
                {/* STICKY TABS */}
                <div className="sticky top-16 z-10 bg-background/95 backdrop-blur py-2">
                    <TabsList className="grid w-full grid-cols-2 rounded-xl h-12 bg-gray-100 p-1">
                        <TabsTrigger value="about" className="rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                            {t('about.tab_about', 'Về chúng tôi')}
                        </TabsTrigger>
                        <TabsTrigger value="guide" className="rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                            {t('about.tab_guide', 'Hướng dẫn')}
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* --- TAB 1: VỀ CHÚNG TÔI --- */}
                <TabsContent value="about" className="space-y-4 mt-4 animate-in slide-in-from-bottom-2 duration-300">
                    {/* Mission Card */}
                    <Card className="border-0 shadow-sm bg-blue-50/50">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                    <Target className="h-5 w-5" />
                                </div>
                                <h2 className="font-bold text-lg text-gray-800">
                                  {t('about.mission_short_title', 'Sứ mệnh')}
                                </h2>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed text-justify">
                                {t('about.mission_short_desc', 'Giúp những người yêu ẩm thực khám phá hương vị mới và lập kế hoạch ăn uống hiệu quả. Chúng tôi tin rằng ẩm thực là văn hóa.')}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Team Card */}
                    <Card className="border-0 shadow-sm bg-orange-50/50">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                                    <Users className="h-5 w-5" />
                                </div>
                                <h2 className="font-bold text-lg text-gray-800">
                                  {t('about.team_short_title', 'Đội ngũ')}
                                </h2>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed text-justify">
                                {t('about.team_short_desc', 'Đam mê công nghệ và ẩm thực, chúng tôi nỗ lực xây dựng công cụ kết nối mọi người qua những bữa ăn ngon.')}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Info Extra */}
                    <Card className="border border-gray-100 shadow-none">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Info className="h-5 w-5 text-gray-400" />
                                <span className="text-sm font-medium text-gray-700">
                                  {t('about.terms', 'Điều khoản & Chính sách')}
                                </span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- TAB 2: HƯỚNG DẪN (TIMELINE STYLE) --- */}
                <TabsContent value="guide" className="mt-4 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="relative pl-4 space-y-8 before:absolute before:left-[27px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-green-200 before:via-green-100 before:to-transparent">
                        
                        {/* Step 1 */}
                        <div className="relative pl-12">
                            <div className="absolute left-0 top-0 flex h-14 w-14 items-center justify-center">
                                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white border-2 border-green-500 shadow-sm">
                                    <Search className="h-5 w-5 text-green-600" />
                                </div>
                            </div>
                            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-base text-gray-800 mb-1">
                                  {t('about.mobile_step1_title', '1. Tìm kiếm thông minh')}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {t('about.mobile_step1_desc', 'Sử dụng bộ lọc (giá, vị trí, loại hình) để tìm quán ăn ưng ý nhất.')}
                                </p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="relative pl-12">
                            <div className="absolute left-0 top-0 flex h-14 w-14 items-center justify-center">
                                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white border-2 border-red-500 shadow-sm">
                                    <Heart className="h-5 w-5 text-red-500 fill-red-50" />
                                </div>
                            </div>
                            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-base text-gray-800 mb-1">
                                  {t('about.mobile_step2_title', '2. Chọn & Lưu')}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {t('about.mobile_step2_desc', 'Thả tim để lưu vào mục Yêu thích hoặc chọn (+) để thêm vào hành trình.')}
                                </p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="relative pl-12">
                            <div className="absolute left-0 top-0 flex h-14 w-14 items-center justify-center">
                                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white border-2 border-blue-500 shadow-sm">
                                    <RouteIcon className="h-5 w-5 text-blue-500" />
                                </div>
                            </div>
                            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-base text-gray-800 mb-1">
                                  {t('about.mobile_step3_title', '3. Tối ưu lộ trình')}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {t('about.mobile_step3_desc', 'Hệ thống sẽ tự động sắp xếp thứ tự đi lại sao cho tiết kiệm thời gian nhất.')}
                                </p>
                            </div>
                        </div>

                    </div>
                </TabsContent>
            </Tabs>
        </div>
      </div>

    </div>
  );
};

export default AboutPage;