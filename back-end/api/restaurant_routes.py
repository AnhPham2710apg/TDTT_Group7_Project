import math
import requests
from flask import Blueprint, request, jsonify, current_app
from models import Restaurant, db
from sqlalchemy import or_
from recommendation_service import RecommendationService
from utils import check_is_open

restaurant_bp = Blueprint("restaurant_bp", __name__)
rec_service = RecommendationService()

# --- CẤU HÌNH GIỚI HẠN ---
LIMIT_RESULTS = 50        # Số lượng kết quả cuối cùng trả về cho Client
CANDIDATE_POOL_SIZE = 200 # Số lượng ứng viên lấy từ DB để tính điểm (Cần lớn hơn LIMIT_RESULTS)

# --- CÁC HÀM HỖ TRỢ ĐỊA LÝ (GEOGRAPHIC UTILS) ---
def haversine_distance(lat1, lon1, lat2, lon2):
    """Tính khoảng cách giữa 2 điểm (km)"""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2)**2 +
        math.cos(math.radians(lat1)) *
        math.cos(math.radians(lat2)) *
        math.sin(dlon / 2)**2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def get_coords_from_goong(address_query):
    """Gọi Goong API để lấy tọa độ từ tên địa danh"""
    try:
        api_key = current_app.config.get('GOONG_API_KEY')
        if not api_key:
            print("Warning: GOONG_API_KEY not found in config")
            return None

        full_query = f"{address_query}, Hồ Chí Minh, Việt Nam"
        base_url = "https://rsapi.goong.io/Geocode"
        params = {
            "address": full_query,
            "api_key": api_key
        }

        response = requests.get(base_url, params=params, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get("results"):
                location = data["results"][0]["geometry"]["location"]
                return location["lat"], location["lng"]
    except Exception as e:
        print(f"Goong Geocoding Error: {e}")
    
    return None

# --- API ENDPOINTS ---

@restaurant_bp.route("/api/search", methods=["GET"])
def search_restaurants():
    try:
        # --- 1. NHẬN THAM SỐ TỪ REQUEST ---
        current_lang = request.args.get("lang", "vi") # <--- Lấy ngôn ngữ

        keyword = request.args.get("keyword", "").strip()
        
        user_type = request.args.get('userType', 'balanced')
        user_budget = request.args.get('maxPrice', type=int)
        cuisines = request.args.getlist('cuisine')
        flavors = request.args.get('flavors')
        
        foodType = request.args.get('foodType')
        districts = request.args.getlist('district')
        radius_km = request.args.get("radius", type=float)

        # --- 2. LỌC ỨNG VIÊN (CANDIDATE RETRIEVAL) ---
        # Mục tiêu: Lấy ra một tập CANDIDATE_POOL_SIZE (200) quán tiềm năng nhất từ DB
        query = Restaurant.query

        if keyword:
            search_term = f"%{keyword}%"
            query = query.filter(or_(
                Restaurant.name.ilike(search_term),
                Restaurant.full_address.ilike(search_term),
                Restaurant.description.ilike(search_term)
            ))

        if foodType and foodType != 'both':
            query = query.filter(Restaurant.foodType == foodType)

        candidates = []

        # Xử lý Lọc Không Gian
        if districts and radius_km:
            target_district = districts[0]
            center_coords = get_coords_from_goong(target_district)
            
            if center_coords:
                center_lat, center_lon = center_coords
                # Lưu ý: Với production lớn, nên dùng PostGIS để query khoảng cách ngay trong SQL
                # Ở đây ta lấy hết candidate trong DB ra để lọc (chấp nhận được nếu DB nhỏ < vài nghìn record)
                raw_list = query.all()
                
                for r in raw_list:
                    if r.latitude and r.longitude:
                        try:
                            dist = haversine_distance(
                                center_lat, center_lon,
                                float(r.latitude), float(r.longitude)
                            )
                            if dist <= radius_km:
                                candidates.append(r)
                        except ValueError: continue
            else:
                candidates = query.filter(Restaurant.district.in_(districts)).all()

        elif districts:
            query = query.filter(Restaurant.district.in_(districts))
            candidates = query.limit(CANDIDATE_POOL_SIZE).all()

        else:
            candidates = query.limit(CANDIDATE_POOL_SIZE).all()

        # --- 3. TÍNH ĐIỂM CHI TIẾT (SCORING) ---
        user_prefs = {
            'cuisines': cuisines,
            'flavors': flavors,
            'keyword': keyword,
            'maxPrice': user_budget
        }

        scored_results = []
        for r in candidates:
            score = rec_service.calculate_final_score(r, user_type, user_prefs)
            
            if score > 0:
                # --- TRUYỀN NGÔN NGỮ VÀO to_dict ---
                r_dict = r.to_dict(lang=current_lang) 
                
                is_active = check_is_open(r.open_time, r.close_time)
                
                r_dict['is_open'] = is_active
                
                r_dict['match_score'] = score
                scored_results.append(r_dict)

        # --- 4. SẮP XẾP VÀ TRẢ VỀ (RANKING) ---
        # Sắp xếp giảm dần theo điểm
        scored_results.sort(key=lambda x: x['match_score'], reverse=True)

        # Trả về top LIMIT_RESULTS (50)
        return jsonify(scored_results[:LIMIT_RESULTS])

    except Exception as e:
        print(f"Search Error: {e}")
        return jsonify({"error": "Lỗi server khi tìm kiếm"}), 500


@restaurant_bp.route("/api/restaurant/<param>", methods=["GET"])
def get_restaurant_detail(param):
    try:
        # --- LẤY NGÔN NGỮ ---
        current_lang = request.args.get("lang", "vi")

        restaurant = None
        if param.isdigit():
            restaurant = Restaurant.query.get(int(param))
        if not restaurant:
            restaurant = Restaurant.query.filter_by(place_id=param).first()

        if not restaurant:
            return jsonify({"error": "Không tìm thấy nhà hàng"}), 404
            
        # --- TRUYỀN NGÔN NGỮ VÀO to_dict ---
        
        r_dict = restaurant.to_dict(lang=current_lang)
        
        r_dict['is_open'] = check_is_open(restaurant.open_time, restaurant.close_time)
        
        return jsonify(r_dict)
        
    except Exception as e:
        print(f"Detail Error: {e}")
        return jsonify({"error": str(e)}), 500