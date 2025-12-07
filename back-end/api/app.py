import sys
import os
import math
import json
import requests
import polyline
import uuid
from werkzeug.utils import secure_filename
from flask import Flask, request, jsonify
from flask_cors import CORS
from models import db, bcrypt, User, Favorite, RouteHistory, Review
from routes import restaurant_bp

current_file_path = os.path.abspath(__file__)

api_dir = os.path.dirname(current_file_path)

backend_dir = os.path.dirname(api_dir)

sys.path.append(api_dir)

app = Flask(__name__, static_folder='../static')

# --- CẤU HÌNH CORS CHUẨN (CHO PHÉP FRONTEND GỌI API) ---
# Danh sách các domain được phép gọi API này
allowed_origins = [
    "http://localhost:5173",  # Môi trường Dev (Vite mặc định)
    "http://localhost:3000",  # Môi trường Dev (React mặc định - phòng hờ)
    "http://localhost:8080",
    "https://ten-du-an-frontend-cua-ban.vercel.app" # <-- THAY LINK VERCEL CỦA BẠN VÀO ĐÂY SAU KHI DEPLOY
]

CORS(app, 
    resources={r"/api/*": {"origins": allowed_origins}}, # Chỉ áp dụng cho các route bắt đầu bằng /api/
    supports_credentials=True, # RẤT QUAN TRỌNG: Để cho phép gửi Cookie/Token xác thực
    allow_headers=["Content-Type", "Authorization"], # Các header được phép gửi
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"] # Các phương thức được phép
)

# --- CẤU HÌNH DATABASE THÔNG MINH ---
# Ưu tiên lấy từ biến môi trường của Render, nếu không có thì dùng local
database_url = os.environ.get('DATABASE_URL')

if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

DB_URI = database_url or "postgresql://postgres:271006@localhost:5432/user_data_db"

app.config['SQLALCHEMY_DATABASE_URI'] = DB_URI

# Cấu hình DB phụ (Nếu bạn dùng 1 DB cho cả 2 thì trỏ chung, hoặc tạo 2 DB trên Render)
# Để đơn giản tuần 1: Tạm thời trỏ chung vào DB chính để test trước
app.config['SQLALCHEMY_BINDS'] = {
    'restaurants_db': DB_URI 
}

# ---------------------------
# CẤU HÌNH POSTGRESQL
# ---------------------------
# Lưu ý: Thay '123456' bằng mật khẩu thật của bạn
DB_URI = "postgresql://postgres:271006@localhost:5432"

# Database chính (User, Lộ trình, Favorite)
app.config['SQLALCHEMY_DATABASE_URI'] = f"{DB_URI}/user_data_db"

# Database phụ (Nhà hàng)
app.config['SQLALCHEMY_BINDS'] = {
    'restaurants_db': f"{DB_URI}/restaurants_db"
}

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
bcrypt.init_app(app)

# Tự động tạo bảng nếu chưa có (Chạy 1 lần khi khởi động)
with app.app_context():
    db.create_all()
    print(">>> Đã kết nối PostgreSQL và kiểm tra bảng dữ liệu!")

# Đăng ký Blueprint (Module nhà hàng)
app.register_blueprint(restaurant_bp)

# ---------------------------
# CẤU HÌNH GOONG API
# ---------------------------
# 👇 HÃY ĐIỀN KEY CỦA BẠN VÀO ĐÂY
GOONG_SERVICE_KEY = "dnPxpjsLNg9w2cJtmtjZYgNmwbu2rIfGKUGadUxe" 
GOONG_BASE_URL = "https://rsapi.goong.io"

app.config['GOONG_API_KEY'] = GOONG_SERVICE_KEY

def goong_geocode_helper(query):
    if not query:
        return None
    try:
        params = {"address": query, "api_key": GOONG_SERVICE_KEY}
        r = requests.get(
            f"{GOONG_BASE_URL}/Geocode", params=params, timeout=10
        )
        data = r.json()
        if data.get("results"):
            loc = data["results"][0]["geometry"]["location"]
            return {"lat": loc["lat"], "lon": loc["lng"]}
    except Exception as e:
        print(f"Goong Geocode Error: {e}")
    return None

