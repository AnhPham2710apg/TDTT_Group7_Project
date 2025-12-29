import math
import requests
import unidecode 
from flask import Blueprint, request, jsonify, current_app
from models import Restaurant, db
from sqlalchemy import or_, func, text
from recommendation_service import RecommendationService
from datetime import datetime
from weather_service import get_weather_helper

restaurant_bp = Blueprint("restaurant_bp", __name__)
rec_service = RecommendationService()

LIMIT_RESULTS = 50        
CANDIDATE_POOL_SIZE = 500 

# ==============================================================================
# TỪ ĐIỂN ÁNH XẠ MỞ RỘNG (SMART MAPPING)
# ==============================================================================
# ... (Giữ nguyên các import ở trên) ...

# ==============================================================================
# 1. DATA: TỪ ĐIỂN CHUẨN HÓA (CHỈ DÙNG DANH TỪ SỐ ÍT - SINGULAR)
# ==============================================================================
EXPANDED_SEARCH_MAP = {
    # --- NOODLE & SOUPS ---
    "noodle": ["bún", "mì", "phở", "hủ tiếu", "bánh canh", "miến", "nui", "cao lầu", "mì quảng", "ramen", "udon"],
    "soup": ["canh", "súp", "cháo", "phở", "bún", "lẩu"],
    "beef noodle": ["bún bò", "phở bò", "hủ tiếu bò", "bánh canh bò"],
    "chicken noodle": ["bún gà", "phở gà", "miến gà"],
    "crab noodle": ["bún riêu", "bánh canh cua"],
    "fish noodle": ["bún cá", "bánh canh cá"],

    # --- RICE & GRAINS ---
    "rice": ["cơm", "cháo", "xôi", "cơm tấm", "cơm niêu", "cơm chiên", "cơm gà"],
    "broken rice": ["cơm tấm"],
    "sticky rice": ["xôi", "bánh chưng"],
    "fried rice": ["cơm chiên", "cơm rang"],

    # --- BREAD & PASTRY (Xử lý Sandwich, Sandwiches) ---
    "bread": ["bánh mì"],
    "sandwich": ["bánh mì", "bánh kẹp"],
    "burger": ["bánh mì kẹp thịt", "hamburgers"],
    "pancake": ["bánh xèo", "bánh khọt"],
    "pizza": ["pizza", "bánh pizza"],

    # --- ROLLS & DUMPLINGS (Xử lý Fry/Fries) ---
    "roll": ["gỏi cuốn", "chả giò", "bánh cuốn", "nem nướng", "bì cuốn"],
    "fry": ["khoai tây chiên", "đồ chiên"], # French fries -> Fry
    "dumpling": ["sủi cảo", "há cảo", "bánh bao", "dimsum"],

    # --- MEAT & SEAFOOD ---
    "beef": ["bò", "bê", "bít tết"],
    "chicken": ["gà", "cánh gà"],
    "pork": ["heo", "lợn", "sườn", "xá xíu"],
    "seafood": ["hải sản", "ốc", "tôm", "cua", "ghẹ", "mực", "hàu"],
    "fish": ["cá"],

    # --- DRINKS & DESSERT ---
    "coffee": ["cà phê", "cafe", "bạc xỉu"],
    "tea": ["trà"],
    "milk tea": ["trà sữa"],
    "smoothie": ["sinh tố"],
    "juice": ["nước ép"],
    "beer": ["bia", "quán nhậu"],
    "dessert": ["tráng miệng", "chè", "kem", "bánh flan", "sữa chua"],
    "ice cream": ["kem", "gelato"],
    
    # --- OTHERS ---
    "vegetarian": ["chay"],
    "snack": ["ăn vặt", "bánh tráng"],
    "hotpot": ["lẩu"],
    "bbq": ["nướng", "lò đất"],
    "lunch": ["cơm trưa"],
    "dinner": ["ăn tối"]
}

