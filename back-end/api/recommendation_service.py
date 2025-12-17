import math

class RecommendationService:
    def __init__(self):
        # --- CẤU HÌNH TRỌNG SỐ TỪ FILE CŨ ---
        self.USER_WEIGHTS = {
            'balanced': {'price': 0.3, 'rate': 0.2, 'tag': 0.4},
            'saver':    {'price': 0.5, 'rate': 0.1, 'tag': 0.2},
            'foodie':   {'price': 0.1, 'rate': 0.4, 'tag': 0.4}
        }
        # Độ lệch chuẩn cho hàm Gaussian (50k VNĐ)
        self.SIGMA = 50000 

    def _calculate_gaussian_decay(self, avg_price, budget):
        """
        Tính điểm giá (S_Price) theo Gaussian Decay.
        """
        if budget is None or budget <= 0:
            return 1.0
            
        if avg_price <= budget:
            return 1.0
        else:
            # Công thức: e ^ ( - (price - budget)^2 / (2 * sigma^2) )
            numerator = (avg_price - budget) ** 2
            denominator = 2 * (self.SIGMA ** 2)
            return math.exp(-(numerator / denominator))

    def _get_price_score(self, restaurant, user_budget):
        """Tính điểm giá dựa trên giá trung bình của quán"""
        min_p = restaurant.minPrice or 0
        max_p = restaurant.maxPrice or min_p
        
        # Lấy giá trung bình làm đại diện
        avg_price = (min_p + max_p) / 2
        if avg_price == 0: avg_price = 50000 # Default nếu thiếu dữ liệu
        
        return self._calculate_gaussian_decay(avg_price, user_budget)

    def _get_rate_score(self, restaurant):
        """Tính điểm Rating (Scale 0-1)"""
        r = restaurant.rating if restaurant.rating else 0
        return r / 5.0

    def _get_tag_score(self, restaurant, user_cuisines, user_flavors, keyword):
        """
        Tính điểm Tag (S_Tag) theo logic cộng điểm cố định.
        Max raw score quy ước = 10.0
        """
        raw_score = 0.0
        max_possible_score = 10.0
        
        # 1. Trùng Cuisine (+5)
        # user_cuisines là list, restaurant.cuisine là string (ví dụ: "Món Việt")
        if restaurant.cuisine and user_cuisines:
            # Kiểm tra xem cuisine của quán có nằm trong list user chọn không
            if restaurant.cuisine in user_cuisines:
                raw_score += 5.0
        
        # 2. Trùng Flavor (+3)
        if restaurant.flavor and user_flavors:
            # Tách chuỗi DB: "Cay, Ngọt" -> ['cay', 'ngọt']
            db_flavors = [f.strip().lower() for f in restaurant.flavor.split(',')]
            
            # Tách chuỗi User request: "Cay, Chua" -> ['cay', 'chua']
            if isinstance(user_flavors, list):
                req_flavors = [f.lower() for f in user_flavors]
            else:
                req_flavors = [f.strip().lower() for f in user_flavors.split(',')]

            # Nếu có giao thoa giữa 2 tập hợp
            if set(db_flavors) & set(req_flavors):
                raw_score += 3.0

        # 3. Trùng Keyword (+2)
        if keyword:
            k = keyword.lower()
            name = restaurant.name.lower() if restaurant.name else ""
            desc = restaurant.description.lower() if restaurant.description else ""
            if k in name or k in desc:
                raw_score += 2.0
                
        return min(raw_score, max_possible_score) / max_possible_score

    def calculate_final_score(self, restaurant, user_type, user_prefs):
        """
        Hàm Public để tính tổng điểm.
        Return: Điểm thang 100.
        """
        weights = self.USER_WEIGHTS.get(user_type, self.USER_WEIGHTS['balanced'])
        
        budget = user_prefs.get('maxPrice')
        
        # Tính điểm thành phần
        s_price = self._get_price_score(restaurant, budget)
        s_rate = self._get_rate_score(restaurant)
        s_tag = self._get_tag_score(
            restaurant,
            user_prefs.get('cuisines', []),
            user_prefs.get('flavors', ''),
            user_prefs.get('keyword', '')
        )
        
        # Tổng hợp trọng số
        final_score = (s_price * weights['price']) + \
                      (s_rate * weights['rate']) + \
                      (s_tag * weights['tag'])
                      
        return round(final_score * 100, 2)