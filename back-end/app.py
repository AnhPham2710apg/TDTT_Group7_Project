# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
from models import db, bcrypt, User, Favorite
from urllib.parse import quote_plus

# ---------------------------
# 1️⃣ Khởi tạo app
# ---------------------------
app = Flask(__name__)
CORS(app)

# ---------------------------
# 2️⃣ DB config (giữ nguyên từ bạn)
# ---------------------------
basedir = os.path.abspath(os.path.dirname(__file__))
db_dir = os.path.join(basedir, "db")
os.makedirs(db_dir, exist_ok=True)

db_path = os.path.join(db_dir, "database.db")
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{db_path}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
bcrypt.init_app(app)

with app.app_context():
    db.create_all()

# ---------------------------
# 3️⃣ Utility: HTTP session với headers cho Nominatim/OSM
# ---------------------------
# IMPORTANT: Nominatim yêu cầu User-Agent/Referer rõ ràng (không dùng agent mặc định).
DEFAULT_HEADERS = {
    "User-Agent": "FoodTourApp/1.0 (your-email@example.com)",  # đổi thành thông tin app/email của bạn
    "Accept": "application/json"
}

OSRM_BASE = "https://router.project-osrm.org"  # public demo OSRM (dev/demo only)
NOMINATIM_BASE = "https://nominatim.openstreetmap.org"

# Tiny in-memory cache (dev only)
_simple_cache = {}
def cache_get(key):
    rec = _simple_cache.get(key)
    if not rec:
        return None
    value, expires = rec
    import time
    if expires and time.time() > expires:
        del _simple_cache[key]
        return None
    return value

def cache_set(key, value, ttl=30):
    import time
    _simple_cache[key] = (value, time.time() + ttl if ttl else None)

# ---------------------------
# 4️⃣ Existing auth/favorite routes (yours)
# ---------------------------
@app.route("/")
def hello():
    return "Hello, Food Tour Backend!"

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
        return jsonify({"error": "Username và place_id bắt buộc"}), 400

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User không tồn tại"}), 404

    existing = Favorite.query.filter_by(user_id=user.id, place_id=place_id).first()
    if existing:
        return jsonify({"error": "Địa điểm đã được yêu thích"}), 400

    new_fav = Favorite(user_id=user.id, place_id=place_id)
    db.session.add(new_fav)
    db.session.commit()

    return jsonify({"message": "Địa điểm đã được thêm vào favorite"})