# CẤU HÌNH THƯ MỤC UPLOAD
# Ảnh sẽ được lưu vào thư mục: back-end/static/uploads
UPLOAD_FOLDER = os.path.join(backend_dir, 'static', 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
# Tạo thư mục nếu chưa có
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ---------------------------
# ROUTES: Auth & User
# ---------------------------
@app.route("/")
def hello():
    return "Hello, Food Tour Backend with PostgreSQL!"

@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 400
    new_user = User(username=username)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "User created", "user": new_user.to_dict()})

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        return jsonify({
            "message": "Login successful",
            "user": user.to_dict()
        })
    else:
        return jsonify({"error": "Invalid credentials"}), 401

# ---------------------------
# ROUTES: Favorites
# ---------------------------
@app.route("/api/favorite", methods=["POST"])
def add_favorite():
    data = request.get_json()
    username = data.get("username")
    place_id = data.get("place_id")
    if not username or not place_id:
        return jsonify({"error": "Thiếu thông tin"}), 400
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User 404"}), 404
    existing = Favorite.query.filter_by(
        user_id=user.id, place_id=place_id
    ).first()
    if existing:
        return jsonify({"error": "Đã tồn tại"}), 400
    new_fav = Favorite(user_id=user.id, place_id=place_id)
    db.session.add(new_fav)
    db.session.commit()
    return jsonify({"message": "Đã thêm favorite"})