# ==============================================================================
# 2. HELPER: XỬ LÝ NGỮ PHÁP TIẾNG ANH (Robust Singularization)
# ==============================================================================
def singularize_english_word(word):
    """
    Chuyển danh từ số nhiều tiếng Anh về số ít dựa trên quy tắc ngữ pháp.
    Input: "sandwiches", "fries", "noodles" -> Output: "sandwich", "fry", "noodle"
    """
    word = word.lower().strip()
    
    # Case 0: Từ quá ngắn hoặc rỗng, không xử lý
    if len(word) < 3:
        return word

    # Case 1: Kết thúc bằng 'ies' (VD: fries -> fry, cherries -> cherry)
    # Quy tắc: Đổi 'ies' thành 'y'
    if word.endswith('ies'):
        return word[:-3] + 'y'

    # Case 2: Kết thúc bằng 'es'
    if word.endswith('es'):
        # 2a. Các từ kết thúc bằng s, x, z, ch, sh + es (VD: sandwiches, boxes, dishes)
        # Kiểm tra ký tự đứng trước 'es'
        if word.endswith(('ses', 'xes', 'zes', 'ches', 'shes')):
            return word[:-2] # Bỏ 'es'
        
        # 2b. Các từ kết thúc bằng o + es (VD: potatoes -> potato, tomatoes -> tomato)
        if word.endswith('oes'):
            return word[:-2] # Bỏ 'es'

        # Mặc định còn lại: cứ bỏ 's' (VD: miles -> mile, dù miles ko phải es nhưng logic chung)
        # Nhưng an toàn nhất cho nhóm 'es' là cứ bỏ 's' nếu không khớp 2a, 2b (VD: cakes -> cake)

    # Case 3: Kết thúc bằng 's' (nhưng không phải 'ss' như 'glass', 'bass')
    if word.endswith('s') and not word.endswith('ss'):
        return word[:-1]

    return word

# ==============================================================================
# 3. MAIN LOGIC: TÌM KIẾM THÔNG MINH
# ==============================================================================
def generate_search_terms(keyword):
    """
    Tự động map từ khóa, hỗ trợ xử lý ngữ pháp tiếng Anh.
    """
    if not keyword: return []
    
    # Dùng Set để tự động loại bỏ trùng lặp
    terms = {keyword} 
    
    # 1. Chuẩn hóa về số ít (Singularize)
    # VD: "Sandwiches" -> "sandwich"
    # VD: "Fries" -> "fry"
    # VD: "Noodles" -> "noodle"
    clean_key = singularize_english_word(keyword)

    # 2. Tra cứu trực tiếp (Exact Match với từ đã chuẩn hóa)
    if clean_key in EXPANDED_SEARCH_MAP:
        terms.update(EXPANDED_SEARCH_MAP[clean_key])
    
    # 3. Fallback: Tra cứu từng phần (Partial Match)
    # Chỉ chạy khi không tìm thấy match chính xác
    else:
        for key, values in EXPANDED_SEARCH_MAP.items():
            # Logic: Nếu từ điển là "noodle" và user nhập "spicy noodles"
            # -> clean_key của user vẫn chứa "noodle" (do logic tách từ phức tạp hơn, 
            # nhưng ở đây ta check simple containment)
            
            # Kiểm tra 2 chiều an toàn:
            # - Key nằm trong từ khóa user (VD: user="beef noodle soup" -> key="beef noodle")
            # - Từ khóa user (đã chuẩn hóa) nằm trong key (ít gặp nhưng đề phòng)
            if (key in clean_key or clean_key in key) and len(key) > 2:
                terms.update(values)

    return list(terms)

def haversine_distance(lat1, lon1, lat2, lon2):
    try:
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c
    except: return 0

def get_coords_from_goong(address_query):
    try:
        api_key = current_app.config.get('GOONG_API_KEY')
        if not api_key: return None
        full_query = f"{address_query}, Hồ Chí Minh, Việt Nam"
        base_url = "https://rsapi.goong.io/Geocode"
        params = {"address": full_query, "api_key": api_key}
        response = requests.get(base_url, params=params, timeout=3)
        if response.status_code == 200 and response.json().get("results"):
            location = response.json()["results"][0]["geometry"]["location"]
            return location["lat"], location["lng"]
    except: pass
    return None

