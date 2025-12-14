import math
import requests
from flask import Blueprint, request, jsonify, current_app
from models import Restaurant
from sqlalchemy import or_

from recommendation_service import RecommendationService

LIMIT_RESTAURANTS = 50

restaurant_bp = Blueprint("restaurant_bp", __name__)
rec_service = RecommendationService()

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
    """
    Gọi Goong API để lấy tọa độ từ tên địa danh (Quận/Huyện)
    """
    try:
        # Lấy key từ config của Flask app (được set trong app.py)
        api_key = current_app.config.get('GOONG_API_KEY')

        if not api_key:
            print("Lỗi: Chưa cấu hình GOONG_API_KEY")
            return None

        # Thêm 'Hồ Chí Minh' hoặc 'Vietnam' để kết quả chính xác hơn
        full_query = f"{address_query}, Hồ Chí Minh, Việt Nam"

        base_url = "https://rsapi.goong.io/Geocode"
        params = {
            "address": full_query,
            "api_key": api_key
        }

        response = requests.get(base_url, params=params, timeout=5)
        data = response.json()

        if data.get("results"):
            location = data["results"][0]["geometry"]["location"]
            return location["lat"], location["lng"]

    except Exception as e:
        print(f"Lỗi Geocoding Goong: {e}")

    return None


@restaurant_bp.route("/api/search", methods=["GET"])
def search_restaurants():
    """
    Tìm kiếm nhà hàng (Filter & Radius)
    ---
    tags:
      - Restaurants
    parameters:
      - name: keyword
        in: query
        type: string
        description: Tên quán hoặc món ăn
      - name: district
        in: query
        type: string
        description:
      - name: radius
        in: query
        type: number
        description: Bán kính tìm kiếm (km) tính từ tâm Quận
      - name: minPrice
        in: query
        type: integer
        description: Giá thấp nhất
      - name: maxPrice
        in: query
        type: integer
        description: Giá cao nhất
      - name: foodType
        in: query
        type: string
        description: Loại món (food/beverage)
    responses:
      200:
        description: Danh sách nhà hàng tìm thấy
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: string
              name:
                type: string
              address:
                type: string
              price_level:
                type: integer
    """
    try:
        # 1. Lấy tham số User Profile
        keyword = request.args.get("keyword", "").strip()
        user_budget = request.args.get("maxPrice", type=int) # User Budget chính là maxPrice mong muốn
        flavors = request.args.get("flavors") # Danh sách tag sở thích
        
        # Các tham số lọc cứng (Hard Filters)
        districts = request.args.getlist("district")
        radius_km = request.args.get("radius", type=float)
        foodType = request.args.get("foodType")
        
        # Tạo User Profile dict để truyền vào service
        user_profile = {
            "keyword": keyword,
            "budget": user_budget,
            "flavors": flavors
        }

        # 2. Candidate Retrieval (Lọc thô từ DB)
        # CHÚ Ý: Ở bước này, ta KHÔNG lọc giá (Price) bằng SQL nữa để áp dụng Soft Constraint
        query = Restaurant.query

        # Lọc cơ bản (Hard Filter cho Loại món)
        if foodType and foodType != "both":
            query = query.filter(Restaurant.foodType == foodType)
            
        # [QUAN TRỌNG] Lọc không gian (Spatial Query)
        candidates = []
        
        # Case A: Có Radius -> Lấy tọa độ tâm -> Lọc khoảng cách
        if districts and radius_km:
            target_district = districts[0]
            center_coords = get_coords_from_goong(target_district)
            
            if center_coords:
                center_lat, center_lon = center_coords
                # Lấy toàn bộ quán trong quận (hoặc lân cận) ra để tính khoảng cách
                # Lưu ý: Nếu DB lớn, cần dùng PostGIS. Với SQLite/Dataset nhỏ, fetch all chấp nhận được.
                all_places = query.all() 
                
                for r in all_places:
                    if not r.latitude or not r.longitude: continue
                    try:
                        dist = haversine_distance(
                            center_lat, center_lon,
                            float(r.latitude), float(r.longitude)
                        )
                        if dist <= radius_km:
                            candidates.append(r)
                    except ValueError: continue
            else:
                # Fallback nếu không geocode được: Lọc theo tên quận
                candidates = query.filter(Restaurant.district.in_(districts)).all()
                
        # Case B: Chỉ lọc theo tên Quận
        elif districts:
            candidates = query.filter(Restaurant.district.in_(districts)).all()
            
        # Case C: Lấy tất cả (Cần limit để tránh quá tải nếu không có filter nào)
        else:
            candidates = query.limit(200).all() # Lấy tập mẫu lớn hơn LIMIT cuối cùng

        # 3. Scoring & Ranking (Tính điểm & Xếp hạng)
        scored_candidates = []
        
        for place in candidates:
            # Gọi thuật toán tính điểm
            score = rec_service.calculate_score(user_profile, place)
            
            # [Lọc nhiễu] Loại bỏ các quán có điểm quá thấp (< 0.3) [cite: 277]
            if score >= 0.3:
                # Chuyển object thành dict và gán thêm điểm để Frontend hiển thị
                place_dict = place.to_dict()
                place_dict['match_score'] = score 
                scored_candidates.append(place_dict)

        # Sắp xếp giảm dần theo điểm số (Relevance Ranking)
        scored_candidates.sort(key=lambda x: x['match_score'], reverse=True)

        # 4. Trả về Top N kết quả
        final_results = scored_candidates[:LIMIT_RESTAURANTS]

        return jsonify(final_results)

    except Exception as e:
        print(f"Search error: {e}")
        return jsonify({"error": "Lỗi server khi tìm kiếm"}), 500


@restaurant_bp.route("/api/restaurant/<param>", methods=["GET"])
def get_restaurant_detail(param):
    # (Giữ nguyên code cũ của hàm này)
    try:
        restaurant = None
        if param.isdigit():
            restaurant = Restaurant.query.get(int(param))
        if not restaurant:
            restaurant = Restaurant.query.filter_by(place_id=param).first()
        if not restaurant:
            return jsonify({"error": "Không tìm thấy nhà hàng"}), 404
        return jsonify(restaurant.to_dict())
    except Exception as e:
        print(f"Error getting restaurant detail: {e}")
        return jsonify({"error": str(e)}), 500