@app.route("/api/favorite/<username>", methods=["GET"])
def get_favorites(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User không tồn tại"}), 404

    fav_list = Favorite.query.filter_by(user_id=user.id).all()
    places = [f.place_id for f in fav_list]

    return jsonify({"username": username, "favorites": places})

# === THÊM HÀM MỚI NÀY ===
@app.route("/api/favorite", methods=["DELETE"])
def remove_favorite():
    data = request.get_json()
    username = data.get("username")
    place_id = data.get("place_id")

    if not username or not place_id:
        return jsonify({"error": "Username và place_id bắt buộc"}), 400

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User không tồn tại"}), 404

    # Tìm bản ghi favorite
    fav = Favorite.query.filter_by(user_id=user.id, place_id=place_id).first()
    
    if not fav:
        # Nếu không tìm thấy thì cũng không sao, coi như đã xóa
        return jsonify({"message": "Địa điểm không có trong favorite"}), 404

    # Xóa bản ghi khỏi database
    db.session.delete(fav)
    db.session.commit()

    return jsonify({"message": "Địa điểm đã được xóa khỏi favorite"})
# === KẾT THÚC THÊM MỚI ===
# ---------------------------
# 5️⃣ Map / Geocoding / Routing endpoints
# ---------------------------

# 5.2 Reverse geocoding
# GET /api/reverse?lat=10.762622&lon=106.660172
@app.route("/api/reverse")
def reverse_geocode():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    if not lat or not lon:
        return jsonify({"error": "lat and lon required"}), 400

    params = {
        "lat": lat,
        "lon": lon,
        "format": "json",
        "addressdetails": 1
    }
    try:
        r = requests.get(f"{NOMINATIM_BASE}/reverse", params=params, headers=DEFAULT_HEADERS, timeout=10)
        r.raise_for_status()
        return jsonify(r.json())
    except requests.RequestException as e:
        return jsonify({"error": "Reverse geocoding failed", "details": str(e)}), 502

# 5.3 Routing (shortest path) between two or more points via OSRM
# Example: GET /api/route?points=lat1,lon1;lat2,lon2&profile=driving
# or json POST {"points": [[lat1,lon1],[lat2,lon2]], "profile":"driving"}
@app.route("/api/route", methods=["GET", "POST"])
def route():
    if request.method == "GET":
        pts = request.args.get("points")  # format "lat,lon;lat,lon;..."
        profile = request.args.get("profile", "driving")
        if not pts:
            return jsonify({"error": "points parameter required (format lat,lon;lat,lon;...)"}), 400
        # convert to lon,lat;lon,lat for OSRM
        try:
            pairs = [p.strip() for p in pts.split(";") if p.strip()]
            coords = []
            for p in pairs:
                lat, lon = p.split(",")
                coords.append(f"{float(lon)},{float(lat)}")
            coord_str = ";".join(coords)
        except Exception as e:
            return jsonify({"error": "Bad points format", "details": str(e)}), 400
    else:
        payload = request.get_json() or {}
        pts_list = payload.get("points")
        profile = payload.get("profile", "driving")
        if not pts_list or not isinstance(pts_list, list) or len(pts_list) < 2:
            return jsonify({"error": "points must be a list of at least 2 [lat,lon] pairs"}), 400
        coords = []
        try:
            for lat, lon in pts_list:
                coords.append(f"{float(lon)},{float(lat)}")
            coord_str = ";".join(coords)
        except Exception as e:
            return jsonify({"error": "Bad points format", "details": str(e)}), 400

    # OSRM route request
    # We ask for geojson geometry for easier use in Leaflet
    osrm_url = f"{OSRM_BASE}/route/v1/{profile}/{coord_str}"
    params = {
        "overview": "full",
        "geometries": "geojson",
        "steps": "true",
        "annotations": "false",
        "alternatives": "false"
    }

    cache_key = f"osrm:{profile}:{coord_str}"
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached)

    try:
        r = requests.get(osrm_url, params=params, headers=DEFAULT_HEADERS, timeout=15)
        r.raise_for_status()
        data = r.json()
        # Very small validation
        if "routes" not in data:
            return jsonify({"error": "No route found", "details": data}), 404
        # Cache short-lived
        cache_set(cache_key, data, ttl=10)
        return jsonify(data)
    except requests.RequestException as e:
        return jsonify({"error": "Routing failed", "details": str(e)}), 502

# 5.4 Optional: nearest street snap (OSRM nearest)
# GET /api/nearest?lat=..&lon=..
@app.route("/api/nearest")
def nearest():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    if not lat or not lon:
        return jsonify({"error": "lat and lon required"}), 400
    osrm_url = f"{OSRM_BASE}/nearest/v1/driving/{float(lon)},{float(lat)}"
    try:
        r = requests.get(osrm_url, headers=DEFAULT_HEADERS, timeout=8)
        r.raise_for_status()
        return jsonify(r.json())
    except requests.RequestException as e:
        return jsonify({"error": "Nearest failed", "details": str(e)}), 502

# -------------------------------------------------
# 1) Geocode từ địa chỉ -> lat,lng
# -------------------------------------------------
@app.route("/api/geocode", methods=["POST"])
def geocode():
    query = request.json.get("query")
    if not query:
        return jsonify({"error": "query required"}), 400

    params = {
        "q": query,
        "format": "json",
        "limit": 1
    }

    r = requests.get(NOMINATIM_BASE, params=params, headers={"User-Agent": "FoodTourApp"})
    data = r.json()

    if not data:
        return jsonify({"error": "No results"}), 404

    result = {
        "lat": float(data[0]["lat"]),
        "lon": float(data[0]["lon"])
    }
    return jsonify(result)