def ensure_unaccent_extension():
    try:
        db.session.execute(text("CREATE EXTENSION IF NOT EXISTS unaccent;"))
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Warning: Could not enable unaccent extension. {e}")

# --- Thay thế toàn bộ hàm check_is_open cũ bằng hàm này ---
def check_is_open(working_hour_str):
    """
    Kiểm tra mở cửa dựa trên chuỗi working_hour (VD: "07:00 - 22:00")
    """
    if not working_hour_str: 
        return True # Không có dữ liệu giờ -> Mặc định là MỞ để không bị ẩn quán oan
    
    try:
        # 1. Chuẩn hóa chuỗi (Xóa khoảng trắng thừa)
        # Giả định format database là "HH:MM - HH:MM"
        if '-' not in working_hour_str:
            return True
            
        times = working_hour_str.split('-')
        if len(times) < 2: 
            return True
            
        start_str = times[0].strip()
        end_str = times[1].strip()
        
        # 2. Lấy giờ hiện tại và convert string -> time
        now = datetime.now().time()
        
        # Xử lý format thời gian (chỉ lấy HH:MM)
        fmt = '%H:%M'
        # Đôi khi data có thể lẫn giây hoặc ký tự lạ, nên dùng try-catch chặt chẽ
        start_time = datetime.strptime(start_str[:5], fmt).time()
        end_time = datetime.strptime(end_str[:5], fmt).time()

        # 3. So sánh
        if start_time < end_time:
            # Ví dụ: 08:00 - 22:00
            return start_time <= now <= end_time
        else:
            # Ví dụ: 22:00 - 02:00 (Qua đêm)
            return now >= start_time or now <= end_time
            
    except Exception as e:
        # Nếu format trong DB bị lỗi lạ, vẫn cho hiển thị quán
        return True

