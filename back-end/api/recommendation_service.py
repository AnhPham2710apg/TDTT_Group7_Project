import math
import unidecode
import json

class RecommendationService:
    def __init__(self):
        # [CẬP NHẬT] Thêm trọng số 'distance' (khoảng cách)
        # Giảm bớt các trọng số khác một chút để nhường chỗ cho distance
        self.USER_WEIGHTS = {
            'balanced': {'price': 0.2, 'rate': 0.15, 'tag': 0.45, 'distance': 0.2}, 
            'saver':    {'price': 0.4, 'rate': 0.1,  'tag': 0.3,  'distance': 0.2},
            'foodie':   {'price': 0.1, 'rate': 0.25, 'tag': 0.5,  'distance': 0.15}
        }
        
        self.VIBE_MAPPING = {
            "chill":      ["chill", "thư giãn", "thoải mái", "nhẹ nhàng", "yên tĩnh", "coffee", "cà phê"],
            "vibrant":    ["sôi động", "nhộn nhịp", "náo nhiệt", "bar", "pub", "lounge", "nhạc", "music"],
            "romantic":   ["lãng mạn", "hẹn hò", "nến", "riêng tư", "couple", "cầu hôn"],
            "cozy":       ["ấm cúng", "gia đình", "nhà hàng", "family", "họp mặt"],
            "luxury":     ["sang trọng", "cao cấp", "fine dining", "5 sao", "đẳng cấp"],
            "street":     ["vỉa hè", "bình dân", "đường phố", "street food", "ăn vặt"],
            "view":       ["view", "rooftop", "ban công", "sân thượng", "trên cao", "nhìn ra sông"],
            "traditional":["truyền thống", "cổ điển", "xưa", "old", "vintage", "lâu đời"]
        }

    def _normalize_text(self, text):
        if not text: return ""
        text_str = str(text)
        text_no_accent = unidecode.unidecode(text_str)
        return text_no_accent.lower().strip()

    def _calculate_gaussian_decay(self, avg_price, budget, user_type='balanced'):
        if budget is None or budget <= 0: return 1.0
        # Fix giá 0 trả về 0.5
        if avg_price == 0: return 0.5
        if user_type != 'saver' and avg_price < (budget * 0.3): return 0.8
        if avg_price <= budget: return 1.0
        dynamic_sigma = max(budget * 0.2, 20000)
        numerator = (avg_price - budget) ** 2
        denominator = 2 * (dynamic_sigma ** 2)
        return math.exp(-(numerator / denominator))

    def _get_price_score(self, restaurant, user_budget, user_type='balanced'):
        min_p = restaurant.minPrice or 0
        max_p = restaurant.maxPrice or min_p
        if min_p == 0 and max_p == 0: avg_price = 0
        else: avg_price = (min_p + max_p) / 2
        return self._calculate_gaussian_decay(avg_price, user_budget, user_type)

    def _get_rate_score(self, restaurant):
        r = restaurant.rating if restaurant.rating else 0
        return r / 5.0

    def _check_synonym_match(self, source_text, keywords):
        if not source_text: return False
        for word in keywords:
            norm_word = self._normalize_text(word)
            if norm_word in source_text:
                return True
        return False

    def _get_extended_tag_score(self, restaurant, user_prefs):
        raw_score = 0.0
        max_possible_score = 16.0 
        
        u_cuisines = [self._normalize_text(c) for c in user_prefs.get('cuisines', [])]
        u_flavors = user_prefs.get('flavors', [])
        u_vibes = user_prefs.get('vibes', [])
        
        u_foodType = user_prefs.get('foodType', 'both')         
        u_bevFood = user_prefs.get('beverageOrFood', 'both')    
        u_courseType = user_prefs.get('courseType', 'both')     
        keyword = self._normalize_text(user_prefs.get('keyword', ''))

        r_cuisine = self._normalize_text(restaurant.cuisine)
        r_flavor_raw = restaurant.flavor
        r_foodType = self._normalize_text(restaurant.foodType)
        r_bevFood = self._normalize_text(restaurant.bevFood)
        r_courseType = self._normalize_text(restaurant.courseType)
        
        r_subtypes = self._normalize_text(restaurant.subtypes)
        r_desc = self._normalize_text(restaurant.description)
        r_name = self._normalize_text(restaurant.name)

        matched_cuisine = False
        for req_c in u_cuisines:
            if req_c in r_cuisine:
                matched_cuisine = True
                break
        if matched_cuisine: raw_score += 4.0

        if u_flavors and r_flavor_raw:
            matches = 0
            req_flavors = [self._normalize_text(f) for f in u_flavors]
            clean_db_flavor = str(r_flavor_raw).replace('[','').replace(']','').replace('"','').replace("'",'')
            db_flavors_list = [self._normalize_text(f) for f in clean_db_flavor.split(',')]
            for f_db in db_flavors_list:
                if f_db in req_flavors:
                    matches += 1
            if matches > 0:
                raw_score += 2.0 + (min(matches, 2) * 0.5)

        map_food = {'vegetarian': 'chay', 'non-vegetarian': 'man'}
        target_food = map_food.get(u_foodType)
        if u_foodType != 'both' and target_food and target_food in r_foodType:
             raw_score += 2.0
        
        map_bev = {'beverage': 'nuoc', 'food': 'kho'} 
        target_bev = map_bev.get(u_bevFood)
        if u_bevFood != 'both' and target_bev:
            if target_bev in r_bevFood or 'ca 2' in r_bevFood:
                raw_score += 2.0

        map_course = {'main': 'mon chinh', 'dessert': 'trang mieng'}
        target_course = map_course.get(u_courseType)
        if u_courseType != 'both' and target_course and target_course in r_courseType:
            raw_score += 2.0

        if u_vibes:
            vibe_match_count = 0
            for u_vibe_id in u_vibes:
                keywords = self.VIBE_MAPPING.get(u_vibe_id, [u_vibe_id])
                if self._check_synonym_match(r_subtypes, keywords):
                    vibe_match_count += 2
                elif self._check_synonym_match(r_desc, keywords):
                    vibe_match_count += 1
            if vibe_match_count > 0:
                raw_score += min(3.0, vibe_match_count)

        if keyword:
            if keyword in r_name: 
                raw_score += 2.0
            elif keyword in r_subtypes or keyword in r_cuisine:
                raw_score += 1.5
            elif keyword in r_desc:
                raw_score += 1.0

        return min(raw_score, max_possible_score) / max_possible_score

    # [MỚI] Hàm tính điểm khoảng cách
    def _get_distance_score(self, current_dist, max_radius):
        """
        Linear Decay: Càng gần điểm càng cao.
        0km -> 1.0 điểm
        max_radius -> 0.0 điểm
        """
        if current_dist is None or max_radius is None or max_radius <= 0:
            return 0.0
        
        # Nếu quán nằm ngoài bán kính (lỡ sót), điểm = 0
        if current_dist > max_radius: return 0.0
        
        score = 1.0 - (current_dist / max_radius)
        return max(0.0, score)

    def calculate_final_score(self, restaurant, user_type, user_prefs):
        weights = self.USER_WEIGHTS.get(user_type, self.USER_WEIGHTS['balanced'])
        budget = user_prefs.get('maxPrice')
        
        # Lấy tham số khoảng cách từ route truyền sang
        distance_km = user_prefs.get('distance_km') 
        max_radius = user_prefs.get('max_radius')

        s_price = self._get_price_score(restaurant, budget, user_type)
        s_rate = self._get_rate_score(restaurant)
        s_tag = self._get_extended_tag_score(restaurant, user_prefs)
        
        # Tính điểm khoảng cách
        s_dist = 0.0
        if distance_km is not None and max_radius:
            s_dist = self._get_distance_score(distance_km, max_radius)
        
        # Công thức tổng quát (Weighted Sum)
        final_score = (s_price * weights['price']) + \
                      (s_rate * weights['rate']) + \
                      (s_tag * weights['tag']) + \
                      (s_dist * weights.get('distance', 0))
                      
        return round(final_score * 100, 2)