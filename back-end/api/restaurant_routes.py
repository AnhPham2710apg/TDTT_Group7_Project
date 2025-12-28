import math
import requests
import unidecode 
from flask import Blueprint, request, jsonify, current_app
from models import Restaurant, db
from sqlalchemy import or_, func, text
from recommendation_service import RecommendationService

restaurant_bp = Blueprint("restaurant_bp", __name__)
rec_service = RecommendationService()

LIMIT_RESULTS = 50        
CANDIDATE_POOL_SIZE = 500 

# ==============================================================================
# TỪ ĐIỂN ÁNH XẠ MỞ RỘNG (SMART MAPPING)
# ==============================================================================
EXPANDED_SEARCH_MAP = {
    # --- NHÓM MÓN SỢI ---
    "noodle": ["bún", "mì", "phở", "hủ tiếu", "bánh canh", "miến", "nui", "cao lầu", "mì quảng"],
    "noodles": ["bún", "mì", "phở", "hủ tiếu", "bánh canh", "miến", "nui"], # Thêm số nhiều
    "beef noodle": ["bún bò", "phở bò", "hủ tiếu bò", "mì bò", "bánh canh bò"],
    "chicken noodle": ["bún gà", "phở gà", "miến gà", "hủ tiếu gà"],
    "fish noodle": ["bún cá", "bánh canh cá", "bún chả cá"],
    "crab noodle": ["bún riêu", "bánh canh cua", "bún mắm"],
    "pork noodle": ["hủ tiếu nam vang", "bún mọc", "bún thịt nướng"],

    # --- NHÓM CƠM ---
    "rice": ["cơm", "cháo", "xôi", "cơm tấm", "cơm niêu", "cơm chiên"],
    "broken rice": ["cơm tấm"],
    "chicken rice": ["cơm gà"],
    "fried rice": ["cơm chiên", "cơm rang"],
    "sticky rice": ["xôi"],
    
    # --- NHÓM BÁNH ---
    "bread": ["bánh mì"],
    "sandwich": ["bánh mì"],
    "pancake": ["bánh xèo", "bánh khọt"],
    "roll": ["gỏi cuốn", "chả giò", "bánh cuốn", "nem nướng"],
    "spring roll": ["gỏi cuốn", "chả giò", "nem rán"],
    "dumpling": ["sủi cảo", "há cảo", "bánh bao"],
    
    # --- NHÓM LẨU & NƯỚNG ---
    "hotpot": ["lẩu"],
    "steamboat": ["lẩu"],
    "bbq": ["nướng", "quay", "lò đất"],
    "grill": ["nướng"],
    
    # --- NHÓM PROTEIN ---
    "beef": ["bò", "bê"],
    "chicken": ["gà"],
    "pork": ["heo", "lợn", "sườn", "xá xíu"],
    "duck": ["vịt"],
    "fish": ["cá"],
    "seafood": ["hải sản", "ốc", "tôm", "cua", "ghẹ", "mực"],
    "snail": ["ốc"],
    
    # --- NHÓM ĐỒ UỐNG & TRÁNG MIỆNG ---
    "coffee": ["cà phê", "cafe", "bạc xỉu"],
    "tea": ["trà"],
    "milk tea": ["trà sữa"],
    "juice": ["nước ép", "sinh tố"],
    "dessert": ["tráng miệng", "chè", "kem", "tàu hũ"],
    "sweet": ["chè", "kem", "bánh"],
    
    # --- KHÁC ---
    "vegetarian": ["chay"],
    "vegan": ["chay"],
    "snack": ["ăn vặt", "bánh tráng"],
    "beer": ["bia", "quán nhậu"],

    # --- NHÓM KEM (Thêm mới) ---
    "ice cream": ["kem", "gelato", "kem bơ", "kem ý", "kem xôi"],
    "gelato": ["kem", "gelato"],
    "sorbet": ["kem", "kem trái cây"],
    "sundae": ["kem ly", "kem"],

    # --- NHÓM CHÈ (Thêm mới) ---
    "sweet soup": ["chè", "sâm bổ lượng", "tàu hũ", "khúc bạch"],
    "pudding": ["bánh flan", "pudding", "tàu hũ"], 
    # (Lưu ý: từ "dessert" cũ của bạn đã có "chè", nhưng user hay search cụ thể hơn)

    # --- NHÓM GỎI & CUỐN (Cập nhật) ---
    "salad": ["gỏi", "nộm", "salad", "rau trộn"], # Gỏi gà, gỏi ngó sen...
    "fresh roll": ["gỏi cuốn", "bì cuốn", "cuốn"], # Gỏi cuốn sống
    "summer roll": ["gỏi cuốn", "bì cuốn"],        # Tên tiếng Anh khác của gỏi cuốn
    "papaya salad": ["gỏi đu đủ", "gỏi khô bò"],   # Món phổ biến
    "mango salad": ["gỏi xoài"],

    # --- NHÓM SINH TỐ / HEALTHY (Bổ sung thêm nếu cần) ---
    "smoothie": ["sinh tố", "đá xay"],
    "yogurt": ["sữa chua", "yaourt"],
}