@restaurant_bp.route("/api/search", methods=["GET"])
def search_restaurants():
    try:
        # Kiểm tra xem đang chạy SQLite (Test) hay Postgres (Real)
        db_uri = current_app.config.get('SQLALCHEMY_DATABASE_URI', '')
        is_sqlite = 'sqlite' in db_uri

        # Chỉ bật extension unaccent nếu KHÔNG phải là SQLite
        if not is_sqlite:
            # Lưu ý: Hàm này bạn phải đảm bảo đã define hoặc import
            # ensure_unaccent_extension() 
            pass 

        # ======================================================================
        # 1. NHẬN THAM SỐ (Code cũ)
        # ======================================================================
        current_lang = request.args.get("lang", "vi")
        raw_keyword = request.args.get("keyword", "").strip()
        
        user_type = request.args.get('userType', 'balanced')
        user_budget_max = request.args.get('maxPrice', type=int)
        user_budget_min = request.args.get('minPrice', type=int)
        rating_min = request.args.get('ratingMin', type=float)
        
        raw_cuisines = request.args.getlist('cuisine')
        # Map sơ bộ cuisine
        CUISINE_MAP_SIMPLE = { "vietnam": "việt nam", "korea": "hàn quốc", "japan": "nhật bản", "china": "trung quốc", "western": "âu/mỹ", "thailand": "thái lan" }
        cuisines = [CUISINE_MAP_SIMPLE.get(c.lower(), c) for c in raw_cuisines]

        flavors_str = request.args.get('flavors', '')
        flavors_list = flavors_str.split(',') if flavors_str else []
        foodType = request.args.get('foodType')
        beverageOrFood = request.args.get('beverageOrFood')
        courseType = request.args.get('courseType')
        user_vibes = request.args.getlist('vibe')
        districts = request.args.getlist('district')
        radius_km = request.args.get("radius", type=float)

        # ======================================================================
        # [MỚI] 2. LẤY THÔNG TIN THỜI TIẾT
        # ======================================================================
        # Mặc định lấy HCM, sau này có thể lấy theo GPS user nếu cần
        weather_info = get_weather_helper("Ho Chi Minh City")
        weather_desc = ""
        weather_temp = 30
        if weather_info:
            weather_desc = weather_info.get('desc', '').lower()
            weather_temp = weather_info.get('temp', 30)

        # ======================================================================
        # 3. XÂY DỰNG QUERY (Code cũ - Giữ nguyên logic lọc phức tạp)
        # ======================================================================
        query = Restaurant.query

        # --- Hard Filters ---
        if foodType and foodType != 'both':
            val = {'vegetarian': 'chay', 'non-vegetarian': 'mặn'}.get(foodType, foodType)
            query = query.filter(Restaurant.foodType.ilike(f"%{val}%"))
            
        if beverageOrFood and beverageOrFood != 'both':
            val = {'beverage': 'nước', 'food': 'khô'}.get(beverageOrFood, beverageOrFood)
            if val == 'khô':
                query = query.filter(or_(Restaurant.bevFood.ilike("%khô%"), Restaurant.bevFood.ilike("%cả 2%")))
            elif val == 'nước':
                query = query.filter(or_(Restaurant.bevFood.ilike("%nước%"), Restaurant.bevFood.ilike("%đồ uống%"), Restaurant.bevFood.ilike("%cả 2%")))
            else:
                query = query.filter(Restaurant.bevFood.ilike(f"%{val}%"))

        if courseType and courseType != 'both':
            val = {'main': 'món chính', 'dessert': 'tráng miệng'}.get(courseType, courseType)
            query = query.filter(Restaurant.courseType.ilike(f"%{val}%"))

        if user_budget_min: query = query.filter(Restaurant.maxPrice >= user_budget_min)
        if user_budget_max: query = query.filter(Restaurant.minPrice <= user_budget_max)
        if rating_min: query = query.filter(Restaurant.rating >= rating_min)

        # --- Geo Filtering (Bounding Box) ---
        center_coords = None # Init variable
        if districts and radius_km:
            target_district = districts[0]
            center_coords = get_coords_from_goong(target_district)
            if center_coords:
                center_lat, center_lon = center_coords
                lat_degree = radius_km / 111.0
                lon_degree = radius_km / (111.0 * math.cos(math.radians(center_lat)))
                query = query.filter(
                    Restaurant.latitude.between(center_lat - lat_degree, center_lat + lat_degree),
                    Restaurant.longitude.between(center_lon - lon_degree, center_lon + lon_degree)
                )
            else:
                query = query.filter(Restaurant.district.in_(districts))
        elif districts:
            query = query.filter(Restaurant.district.in_(districts))

        # --- Smart Search (Unaccent logic) ---
        if raw_keyword:
            # Đảm bảo bạn có hàm generate_search_terms import từ utils hoặc định nghĩa trong file
            # Nếu chưa có thì dùng list đơn giản: search_terms = [raw_keyword]
            # --- Smart Search (Unaccent logic) ---
            search_terms = generate_search_terms(raw_keyword)

            conditions = []
            for term in search_terms:
                term_like = f"%{term}%"
                if is_sqlite:
                    conditions.append(Restaurant.name.ilike(term_like))
                    conditions.append(Restaurant.subtypes.ilike(term_like))
                    conditions.append(Restaurant.cuisine.ilike(term_like))
                    if term == raw_keyword:
                        conditions.append(Restaurant.full_address.ilike(term_like))
                else:
                    conditions.append(func.unaccent(Restaurant.name).ilike(func.unaccent(term_like)))
                    conditions.append(func.unaccent(Restaurant.subtypes).ilike(func.unaccent(term_like)))
                    conditions.append(func.unaccent(Restaurant.cuisine).ilike(func.unaccent(term_like)))
                    if term == raw_keyword:
                        conditions.append(func.unaccent(Restaurant.full_address).ilike(func.unaccent(term_like)))
            
            query = query.filter(or_(*conditions))

        # ======================================================================
        # 4. THỰC THI QUERY & LỌC KHOẢNG CÁCH
        # ======================================================================
        candidates = query.limit(CANDIDATE_POOL_SIZE).all()

        # Lọc chính xác bằng Haversine (Geo Loop cũ)
        if districts and radius_km and center_coords:
            center_lat, center_lon = center_coords
            filtered_candidates = []
            for r in candidates:
                if r.latitude and r.longitude:
                    dist = haversine_distance(center_lat, center_lon, r.latitude, r.longitude)
                    if dist <= radius_km:
                        filtered_candidates.append(r)
            candidates = filtered_candidates

        # ======================================================================
        # [MODIFIED] 5. TÍNH ĐIỂM & MERGE LOGIC MỚI
        # ======================================================================
        user_prefs = {
            'cuisines': cuisines,
            'flavors': flavors_list, 
            'vibes': user_vibes,
            'keyword': raw_keyword, 
            'maxPrice': user_budget_max,
            'foodType': foodType,
            'beverageOrFood': beverageOrFood,
            'courseType': courseType
        }

        scored_results = []
        for r in candidates:
            # 5.1 Tính khoảng cách cho từng quán
            current_dist = None
            if districts and radius_km and center_coords:
                 if r.latitude and r.longitude:
                      current_dist = haversine_distance(center_lat, center_lon, r.latitude, r.longitude)
            
            # 5.2 Chuẩn bị prefs
            current_prefs = user_prefs.copy()
            current_prefs['distance_km'] = current_dist
            current_prefs['max_radius'] = radius_km

            # 5.3 Tính điểm cơ bản (Base Score)
            base_score = rec_service.calculate_final_score(r, user_type, current_prefs)
            
            # -----------------------------------------------------------
            # [MỚI] TÍNH ĐIỂM CỘNG THỜI TIẾT (WEATHER BONUS)
            # -----------------------------------------------------------
            weather_bonus = 0
            # Ghép chuỗi thông tin để tìm từ khóa món ăn
            r_full_text = f"{r.name or ''} {r.category or ''} {r.description or ''} {r.subtypes or ''}".lower()

            # Logic: Mưa/Lạnh -> Ăn đồ nóng/cay/lẩu/nướng
            if "mưa" in weather_desc or "rain" in weather_desc or weather_temp < 25:
                if any(x in r_full_text for x in ['lẩu', 'nướng', 'cay', 'nóng', 'phở', 'bún', 'ramen']):
                    weather_bonus = 5 
            
            # Logic: Nắng nóng -> Ăn đồ mát/kem/trà sữa
            elif weather_temp > 32:
                if any(x in r_full_text for x in ['kem', 'trà sữa', 'bia', 'gỏi', 'cuốn', 'mát', 'sinh tố']):
                    weather_bonus = 5

            final_score = base_score + weather_bonus

            if final_score > 0:
                # 5.4 Chuyển sang Dict & Thêm thông tin
                r_dict = r.to_dict(lang=current_lang)
                
                # [MỚI] Check giờ mở cửa
                is_active = check_is_open(r.working_hour)
                r_dict['is_open'] = is_active
                
                r_dict['match_score'] = final_score
                r_dict['distance_km'] = round(current_dist, 2) if current_dist is not None else None
                
                scored_results.append(r_dict)

        # ======================================================================
        # [MODIFIED] 6. SẮP XẾP (SORTING)
        # ======================================================================
        # Sort 2 cấp độ:
        # 1. is_open (True trước, False sau)
        # 2. match_score (Cao trước, Thấp sau)
        scored_results.sort(key=lambda x: (x['is_open'], x['match_score']), reverse=True)

        # ======================================================================
        # [MODIFIED] 7. TRẢ VỀ KẾT QUẢ
        # ======================================================================
        response_data = {
            "weather": weather_info, # Trả về info thời tiết cho Frontend vẽ Widget
            "results": scored_results[:LIMIT_RESULTS]
        }

        return jsonify(response_data)

    except Exception as e:
        print(f"Search Error: {e}")
        import traceback
        traceback.print_exc() # In lỗi chi tiết hơn
        return jsonify({"error": str(e)}), 500

@restaurant_bp.route("/api/restaurant/<param>", methods=["GET"])
def get_restaurant_detail(param):
    try:
        current_lang = request.args.get("lang", "vi")
        restaurant = None
        if param.isdigit(): restaurant = Restaurant.query.get(int(param))
        if not restaurant: restaurant = Restaurant.query.filter_by(place_id=param).first()
        if not restaurant: return jsonify({"error": "Not found"}), 404
        return jsonify(restaurant.to_dict(lang=current_lang))
    except Exception as e: return jsonify({"error": str(e)}), 500