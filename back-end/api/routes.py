# back-end/routes/restaurant_routes.py
from flask import Blueprint, request, jsonify
from models import db, Restaurant
from sqlalchemy import or_, and_

restaurant_bp = Blueprint('restaurant_bp', __name__)

@restaurant_bp.route('/api/search', methods=['GET'])
def search_restaurants():
    try:
        # 1. Lấy tham số từ URL
        keyword = request.args.get('keyword')
        foodType = request.args.get('foodType') # chay/mặn/both
        beverageOrFood = request.args.get('beverageOrFood')
        
        # Xử lý mảng (URL params có thể là: cuisine=Viet&cuisine=Han)
        cuisines = request.args.getlist('cuisine') 
        flavors = request.args.get('flavors') # Nhận chuỗi "ngọt,mặn"
        districts = request.args.getlist('district')
        
        courseType = request.args.get('courseType')
        min_price = request.args.get('minPrice', type=int)
        max_price = request.args.get('maxPrice', type=int)
        
        # Bán kính (sẽ xử lý sau nếu có tính toán khoảng cách phức tạp)
        radius = request.args.get('radius', type=float) 
        
        # Rating
        rating_min = request.args.get('ratingMin', type=float)

        # 2. Xây dựng Query cơ bản
        query = Restaurant.query

        # 3. Áp dụng các bộ lọc (Dynamic Filtering)
        
        # -- Keyword (Tìm trong tên hoặc địa chỉ hoặc món) --
        if keyword:
            search_term = f"%{keyword}%"
            query = query.filter(or_(
                Restaurant.name.ilike(search_term),
                Restaurant.full_address.ilike(search_term),
                Restaurant.description.ilike(search_term)
            ))

        # -- Food Type --
        if foodType and foodType != 'both':
            query = query.filter(Restaurant.foodType == foodType)

        # -- Beverage or Food --
        if beverageOrFood and beverageOrFood != 'both':
             query = query.filter(Restaurant.bevFood == beverageOrFood)

        # -- Cuisine (Xử lý nhiều lựa chọn) --
        if cuisines:
            # Nếu trong DB lưu dạng "Vietnamese", nhưng user chọn nhiều
            # Ta dùng operator OR hoặc IN
            query = query.filter(Restaurant.cuisine.in_(cuisines))

        # -- Flavors (DB lưu "ngọt,mặn" dạng text, cần tìm like) --
        if flavors:
            flavor_list = flavors.split(',')
            # Tạo list các điều kiện LIKE
            conditions = [Restaurant.flavor.ilike(f"%{f}%") for f in flavor_list]
            query = query.filter(or_(*conditions))

        # -- District --
        if districts:
             query = query.filter(Restaurant.district.in_(districts))

        # -- Price Range --
        if min_price is not None:
            query = query.filter(Restaurant.minPrice >= min_price)
        if max_price is not None:
            query = query.filter(Restaurant.maxPrice <= max_price)

        # -- Rating --
        if rating_min is not None:
            query = query.filter(Restaurant.rating >= rating_min)

        # 4. Thực thi và trả về kết quả
        # Giới hạn 50 kết quả để tránh quá tải
        results = query.limit(50).all()
        
        return jsonify([r.to_dict() for r in results])

    except Exception as e:
        print(f"Search error: {e}")
        return jsonify({"error": "Lỗi server khi tìm kiếm"}), 500

@restaurant_bp.route('/api/restaurant/<param>', methods=['GET'])
def get_restaurant_detail(param):
    try:
        restaurant = None
        
        # 1. Thử tìm theo ID (nếu param là số)
        if param.isdigit():
            restaurant = Restaurant.query.get(int(param))
        
        # 2. Nếu không tìm thấy hoặc param là chuỗi -> Tìm theo place_id
        if not restaurant:
            restaurant = Restaurant.query.filter_by(place_id=param).first()

        # 3. Trả về kết quả
        if not restaurant:
            return jsonify({"error": "Không tìm thấy nhà hàng"}), 404
            
        return jsonify(restaurant.to_dict())
        
    except Exception as e:
        print(f"Error getting restaurant detail: {e}")
        return jsonify({"error": str(e)}), 500