# -------------------------------------------------
# 2) Lấy toạ độ của các place_id (Google Place → LatLng)
#    Bạn sẽ gửi place_id và backend sẽ tự geocode lại bằng Nominatim.
# -------------------------------------------------
@app.route("/api/places/coords", methods=["POST"])
def places_coords():
    place_ids = request.json.get("places", [])

    coords = []
    for pid in place_ids:
        params = {"q": pid, "format": "json", "limit": 1}
        res = requests.get(NOMINATIM_BASE, params=params,
                           headers={"User-Agent": "FoodTourApp"}).json()

        if res:
            coords.append({
                "id": pid,
                "lat": float(res[0]["lat"]),
                "lon": float(res[0]["lon"])
            })

    return jsonify({"coords": coords})


# -------------------------------------------------
# 3) Optimize route (start + list places)
#    ...
# -------------------------------------------------
@app.route("/api/optimize", methods=["POST"])
def optimize():
    data = request.get_json()
    start_query = data.get("starting_point")
    
    # --- BẮT ĐẦU THAY ĐỔI 1 ---
    # Thay vì "place_ids", chúng ta nhận "places"
    # Đây là một list of dicts: [{"name": "...", "address": "..."}]
    places_data = data.get("places", [])
    # --- KẾT THÚC THAY ĐỔI 1 ---

    # ---- A) geocode start ---- (Giữ nguyên)
    s = requests.get(
        NOMINATIM_BASE,
        params={"q": start_query, "format": "json", "limit": 1},
        headers={"User-Agent": "FoodTourApp"}
    ).json()

    if not s:
        return jsonify({"error": "Invalid starting point"}), 400

    start = (float(s[0]["lon"]), float(s[0]["lat"]))

    # ---- B) geocode các điểm (THAY ĐỔI LỚN) ----
    points = []
    # Duyệt qua list of dicts
    for place in places_data:
        query_address = place.get("address") # Lấy địa chỉ để geocode
        display_name = place.get("name")     # Lấy tên để làm ID
        
        if not query_address or not display_name:
            continue # Bỏ qua nếu data không hợp lệ

        r = requests.get(
            NOMINATIM_BASE,
            # Dùng địa chỉ (query_address) để tìm kiếm
            params={"q": query_address, "format": "json", "limit": 1},
            headers={"User-Agent": "FoodTourApp"}
        ).json()

        if r:
            points.append({
                "id": display_name,  # <--- CRITICAL: Dùng TÊN làm 'id'
                "lon": float(r[0]["lon"]),
                "lat": float(r[0]["lat"])
            })

    # Báo lỗi nếu không geocode được điểm nào
    if not points:
        return jsonify({"error": "Không thể tìm thấy tọa độ cho bất kỳ địa điểm nào"}), 400

    # ---- C) sắp xếp tuyến đường (Giữ nguyên) ----
    visited = []
    current = start
    remaining = points.copy()

    while remaining:
        nearest = min(remaining, key=lambda p: abs(p["lat"] - current[1]) + abs(p["lon"] - current[0]))
        visited.append(nearest)
        current = (nearest["lon"], nearest["lat"])
        remaining.remove(nearest)

    # ---- D) chuẩn bị gửi OSRM polyline (Giữ nguyên) ----
    coords_str = f"{start[0]},{start[1]};"
    coords_str += ";".join([f"{p['lon']},{p['lat']}" for p in visited])
    coords_str += f";{start[0]},{start[1]}"

    osrm_url = f"{OSRM_BASE}/route/v1/driving/{coords_str}?overview=full&geometries=geojson"
    route_res = requests.get(osrm_url).json()

    # ---- Phần Response (Giữ nguyên) ----
    # Vì p["id"] bây giờ đã là TÊN, nên mọi thứ
    # (optimized_order, waypoints) sẽ tự động chứa TÊN
    waypoints_coords = [
        {"id": p["id"], "lat": p["lat"], "lon": p["lon"]} for p in visited
    ]
    start_point_coords = {"lat": start[1], "lon": start[0]}

    route_info = {
        "optimized_order": [p["id"] for p in visited], # Sẽ là TÊN
        "distance_km": route_res["routes"][0]["distance"] / 1000,
        "duration_min": route_res["routes"][0]["duration"] / 60,
        "polyline": route_res["routes"][0]["geometry"],
        "start_point_coords": start_point_coords,
        "waypoints": waypoints_coords # 'id' trong đây cũng là TÊN
    }

    return jsonify(route_info)

# ---------------------------
# 6️⃣ Run
# ---------------------------
if __name__ == "__main__":
    app.run(debug=True, port=5000)