def generate_search_terms(keyword):
    """
    Tự động phát hiện và mở rộng từ khóa tiếng Anh sang tiếng Việt.
    Không cần check lang='en' để đảm bảo hệ thống chạy tốt kể cả khi FE quên gửi param lang.
    """
    if not keyword: return []
    
    # Luôn giữ lại keyword gốc
    terms = [keyword]
    kw_lower = keyword.lower().strip()

    # 1. Check khớp chính xác (Ưu tiên cao)
    if kw_lower in EXPANDED_SEARCH_MAP:
        terms.extend(EXPANDED_SEARCH_MAP[kw_lower])
        
    # 2. Check khớp từng phần (Partial Match)
    # Ví dụ: User nhập "spicy noodles" (có s) -> "noodle" nằm trong đó -> mở rộng ra bún/phở
    else:
        for key, values in EXPANDED_SEARCH_MAP.items():
            # Chỉ map nếu từ khóa trong từ điển (vd: "noodle") xuất hiện trong search của user ("noodles")
            # Và độ dài từ khóa > 2 để tránh map sai các từ quá ngắn
            if key in kw_lower and len(key) > 2: 
                    terms.extend(values)
    
    # Loại bỏ trùng lặp
    return list(set(terms))

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

@restaurant_bp.route("/api/search", methods=["GET"])    
def search_restaurants():
    try:
        # Kiểm tra xem đang chạy SQLite (Test) hay Postgres (Real)
        db_uri = current_app.config.get('SQLALCHEMY_DATABASE_URI', '')
        is_sqlite = 'sqlite' in db_uri

        # Chỉ bật extension unaccent nếu KHÔNG phải là SQLite
        if not is_sqlite:
            ensure_unaccent_extension()

        # 1. NHẬN THAM SỐ
        current_lang = request.args.get("lang", "vi")
        raw_keyword = request.args.get("keyword", "").strip()
        
        user_type = request.args.get('userType', 'balanced')
        user_budget_max = request.args.get('maxPrice', type=int)
        user_budget_min = request.args.get('minPrice', type=int)
        rating_min = request.args.get('ratingMin', type=float)
        
        raw_cuisines = request.args.getlist('cuisine')
        # Map sơ bộ cuisine nếu cần
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

        # 2. XÂY DỰNG QUERY
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

        # ======================================================================
        # [NÂNG CẤP] TÌM KIẾM THÔNG MINH (Bất chấp ngôn ngữ)
        # ======================================================================
        if raw_keyword:
            search_terms = generate_search_terms(raw_keyword)
            conditions = []
            
            for term in search_terms:
                term_like = f"%{term}%"
                
                # NẾU LÀ SQLITE (Test Mode)
                if is_sqlite:
                    conditions.append(Restaurant.name.ilike(term_like))
                    conditions.append(Restaurant.subtypes.ilike(term_like))
                    conditions.append(Restaurant.cuisine.ilike(term_like))
                    # Chỉ tìm địa chỉ với từ khóa gốc để tránh ra kết quả rác
                    if term == raw_keyword:
                        conditions.append(Restaurant.full_address.ilike(term_like))
                
                # NẾU LÀ POSTGRES (Real Mode)
                else:
                    conditions.append(func.unaccent(Restaurant.name).ilike(func.unaccent(term_like)))
                    conditions.append(func.unaccent(Restaurant.subtypes).ilike(func.unaccent(term_like)))
                    conditions.append(func.unaccent(Restaurant.cuisine).ilike(func.unaccent(term_like)))
                    # Chỉ tìm địa chỉ với từ khóa gốc
                    if term == raw_keyword:
                        conditions.append(func.unaccent(Restaurant.full_address).ilike(func.unaccent(term_like)))
            
            query = query.filter(or_(*conditions))

        # 3. THỰC THI & TÍNH ĐIỂM
        candidates = query.limit(CANDIDATE_POOL_SIZE).all()

        if districts and radius_km and center_coords:
            center_lat, center_lon = center_coords
            filtered_candidates = []
            for r in candidates:
                if r.latitude and r.longitude:
                    dist = haversine_distance(center_lat, center_lon, r.latitude, r.longitude)
                    if dist <= radius_km:
                        filtered_candidates.append(r)
            candidates = filtered_candidates

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
            current_dist = None
            if districts and radius_km and center_coords:
                center_lat, center_lon = center_coords
                if r.latitude and r.longitude:
                     current_dist = haversine_distance(center_lat, center_lon, r.latitude, r.longitude)

            current_prefs = user_prefs.copy()
            current_prefs['distance_km'] = current_dist
            current_prefs['max_radius'] = radius_km

            score = rec_service.calculate_final_score(r, user_type, current_prefs)
            
            if score > 0:
                r_dict = r.to_dict(lang=current_lang)
                r_dict['match_score'] = score
                r_dict['distance_km'] = round(current_dist, 2) if current_dist is not None else None
                scored_results.append(r_dict)

        scored_results.sort(key=lambda x: x['match_score'], reverse=True)
        return jsonify(scored_results[:LIMIT_RESULTS])

    except Exception as e:
        print(f"Search Error: {e}")
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