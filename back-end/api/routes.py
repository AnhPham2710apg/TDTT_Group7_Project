# back-end/routes/restaurant_routes.py

import math
from flask import Blueprint, request, jsonify
from models import db, Restaurant
from sqlalchemy import or_

restaurant_bp = Blueprint('restaurant_bp', __name__)

# --- CẤU HÌNH TRỌNG SỐ (GIỮ NGUYÊN) ---
USER_WEIGHTS = {
    'balanced': {'price': 0.3, 'rate': 0.2, 'tag': 0.4},
    'saver':    {'price': 0.5, 'rate': 0.1, 'tag': 0.2},
    'foodie':   {'price': 0.1, 'rate': 0.4, 'tag': 0.4}
}

# Độ lệch chuẩn cho hàm Gaussian (Đơn vị: VNĐ)
# Kiểm soát độ dốc của việc trừ điểm khi vượt ngân sách.
# 50000 nghĩa là nếu vượt ngân sách 50k, điểm sẽ giảm đáng kể nhưng chưa về 0.
SIGMA = 50000 

def calculate_gaussian_decay(price, budget):
    """
    Hàm S_Price theo công thức Gaussian Decay trong báo cáo.
    """
    if price <= budget:
        return 1.0
    else:
        # Công thức: e ^ ( - (price - budget)^2 / (2 * sigma^2) )
        numerator = (price - budget) ** 2
        denominator = 2 * (SIGMA ** 2)
        return math.exp(-(numerator / denominator))

def get_price_score(restaurant, user_budget):
    """
    Tính điểm giá (S_Price).
    Input: user_budget (Mức chi trả tối đa mong muốn).
    """
    # Tính giá trung bình của quán để so sánh
    # Nếu dữ liệu thiếu, giả định giá mặc định là 50k
    min_p = restaurant.minPrice or 0
    max_p = restaurant.maxPrice or min_p
    
    # Lấy giá trung bình của quán làm đại diện (P_Price)
    avg_price = (min_p + max_p) / 2
    if avg_price == 0: avg_price = 50000 

    # Nếu user không set budget (None), coi như budget vô cực -> Điểm 1.0
    if user_budget is None or user_budget <= 0:
        return 1.0

    return calculate_gaussian_decay(avg_price, user_budget)

def get_rate_score(restaurant):
    """
    Tính điểm Rating (S_Rating).
    Công thức: CurrentRating / MaxScale (5.0)
    """
    r = restaurant.rating if restaurant.rating else 0
    # Chuẩn hóa về [0, 1]
    return r / 5.0

def get_tag_score(restaurant, user_cuisines, user_flavors, keyword):
    """
    Tính điểm Tag (S_Tag).
    Chuẩn hóa về đoạn [0, 1].
    """
    raw_score = 0.0
    max_possible_score = 10.0 # Quy ước thang điểm thô tối đa là 10
    
    # 1. Trùng Cuisine (+5)
    if restaurant.cuisine and user_cuisines and (restaurant.cuisine in user_cuisines):
        raw_score += 5.0
        
    # 2. Trùng Flavor (+3)
    if restaurant.flavor and user_flavors:
        db_flavors = [f.strip().lower() for f in restaurant.flavor.split(',')]
        req_flavors = [f.strip().lower() for f in user_flavors.split(',')]
        if set(db_flavors) & set(req_flavors):
            raw_score += 3.0

    # 3. Trùng Keyword (+2)
    if keyword:
        k = keyword.lower()
        name = restaurant.name.lower() if restaurant.name else ""
        desc = restaurant.description.lower() if restaurant.description else ""
        if k in name or k in desc:
            raw_score += 2.0
            
    # Chuẩn hóa về [0, 1]
    return min(raw_score, max_possible_score) / max_possible_score

def calculate_final_score(restaurant, user_type, user_prefs):
    """
    Tính tổng điểm trọng số.
    Score = (S_Price * W_p) + (S_Rate * W_r) + (S_Tag * W_t)
    Kết quả trả về thang điểm 100 cho đẹp (nhân 100).
    """
    weights = USER_WEIGHTS.get(user_type, USER_WEIGHTS['balanced'])
    
    # Lấy budget từ prefs để tính Gaussian
    budget = user_prefs.get('maxPrice')

    # Tính các điểm thành phần (đều nằm trong khoảng 0.0 -> 1.0)
    s_price = get_price_score(restaurant, budget)
    s_rate = get_rate_score(restaurant)
    s_tag = get_tag_score(
        restaurant, 
        user_prefs.get('cuisines', []), 
        user_prefs.get('flavors', ''),
        user_prefs.get('keyword', '')
    )
    
    # Tổng hợp
    final_score = (s_price * weights['price']) + \
                  (s_rate * weights['rate']) + \
                  (s_tag * weights['tag'])
                  
    # Nhân 100 để ra thang điểm phần trăm (dễ hiển thị UI)
    return round(final_score * 100, 2)


@restaurant_bp.route('/api/search', methods=['GET'])
def search_restaurants():
    try:
        # --- 1. NHẬN THAM SỐ ---
        keyword = request.args.get('keyword', '')
        user_type = request.args.get('userType', 'balanced')
        
        foodType = request.args.get('foodType') 
        cuisines = request.args.getlist('cuisine')
        flavors = request.args.get('flavors')
        districts = request.args.getlist('district')
        
        # User Budget dùng cho công thức Gaussian
        # Frontend cần gửi maxPrice đại diện cho "Ngân sách mong muốn"
        user_budget = request.args.get('maxPrice', type=int) 

        # --- 2. LỌC CỨNG (Pre-filtering) ---
        # Chỉ loại bỏ những quán sai lệch hoàn toàn (ví dụ: tìm món chay thì bỏ món mặn)
        # Không lọc giá ở bước này để hàm Gaussian tự xử lý
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

        if districts:
             query = query.filter(Restaurant.district.in_(districts))

        # Lấy tối đa 200 quán để tính toán
        raw_results = query.limit(200).all()

        # --- 3. TÍNH ĐIỂM CHI TIẾT ---
        user_prefs = {
            'cuisines': cuisines,
            'flavors': flavors,
            'keyword': keyword,
            'maxPrice': user_budget 
        }

        scored_results = []
        for r in raw_results:
            r_dict = r.to_dict()
            
            # Tính điểm
            score = calculate_final_score(r, user_type, user_prefs)
            r_dict['match_score'] = score
            
            # Thêm thông tin debug (tùy chọn, để bạn kiểm tra xem hàm đúng ko)
            # r_dict['debug_score'] = {
            #     'S_Price': get_price_score(r, user_budget),
            #     'S_Rate': get_rate_score(r),
            #     'UserType': user_type
            # }
            
            scored_results.append(r_dict)

        # Sắp xếp giảm dần
        scored_results.sort(key=lambda x: x['match_score'], reverse=True)

        return jsonify(scored_results[:50])

    except Exception as e:
        print(f"Search error: {e}")
        return jsonify({"error": "Lỗi server khi tính điểm Gaussian"}), 500

# API Detail giữ nguyên
@restaurant_bp.route('/api/restaurant/<param>', methods=['GET'])
def get_restaurant_detail(param):
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
        return jsonify({"error": str(e)}), 500