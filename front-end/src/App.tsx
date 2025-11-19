import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import 'leaflet/dist/leaflet.css'
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SearchPage from "./pages/SearchPage";
import ResultsPage from "./pages/ResultsPage";
import FavoritesPage from "./pages/FavoritesPage";
import OptimizeRoutePage from "./pages/OptimizeRoutePage";
import NotFound from "./pages/NotFound";
import AboutPage from "./pages/AboutPage"; // <-- Thêm
import RestaurantDetailPage from "./pages/RestaurantDetailPage"; // <-- Thêm
import ProfilePage from "./pages/ProfilePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/optimize" element={<OptimizeRoutePage />} />
              <Route path="/about" element={<AboutPage />} /> 
              <Route path="/restaurant/:id" element={<RestaurantDetailPage />} /> 
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
