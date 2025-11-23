import sys
import os
import polyline # Cần: pip install polyline
import requests
import math 

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify
from flask_cors import CORS
from models import db, bcrypt, User, Favorite
from routes import restaurant_bp 

app = Flask(__name__)
CORS(app)

# --- CẤU HÌNH DATABASE ---
current_dir = os.path.abspath(os.path.dirname(__file__))
db_dir = os.path.join(os.path.dirname(current_dir), "db")
os.makedirs(db_dir, exist_ok=True)
user_db_path = os.path.join(db_dir, "database.db")
restaurant_db_path = os.path.join(db_dir, "restaurants_processed.db")

app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{user_db_path}"
app.config['SQLALCHEMY_BINDS'] = {'restaurants_db': f"sqlite:///{restaurant_db_path}"}

db.init_app(app)
bcrypt.init_app(app)
with app.app_context():
    db.create_all()

app.register_blueprint(restaurant_bp)

# ---------------------------
# CẤU HÌNH GOONG API 
# ---------------------------
# LƯU Ý: Đây là SERVICE KEY (dùng cho backend), không phải Map Key
# Key này dùng cho Directions, Distance Matrix, Geocoding
GOONG_SERVICE_KEY = "YOUR_SERVICE_API_KEY"  #!!! THAY BẰNG SERVICE KEY CỦA BẠN
GOONG_BASE_URL = "https://rsapi.goong.io"

def goong_geocode_helper(query):
    if not query: return None
    try:
        params = {"address": query, "api_key": GOONG_SERVICE_KEY}
        r = requests.get(f"{GOONG_BASE_URL}/Geocode", params=params, timeout=10)
        data = r.json()
        if data.get("results"):
            loc = data["results"][0]["geometry"]["location"]
            return {"lat": loc["lat"], "lon": loc["lng"]}
    except Exception as e:
        print(f"Goong Geocode Error: {e}")
    return None

# ---------------------------
# 4️⃣ Auth & Favorite Routes
# ---------------------------
@app.route("/")
def hello():
    return "Hello, Food Tour Backend with Goong Map!"

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
        return jsonify({"message": "Login successful", "user": user.to_dict()})
    else:
        return jsonify({"error": "Invalid credentials"}), 401

@app.route("/api/favorite", methods=["POST"])
def add_favorite():
    data = request.get_json()
    username = data.get("username")
    place_id = data.get("place_id")
    if not username or not place_id:
        return jsonify({"error": "Thiếu thông tin"}), 400
    user = User.query.filter_by(username=username).first()
    if not user: return jsonify({"error": "User 404"}), 404
    existing = Favorite.query.filter_by(user_id=user.id, place_id=place_id).first()
    if existing: return jsonify({"error": "Đã tồn tại"}), 400
    new_fav = Favorite(user_id=user.id, place_id=place_id)
    db.session.add(new_fav)
    db.session.commit()
    return jsonify({"message": "Đã thêm favorite"})

@app.route("/api/favorite/<username>", methods=["GET"])
def get_favorites(username):
    user = User.query.filter_by(username=username).first()
    if not user: return jsonify({"error": "User 404"}), 404
    fav_list = Favorite.query.filter_by(user_id=user.id).all()
    places = [f.place_id for f in fav_list]
    return jsonify({"username": username, "favorites": places})

@app.route("/api/favorite", methods=["DELETE"])
def remove_favorite():
    data = request.get_json()
    username = data.get("username")
    place_id = data.get("place_id")
    if not username or not place_id: return jsonify({"error": "Thiếu thông tin"}), 400
    user = User.query.filter_by(username=username).first()
    if not user: return jsonify({"error": "User 404"}), 404
    fav = Favorite.query.filter_by(user_id=user.id, place_id=place_id).first()
    if not fav: return jsonify({"message": "Không tìm thấy để xóa"}), 404
    db.session.delete(fav)
    db.session.commit()
    return jsonify({"message": "Đã xóa favorite"})

# ---------------------------
# 5️⃣ Map / Geocoding / Routing (GOONG)
# ---------------------------

# 5.1 Geocode (Forward)
@app.route("/api/geocode", methods=["POST"])
def geocode():
    query = request.json.get("query")
    coords = goong_geocode_helper(query)
    if coords:
        return jsonify(coords)
    return jsonify({"error": "Không tìm thấy địa điểm"}), 404