@app.route("/api/favorite/<username>", methods=["GET"])
def get_favorites(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User 404"}), 404
    fav_list = Favorite.query.filter_by(user_id=user.id).all()
    places = [f.place_id for f in fav_list]
    return jsonify({"username": username, "favorites": places})

@app.route("/api/favorite", methods=["DELETE"])
def remove_favorite():
    data = request.get_json()
    username = data.get("username")
    place_id = data.get("place_id")
    if not username or not place_id:
        return jsonify({"error": "Thiếu thông tin"}), 400
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User 404"}), 404
    fav = Favorite.query.filter_by(
        user_id=user.id, place_id=place_id
    ).first()
    if not fav:
        return jsonify({"message": "Không tìm thấy để xóa"}), 404
    db.session.delete(fav)
    db.session.commit()
    return jsonify({"message": "Đã xóa favorite"})

# ---------------------------
# ROUTES: Map / Geocoding / Routing
# ---------------------------
@app.route("/api/geocode", methods=["POST"])
def geocode():
    query = request.json.get("query")
    coords = goong_geocode_helper(query)
    if coords:
        return jsonify(coords)
    return jsonify({"error": "Không tìm thấy địa điểm"}), 404

@app.route("/api/reverse")
def reverse_geocode():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    if not lat or not lon:
        return jsonify({"error": "Missing params"}), 400
    try:
        params = {"latlng": f"{lat},{lon}", "api_key": GOONG_SERVICE_KEY}
        r = requests.get(
            f"{GOONG_BASE_URL}/Geocode", params=params, timeout=10
        )
        data = r.json()
        if data.get("results"):
            return jsonify({
                "display_name": data["results"][0]["formatted_address"]
            })
        return jsonify({"error": "No address found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/route", methods=["POST"])
def route():
    data = request.get_json() or {}
    points = data.get("points")
    vehicle = data.get("vehicle", "car")
    if not points or len(points) < 2:
        return jsonify({"error": "Need at least 2 points"}), 400
    
    origin = f"{points[0][0]},{points[0][1]}"
    destination = f"{points[-1][0]},{points[-1][1]}"
    waypoints_str = ""
    if len(points) > 2:
        waypoints_str = "|".join([f"{p[0]},{p[1]}" for p in points[1:-1]])
    
    params = {
        "origin": origin, "destination": destination,
        "vehicle": vehicle, "api_key": GOONG_SERVICE_KEY
    }
    if waypoints_str:
        params["waypoints"] = waypoints_str

    try:
        r = requests.get(f"{GOONG_BASE_URL}/Direction", params=params, timeout=10)
        data = r.json()
        if not data.get("routes"):
            return jsonify({"error": "No route"}), 404
        
        route_obj = data["routes"][0]
        encoded_polyline = route_obj["overview_polyline"]["points"]
        total_dist = sum(leg["distance"]["value"] for leg in route_obj["legs"])
        total_dur = sum(leg["duration"]["value"] for leg in route_obj["legs"])
        
        return jsonify({
            "routes": [{
                "polyline_encoded": encoded_polyline,
                "distance": total_dist,
                "duration": total_dur
            }]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/places/coords", methods=["POST"])
def places_coords():
    place_ids = request.json.get("places", [])
    coords = []
    for pid in place_ids:
        res = goong_geocode_helper(pid)
        if res:
            coords.append({"id": pid, "lat": res["lat"], "lon": res["lon"]})
    return jsonify({"coords": coords})


def are_places_equal(places_A, places_B):
    # Lấy ra tập hợp tên các địa điểm (để so sánh không quan tâm thứ tự)
    # Lưu ý: Cách này giả định tên địa điểm là duy nhất. 
    # Tốt hơn là so sánh tọa độ (lat/lon) nhưng so sánh float rất khó chính xác tuyệt đối.
    names_A = set(p['name'] for p in places_A)
    names_B = set(p['name'] for p in places_B)
    return names_A == names_B
# ---------------------------
# ROUTES: Optimize & History
# ---------------------------
@app.route("/api/optimize", methods=["POST"])
def optimize():
    data = request.get_json()
    start_query = data.get("starting_point")
    places_data = data.get("places", [])
    use_manual_order = data.get("use_manual_order", False)
    
    # Lọc sơ bộ những lộ trình có cùng điểm xuất phát (để đỡ phải loop nhiều)
    potential_routes = RouteHistory.query.filter(
        RouteHistory.start_point.ilike(start_query) # ilike là so sánh không phân biệt hoa thường
    ).all()

    for r in potential_routes:
        try:
            stored_places = json.loads(r.places_json)
            if are_places_equal(places_data, stored_places):
                print(f">>> CACHE HIT! Tìm thấy lộ trình ID: {r.id}")
                
                # --- [SỬA ĐOẠN NÀY] ---
                # Mặc định gọi API Geocode nếu không lấy được từ polyline
                real_start_coords = None

                # 1. Thử lấy tọa độ đầu tiên từ chuỗi Polyline (Nhanh nhất, 0đ)
                if r.polyline_outbound:
                    try:
                        decoded = polyline.decode(r.polyline_outbound)
                        if decoded and len(decoded) > 0:
                            # decoded[0] là (lat, lon) của điểm đầu tiên
                            real_start_coords = {"lat": decoded[0][0], "lon": decoded[0][1]}
                    except Exception as e:
                        print(f"Lỗi decode polyline: {e}")

                # 2. Nếu không có polyline (data cũ), thì đành gọi API Geocode (Tốn 1 request)
                if not real_start_coords:
                    print(">>> Cache cũ thiếu polyline, gọi Geocode bổ sung...")
                    real_start_coords = goong_geocode_helper(start_query)
                    
                    # Nếu vẫn không tìm thấy thì fallback về 0,0 (chấp nhận lỗi hiển thị còn hơn lỗi app)
                    if not real_start_coords:
                         real_start_coords = {"lat": 0, "lon": 0}

                # Trả về kết quả
                return jsonify({
                    "optimized_order": [p["name"] for p in stored_places],
                    "distance_km": r.total_distance,
                    "duration_min": r.total_duration,
                    "polyline_outbound": r.polyline_outbound,
                    "polyline_return": r.polyline_return,
                    
                    # Trả về tọa độ xịn vừa lấy được
                    "start_point_coords": real_start_coords,
                    
                    "waypoints": [
                        {"id": p["name"], "address": p["address"], "lat": p.get("lat"), "lon": p.get("lng")} 
                        for p in stored_places
                    ],
                    "from_cache": True
                })
                # ----------------------
        except Exception as e:
            print(f"Lỗi check cache lộ trình {r.id}: {e}")
            continue
            
    # ---------------------------------------------------------
    # 2. NẾU KHÔNG TÌM THẤY -> CHẠY LOGIC CŨ (GỌI GOONG)
    # ---------------------------------------------------------
    print(">>> CACHE MISS. Đang gọi Goong API...")

    start_coords = goong_geocode_helper(start_query)
    if not start_coords:
        return jsonify({"error": "Không tìm thấy vị trí bắt đầu"}), 400

    start_tuple = (start_coords["lat"], start_coords["lon"])

    points_to_visit = []
    for place in places_data:
        p_lat, p_lon = None, None
        if place.get("lat") and place.get("lng"):
            p_lat, p_lon = float(place["lat"]), float(place["lng"])
        elif place.get("address"):
            res = goong_geocode_helper(place["address"])
            if res:
                p_lat, p_lon = res["lat"], res["lon"]

        if p_lat is not None:
            points_to_visit.append({
                "id": place.get("name", "Unknown"),
                "address": place.get("address", ""),
                "lat": p_lat, "lon": p_lon
            })

    if not points_to_visit:
        return jsonify({"error": "Không có điểm đến hợp lệ"}), 400

    visited_ordered = []
    if use_manual_order:
        visited_ordered = points_to_visit
    else:
        current_pos = start_tuple
        remaining = points_to_visit.copy()
        while remaining:
            nearest = min(
                remaining,
                key=lambda p: math.sqrt((p["lat"] - current_pos[0])**2 + (p["lon"] - current_pos[1])**2)
            )
            visited_ordered.append(nearest)
            current_pos = (nearest["lat"], nearest["lon"])
            remaining.remove(nearest)

    route_sequence = [start_tuple]
    for p in visited_ordered:
        route_sequence.append((p['lat'], p['lon']))
    route_sequence.append(start_tuple)

    outbound_coords = []
    return_coords = []
    total_distance = 0
    total_duration = 0
    last_stop_index = len(route_sequence) - 2

    for i in range(len(route_sequence) - 1):
        origin = route_sequence[i]
        destination = route_sequence[i+1]
        params = {
            "origin": f"{origin[0]},{origin[1]}",
            "destination": f"{destination[0]},{destination[1]}",
            "vehicle": "car",
            "api_key": GOONG_SERVICE_KEY
        }
        try:
            r = requests.get(f"{GOONG_BASE_URL}/Direction", params=params, timeout=10)
            r_data = r.json()
            if r_data.get("routes"):
                leg_route = r_data["routes"][0]
                total_distance += leg_route["legs"][0]["distance"]["value"]
                total_duration += leg_route["legs"][0]["duration"]["value"]
                leg_coords = polyline.decode(leg_route["overview_polyline"]["points"])
                if i == last_stop_index:
                    return_coords.extend(leg_coords)
                else:
                    outbound_coords.extend(leg_coords)
        except Exception as e:
            print(f"Error leg {i}: {e}")

    encoded_outbound = polyline.encode(outbound_coords)
    encoded_return = polyline.encode(return_coords)

    return jsonify({
        "optimized_order": [p["id"] for p in visited_ordered],
        "distance_km": total_distance / 1000,
        "duration_min": total_duration / 60,
        "polyline_outbound": encoded_outbound,
        "polyline_return": encoded_return,
        "start_point_coords": {"lat": start_coords["lat"], "lon": start_coords["lon"]},
        "waypoints": visited_ordered
    })

@app.route("/api/routes", methods=["POST"])
def save_route():
    data = request.get_json()
    username = data.get("username")
    start_point = data.get("start_point")
    places = data.get("places")
    
    # --- NHẬN 2 POLYLINE TỪ FRONTEND ---
    # Frontend phải gửi lên 2 trường này sau khi có kết quả từ API optimize
    poly_out = data.get("polyline_outbound", "") 
    poly_ret = data.get("polyline_return", "")
    # -----------------------------------
    
    dist = data.get("distance", 0.0)
    dur = data.get("duration", 0.0)

    if not username or not start_point or not places:
        return jsonify({"error": "Thiếu thông tin"}), 400

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User không tồn tại"}), 404

    route_name = f"Lộ trình {len(places)} điểm từ {start_point[:20]}..."

    new_route = RouteHistory(
        user_id=user.id,
        name=route_name,
        start_point=start_point,
        places_json=json.dumps(places),
        
        # --- LƯU VÀO DB ---
        polyline_outbound=poly_out,
        polyline_return=poly_ret,
        # ------------------
        
        total_distance=dist,
        total_duration=dur
    )

    db.session.add(new_route)
    db.session.commit()

    return jsonify({
        "message": "Đã lưu lộ trình",
        "route": new_route.to_dict()
    })

@app.route("/api/routes/<username>", methods=["GET"])
def get_user_routes(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User không tồn tại"}), 404
    routes = RouteHistory.query.filter_by(user_id=user.id).order_by(
        RouteHistory.created_at.desc()
    ).all()
    return jsonify([r.to_dict() for r in routes])

@app.route("/api/routes/<int:route_id>", methods=["DELETE"])
def delete_route(route_id):
    try:
        route = RouteHistory.query.get(route_id)
        if not route:
            return jsonify({"error": "Lộ trình không tồn tại"}), 404
        db.session.delete(route)
        db.session.commit()
        return jsonify({"message": "Đã xóa lộ trình thành công"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Lỗi server khi xóa"}), 500

@app.route("/api/routes/<int:route_id>", methods=["PUT"])
def update_route_name(route_id):
    try:
        data = request.get_json()
        new_name = data.get("name")
        if not new_name:
            return jsonify({"error": "Tên không được để trống"}), 400
        route = RouteHistory.query.get(route_id)
        if not route:
            return jsonify({"error": "Lộ trình không tồn tại"}), 404
        route.name = new_name
        db.session.commit()
        return jsonify({"message": "Đã đổi tên thành công", "route": route.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Lỗi server khi cập nhật"}), 500

# 1. Lấy danh sách review của một nhà hàng
@app.route("/api/reviews/<place_id>", methods=["GET"])
def get_reviews(place_id):
    try:
        # Sắp xếp mới nhất lên đầu
        reviews = Review.query.filter_by(place_id=place_id).order_by(Review.created_at.desc()).all()
        return jsonify([r.to_dict() for r in reviews])
    except Exception as e:
        print(f"Error fetching reviews: {e}")
        return jsonify({"error": "Lỗi server"}), 500

# 2. Đăng review mới
@app.route("/api/reviews", methods=["POST"])
def add_review():
    try:
        # Khi gửi file, dữ liệu text nằm trong request.form, file nằm trong request.files
        username = request.form.get("username")
        place_id = request.form.get("place_id")
        rating = request.form.get("rating")
        comment = request.form.get("comment")
        
        # Lấy danh sách file (key là 'images')
        files = request.files.getlist('images')

        if not username or not place_id or not rating:
            return jsonify({"error": "Thiếu thông tin bắt buộc"}), 400

        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({"error": "Vui lòng đăng nhập"}), 401
            
        # --- XỬ LÝ LƯU ẢNH ---
        saved_filenames = []
        
        # Kiểm tra số lượng ảnh (Backend check thêm cho chắc)
        if len(files) > 10:
             return jsonify({"error": "Chỉ được đăng tối đa 10 ảnh"}), 400

        for file in files:
            if file and allowed_file(file.filename):
                # Tạo tên file độc nhất để tránh trùng lặp
                ext = file.filename.rsplit('.', 1)[1].lower()
                unique_filename = f"{uuid.uuid4().hex}.{ext}"
                
                # Lưu file vào ổ cứng server
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                file.save(file_path)
                
                # Tạo đường dẫn URL để frontend truy cập
                # Ví dụ: http://localhost:5000/static/uploads/abc.jpg
                full_url = request.host_url + 'static/uploads/' + unique_filename
                saved_filenames.append(full_url)

        # Lưu vào DB
        new_review = Review(
            user_id=user.id,
            place_id=place_id,
            rating=int(rating),
            comment=comment,
            images=json.dumps(saved_filenames) # Chuyển list thành chuỗi JSON
        )

        db.session.add(new_review)
        db.session.commit()

        return jsonify({"message": "Đánh giá thành công", "review": new_review.to_dict()})

    except Exception as e:
        print(f"Error adding review: {e}")
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
# 3. Lấy danh sách review của một USER cụ thể (Cho trang Profile)
@app.route("/api/user/<username>/reviews", methods=["GET"])
def get_user_reviews(username):
    try:
        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({"error": "User không tồn tại"}), 404
            
        # Lấy tất cả review của user này, mới nhất lên đầu
        reviews = Review.query.filter_by(user_id=user.id).order_by(Review.created_at.desc()).all()
        return jsonify([r.to_dict() for r in reviews])
    except Exception as e:
        print(f"Error fetching user reviews: {e}")
        return jsonify({"error": "Lỗi server"}), 500

# 4. Xóa một review cụ thể
@app.route("/api/reviews/<int:review_id>", methods=["DELETE"])
def delete_review(review_id):
    try:
        review = Review.query.get(review_id)
        if not review:
            return jsonify({"error": "Review không tồn tại"}), 404
            
        # (Tùy chọn) Kiểm tra quyền sở hữu: Ở đây ta tin tưởng frontend gửi request đúng
        # Trong thực tế nên check session user có trùng review.user_id không
        
        db.session.delete(review)
        db.session.commit()
        return jsonify({"message": "Đã xóa bài đánh giá"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Lỗi server khi xóa review"}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)