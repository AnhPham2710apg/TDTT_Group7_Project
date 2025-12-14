import math
import re

class RecommendationService:
    def __init__(self):
        # Cấu hình trọng số (Balanced User Profile) [cite: 258]
        self.W_TAGS = 0.4
        self.W_PRICE = 0.3
        self.W_RATING = 0.2
        self.W_SEARCH = 0.1
        
        # Sigma cho Gaussian Decay (Độ lệch chuẩn chấp nhận được của giá ~ 20%) [cite: 256]
        self.PRICE_TOLERANCE_PERCENT = 0.2
        
        # Giá trị thăm dò cho dữ liệu thưa (Sparsity Constraint) [cite: 267]
        self.EXPLORATION_SCORE = 0.1

    def _calculate_gaussian_decay(self, actual_price, target_budget):
        """Soft Constraint: Tính điểm giá bằng hàm phân phối Gauss [cite: 253-255]"""
        if not target_budget or actual_price <= target_budget:
            return 1.0
        
        # Tính độ lệch
        delta = actual_price - target_budget
        sigma = target_budget * self.PRICE_TOLERANCE_PERCENT
        
        if sigma == 0: sigma = 1 # Tránh chia cho 0
        
        # Công thức Gaussian: exp(- (delta^2) / (2 * sigma^2))
        score = math.exp(-(delta**2) / (2 * (sigma**2)))
        return score

    def _calculate_tag_score(self, user_flavors, place_flavors):
        """Tag Matching Score (Jaccard Index) [cite: 246]"""
        # Chuẩn hóa dữ liệu đầu vào thành set (nếu chưa phải)
        if isinstance(user_flavors, str):
            user_tags = set([t.strip().lower() for t in user_flavors.split(',') if t])
        else:
            user_tags = set(user_flavors) if user_flavors else set()

        # Xử lý place_flavors (giả sử DB lưu chuỗi "chua,cay,ngọt")
        if isinstance(place_flavors, str):
            place_tags = set([t.strip().lower() for t in place_flavors.split(',') if t])
        else:
            place_tags = set(place_flavors) if place_flavors else set()

        if not user_tags: 
            return 0.5 # Neutral score nếu user không chọn tag

        intersection = len(user_tags.intersection(place_tags))
        union = len(user_tags.union(place_tags))

        if union > 0:
            return intersection / union
        else:
            return self.EXPLORATION_SCORE # [cite: 267]

    def _calculate_search_score(self, keyword, place):
        """Keyword Context Score [cite: 247-251]"""
        if not keyword:
            return 0.0
        
        keyword = keyword.lower()
        name = (place.name or "").lower()
        desc = (place.description or "").lower()
        
        # Primary Match: Tìm thấy trong tên quán -> 1.0
        if keyword in name:
            return 1.0
        # Secondary Match: Tìm thấy trong mô tả -> 0.5
        elif keyword in desc:
            return 0.5
        
        return 0.0

    def calculate_score(self, user_profile, place):
        """Hàm tính điểm tổng hợp cho một địa điểm [cite: 243]"""
        
        # 1. TAG SCORING
        score_tags = self._calculate_tag_score(user_profile.get('flavors'), place.flavor)
        
        # 2. PRICE SCORING
        # Xử lý thiếu giá: Dùng giá trung bình (ví dụ 50k) hoặc minPrice của quán
        place_price = place.minPrice if place.minPrice else 50000 
        user_budget = user_profile.get('budget')
        
        if user_budget:
            score_price = self._calculate_gaussian_decay(place_price, user_budget)
        else:
            score_price = 1.0 # Nếu user không nhập budget, bỏ qua tiêu chí giá

        # 3. RATING SCORING (Normalization) [cite: 252]
        # Giả sử rating max là 5.0 (Google) hoặc 10.0 (Foody). Code này assume max 5.0
        current_rating = place.rating if place.rating else 0
        score_rating = current_rating / 5.0 

        # 4. SEARCH SCORING
        score_search = self._calculate_search_score(user_profile.get('keyword'), place)

        # 5. WEIGHTED SUM [cite: 244]
        final_score = (
            (self.W_TAGS * score_tags) +
            (self.W_PRICE * score_price) +
            (self.W_RATING * score_rating) +
            (self.W_SEARCH * score_search)
        )
        
        return round(final_score, 4)