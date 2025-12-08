import math
import requests
from flask import Blueprint, request, jsonify, current_app
from models import Restaurant
from sqlalchemy import or_

LIMIT_RESTAURANTS = 50

restaurant_bp = Blueprint("restaurant_bp", __name__)

# --- CẤU HÌNH ---
# Bạn nên đảm bảo GOONG_API_KEY đã được config trong app.py
# hoặc lấy từ biến môi trường.
# Ở đây mình sẽ lấy từ current_app.config.
# Hoặc tạm thời bạn có thể paste key trực tiếp vào đây để test:
# GOONG_API_KEY = "YOUR_GOONG_API_KEY"


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
        # 1. Lấy tham số
        keyword = request.args.get("keyword")
        foodType = request.args.get("foodType")
        beverageOrFood = request.args.get("beverageOrFood")
        cuisines = request.args.getlist("cuisine")
        flavors = request.args.get("flavors")
        districts = request.args.getlist("district")

        # Radius (km)
        radius_km = request.args.get("radius", type=float)

        min_price = request.args.get("minPrice", type=int)
        max_price = request.args.get("maxPrice", type=int)
        rating_min = request.args.get("ratingMin", type=float)

        # 2. Query cơ bản
        query = Restaurant.query

        # 3. Apply Filters (SQL)
        if keyword:
            search_term = f"%{keyword}%"
            query = query.filter(
                or_(
                    Restaurant.name.ilike(search_term),
                    Restaurant.full_address.ilike(search_term),
                    Restaurant.description.ilike(search_term),
                )
            )

        if foodType and foodType != "both":
            query = query.filter(Restaurant.foodType == foodType)

        if beverageOrFood and beverageOrFood != "both":
            query = query.filter(Restaurant.bevFood == beverageOrFood)

        if cuisines:
            query = query.filter(Restaurant.cuisine.in_(cuisines))

        if flavors:
            flavor_list = flavors.split(",")
            match_conditions = [
                Restaurant.flavor.ilike(f"%{f}%") for f in flavor_list
            ]
            empty_conditions = [
                Restaurant.flavor == "[]",
                Restaurant.flavor.is_(None),
                Restaurant.flavor == "",
            ]
            query = query.filter(or_(*match_conditions, *empty_conditions))

        if min_price is not None:
            query = query.filter(Restaurant.minPrice >= min_price)
        if max_price is not None:
            query = query.filter(Restaurant.maxPrice <= max_price)
        if rating_min is not None:
            query = query.filter(Restaurant.rating >= rating_min)

        # --- LOGIC MỚI: Dùng API lấy tọa độ Quận ---

        # Case A: Chỉ lọc theo tên Quận (Không Radius) -> Logic cũ
        if districts and not radius_km:
            query = query.filter(Restaurant.district.in_(districts))
            results = query.limit(LIMIT_RESTAURANTS).all()

        # Case B: Có Radius -> Gọi API lấy tâm Quận -> Tính khoảng cách
        elif districts and radius_km:
            target_district = districts[0]

            center_coords = get_coords_from_goong(target_district)

            if not center_coords:
                print(f"Không tìm thấy tọa độ cho: {target_district}")
                query = query.filter(Restaurant.district.in_(districts))
                results = query.limit(LIMIT_RESTAURANTS).all()
            else:
                center_lat, center_lon = center_coords

                candidates = query.all() # Lấy hết ra để tính toán
                results = []

                for r in candidates:
                    if not r.latitude or not r.longitude:
                        continue
                    try:
                        dist = haversine_distance(
                            center_lat, center_lon,
                            float(r.latitude), float(r.longitude)
                        )
                        if dist <= radius_km:
                            results.append(r)
                    except ValueError:
                        continue
                
                # --- SỬA LỖI TẠI ĐÂY ---
                # Cắt danh sách kết quả chỉ lấy đúng số lượng LIMIT
                results = results[:LIMIT_RESTAURANTS]

        # Case C: Không lọc địa điểm
        else:
            results = query.limit(LIMIT_RESTAURANTS).all()

        # Nếu results là list objects (SQLAlchemy Models)
        final_data = []
        for r in results:
            if isinstance(r, Restaurant):
                final_data.append(r.to_dict())
            else:
                final_data.append(r)  # Đã là dict rồi

        return jsonify(final_data)

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