# 5.2 Reverse Geocode
@app.route("/api/reverse")
def reverse_geocode():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    if not lat or not lon: return jsonify({"error": "Missing params"}), 400
    
    try:
        params = {"latlng": f"{lat},{lon}", "api_key": GOONG_SERVICE_KEY}
        r = requests.get(f"{GOONG_BASE_URL}/Geocode", params=params, timeout=10)
        data = r.json()
        if data.get("results"):
            return jsonify({"display_name": data["results"][0]["formatted_address"]})
        return jsonify({"error": "No address found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 5.3 Routing (Simple between points)
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
    if waypoints_str: params["waypoints"] = waypoints_str

    try:
        r = requests.get(f"{GOONG_BASE_URL}/Direction", params=params, timeout=10)
        data = r.json()
        if not data.get("routes"): return jsonify({"error": "No route"}), 404
        
        route_obj = data["routes"][0]
        
        encoded_polyline = route_obj["overview_polyline"]["points"]

        return jsonify({
            "routes": [{
                "polyline_encoded": encoded_polyline, 
                "distance": sum(leg["distance"]["value"] for leg in route_obj["legs"]), # Sửa: Cộng tổng các leg
                "duration": sum(leg["duration"]["value"] for leg in route_obj["legs"])  # Sửa: Cộng tổng các leg
            }]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 5.4 Batch Geocode
@app.route("/api/places/coords", methods=["POST"])
def places_coords():
    place_ids = request.json.get("places", [])
    coords = []
    for pid in place_ids:
        res = goong_geocode_helper(pid)
        if res:
            coords.append({"id": pid, "lat": res["lat"], "lon": res["lon"]})
    return jsonify({"coords": coords})

# ---------------------------
# 6️⃣ OPTIMIZE ROUTE (ROUND TRIP & WAYPOINTS)
# ---------------------------
@app.route("/api/optimize", methods=["POST"])
def optimize():
    data = request.get_json()
    start_query = data.get("starting_point")
    places_data = data.get("places", []) 

    # 1. Geocode điểm bắt đầu
    start_coords = goong_geocode_helper(start_query)
    if not start_coords:
        return jsonify({"error": "Không tìm thấy vị trí bắt đầu"}), 400
    
    start_tuple = (start_coords["lat"], start_coords["lon"]) 

    # 2. Chuẩn bị danh sách điểm đến
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

    # 3. Thuật toán tham lam (Nearest Neighbor)
    visited_ordered = []
    current_pos = start_tuple
    remaining = points_to_visit.copy()

    while remaining:
        nearest = min(remaining, key=lambda p: math.sqrt((p["lat"] - current_pos[0])**2 + (p["lon"] - current_pos[1])**2))
        visited_ordered.append(nearest)
        current_pos = (nearest["lat"], nearest["lon"])
        remaining.remove(nearest)

    # 4. Chia nhỏ và gọi API (Manual Chaining)
    # Route sequence: Start -> P1 -> P2 -> ... -> Pn -> Start
    route_sequence = [start_tuple] 
    for p in visited_ordered:
        route_sequence.append((p['lat'], p['lon']))
    route_sequence.append(start_tuple) 

    outbound_coords = [] # Tọa độ chiều đi (Màu xanh)
    return_coords = []   # Tọa độ chiều về (Màu cam)
    
    total_distance = 0
    total_duration = 0

    # Index của điểm cuối cùng trước khi quay về
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

                # Giải mã
                leg_polyline_str = leg_route["overview_polyline"]["points"]
                leg_coords = polyline.decode(leg_polyline_str)
                
                # Phân loại tọa độ vào Chiều Đi hay Chiều Về
                # Chặng cuối cùng (i == last_stop_index) là chiều về
                if i == last_stop_index:
                    return_coords.extend(leg_coords)
                else:
                    outbound_coords.extend(leg_coords)
                    
        except Exception as e:
            print(f"Error leg {i}: {e}")

    # 5. Mã hóa riêng biệt 2 đoạn đường
    encoded_outbound = polyline.encode(outbound_coords)
    encoded_return = polyline.encode(return_coords)

    return jsonify({
        "optimized_order": [p["id"] for p in visited_ordered],
        "distance_km": total_distance / 1000,
        "duration_min": total_duration / 60,
        
        # Trả về 2 chuỗi riêng biệt
        "polyline_outbound": encoded_outbound, 
        "polyline_return": encoded_return,
        
        "start_point_coords": {"lat": start_coords["lat"], "lon": start_coords["lon"]},
        "waypoints": visited_ordered
    })
    
if __name__ == "__main__":
    app.run(debug=True, port=5000)