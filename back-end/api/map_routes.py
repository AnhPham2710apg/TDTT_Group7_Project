# api/map_routes.py
from flask import Blueprint, request, jsonify, current_app
import requests
import polyline
import json
import math
from models import db, RouteHistory, User

map_bp = Blueprint('map_bp', __name__)

def goong_geocode_helper(query):
    if not query: return None
    api_key = current_app.config.get('GOONG_API_KEY')
    base_url = "https://rsapi.goong.io"
    try:
        params = {"address": query, "api_key": api_key}
        r = requests.get(f"{base_url}/Geocode", params=params, timeout=10)
        data = r.json()
        if data.get("results"):
            loc = data["results"][0]["geometry"]["location"]
            return {"lat": loc["lat"], "lon": loc["lng"]}
    except Exception as e:
        print(f"Goong Geocode Error: {e}")
    return None

# ==============================================================================
# 1. BẢN ĐỒ CƠ BẢN (Geocoding & Routing)
# ==============================================================================

@map_bp.route("/api/geocode", methods=["POST"])
def geocode():
    """
    Tìm tọa độ từ tên địa điểm (Forward Geocoding)
    ---
    tags:
      - Map & Routing
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            query:
              type: string
              example: "Bitexco Financial Tower"
    responses:
      200:
        description: Trả về tọa độ lat/lon
        schema:
          type: object
          properties:
            lat:
              type: number
            lon:
              type: number
      404:
        description: Không tìm thấy địa điểm
    """
    query = request.json.get("query")
    coords = goong_geocode_helper(query)
    if coords: return jsonify(coords)
    return jsonify({"error": "Không tìm thấy địa điểm"}), 404

@map_bp.route("/api/reverse", methods=["GET"])
def reverse_geocode():
    """
    Tìm địa chỉ từ tọa độ (Reverse Geocoding)
    ---
    tags:
      - Map & Routing
    parameters:
      - name: lat
        in: query
        type: number
        required: true
      - name: lon
        in: query
        type: number
        required: true
    responses:
      200:
        description: Trả về tên địa điểm
        schema:
          type: object
          properties:
            display_name:
              type: string
    """
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    api_key = current_app.config.get('GOONG_API_KEY')
    if not lat or not lon: return jsonify({"error": "Missing params"}), 400
    try:
        params = {"latlng": f"{lat},{lon}", "api_key": api_key}
        r = requests.get("https://rsapi.goong.io/Geocode", params=params, timeout=10)
        data = r.json()
        if data.get("results"):
            return jsonify({"display_name": data["results"][0]["formatted_address"]})
        return jsonify({"error": "No address found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@map_bp.route("/api/route", methods=["POST"])
def get_route():
    """
    Tìm đường đi giữa các điểm (Routing)
    ---
    tags:
      - Map & Routing
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            points:
              type: array
              description: Danh sách tọa độ [[lat1, lon1], [lat2, lon2]]
              items:
                type: array
                items:
                  type: number
            vehicle:
              type: string
              default: car
              enum: [car, bike, taxi]
    responses:
      200:
        description: Trả về thông tin đường đi và polyline mã hóa
    """
    data = request.get_json() or {}
    points = data.get("points")
    vehicle = data.get("vehicle", "car")
    api_key = current_app.config.get('GOONG_API_KEY')
    
    if not points or len(points) < 2:
        return jsonify({"error": "Need at least 2 points"}), 400
    
    origin = f"{points[0][0]},{points[0][1]}"
    destination = f"{points[-1][0]},{points[-1][1]}"
    waypoints_str = ""
    if len(points) > 2:
        waypoints_str = "|".join([f"{p[0]},{p[1]}" for p in points[1:-1]])
    
    params = {
        "origin": origin, "destination": destination,
        "vehicle": vehicle, "api_key": api_key
    }
    if waypoints_str: params["waypoints"] = waypoints_str

    try:
        r = requests.get("https://rsapi.goong.io/Direction", params=params, timeout=10)
        data = r.json()
        if not data.get("routes"): return jsonify({"error": "No route"}), 404
        
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

@map_bp.route("/api/places/coords", methods=["POST"])
def places_coords():
    place_ids = request.json.get("places", [])
    coords = []
    for pid in place_ids:
        res = goong_geocode_helper(pid)
        if res: coords.append({"id": pid, "lat": res["lat"], "lon": res["lon"]})
    return jsonify({"coords": coords})

# ==============================================================================
# 2. TỐI ƯU & LƯU LỘ TRÌNH (OPTIMIZE & SAVE)
# ==============================================================================

def are_places_equal(places_A, places_B):
    names_A = set(p['name'] for p in places_A)
    names_B = set(p['name'] for p in places_B)
    return names_A == names_B

@map_bp.route("/api/optimize", methods=["POST"])
def optimize():
    """
    Tối ưu lộ trình đi qua nhiều điểm (TSP Algorithm)
    ---
    tags:
      - Map & Routing
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            starting_point:
              type: string
              example: "Nhà thờ Đức Bà"
            places:
              type: array
              items:
                type: object
                properties:
                  name:
                    type: string
                  address:
                    type: string
                  lat:
                    type: number
                  lng:
                    type: number
            use_manual_order:
              type: boolean
              default: false
    responses:
      200:
        description: Trả về thứ tự đi tối ưu và polyline vẽ đường
    """
    data = request.get_json()
    start_query = data.get("starting_point")
    places_data = data.get("places", [])
    use_manual_order = data.get("use_manual_order", False)
    api_key = current_app.config.get('GOONG_API_KEY')

    # Check cache
    potential_routes = RouteHistory.query.filter(
        RouteHistory.start_point.ilike(start_query)
    ).all()

    for r in potential_routes:
        try:
            stored_places = json.loads(r.places_json)
            if are_places_equal(places_data, stored_places):
                print(f">>> CACHE HIT! Route ID: {r.id}")
                real_start_coords = None
                if r.polyline_outbound:
                    try:
                        decoded = polyline.decode(r.polyline_outbound)
                        if decoded: real_start_coords = {"lat": decoded[0][0], "lon": decoded[0][1]}
                    except: pass
                
                if not real_start_coords:
                    real_start_coords = goong_geocode_helper(start_query) or {"lat": 0, "lon": 0}

                return jsonify({
                    "optimized_order": [p["name"] for p in stored_places],
                    "distance_km": r.total_distance,
                    "duration_min": r.total_duration,
                    "polyline_outbound": r.polyline_outbound,
                    "polyline_return": r.polyline_return,
                    "start_point_coords": real_start_coords,
                    "waypoints": [{"id": p["name"], "address": p["address"], "lat": p.get("lat"), "lon": p.get("lng")} for p in stored_places],
                    "from_cache": True
                })
        except Exception as e:
            print(f"Cache check error: {e}")
            continue

    # Cache miss -> Calculate
    print(">>> CACHE MISS. Calling Goong...")
    start_coords = goong_geocode_helper(start_query)
    if not start_coords: return jsonify({"error": "Không tìm thấy điểm bắt đầu"}), 400
    
    start_tuple = (start_coords["lat"], start_coords["lon"])
    points_to_visit = []
    
    for place in places_data:
        p_lat, p_lon = None, None
        if place.get("lat") and place.get("lng"):
            p_lat, p_lon = float(place["lat"]), float(place["lng"])
        elif place.get("address"):
            res = goong_geocode_helper(place["address"])
            if res: p_lat, p_lon = res["lat"], res["lon"]
        
        if p_lat:
            points_to_visit.append({
                "id": place.get("name", "Unknown"),
                "address": place.get("address", ""),
                "lat": p_lat, "lon": p_lon
            })

    if not points_to_visit: return jsonify({"error": "Không có điểm đến hợp lệ"}), 400

    visited_ordered = []
    if use_manual_order:
        visited_ordered = points_to_visit
    else:
        current_pos = start_tuple
        remaining = points_to_visit.copy()
        while remaining:
            nearest = min(remaining, key=lambda p: math.sqrt((p["lat"] - current_pos[0])**2 + (p["lon"] - current_pos[1])**2))
            visited_ordered.append(nearest)
            current_pos = (nearest["lat"], nearest["lon"])
            remaining.remove(nearest)

    # Calculate routes
    route_sequence = [start_tuple] + [(p['lat'], p['lon']) for p in visited_ordered] + [start_tuple]
    
    outbound_coords = []
    return_coords = []
    total_distance = 0
    total_duration = 0
    last_stop_index = len(route_sequence) - 2

    for i in range(len(route_sequence) - 1):
        origin = route_sequence[i]
        destination = route_sequence[i+1]
        params = {"origin": f"{origin[0]},{origin[1]}", "destination": f"{destination[0]},{destination[1]}", "vehicle": "car", "api_key": api_key}
        try:
            r = requests.get("https://rsapi.goong.io/Direction", params=params, timeout=10)
            r_data = r.json()
            if r_data.get("routes"):
                leg = r_data["routes"][0]
                total_distance += leg["legs"][0]["distance"]["value"]
                total_duration += leg["legs"][0]["duration"]["value"]
                pts = polyline.decode(leg["overview_polyline"]["points"])
                if i == last_stop_index: return_coords.extend(pts)
                else: outbound_coords.extend(pts)
        except: pass

    return jsonify({
        "optimized_order": [p["id"] for p in visited_ordered],
        "distance_km": total_distance / 1000,
        "duration_min": total_duration / 60,
        "polyline_outbound": polyline.encode(outbound_coords),
        "polyline_return": polyline.encode(return_coords),
        "start_point_coords": start_coords,
        "waypoints": visited_ordered
    })

@map_bp.route("/api/routes", methods=["POST"])
def save_route():
    """
    Lưu lộ trình vào lịch sử User
    ---
    tags:
      - Map & Routing
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            username:
              type: string
            start_point:
              type: string
            places:
              type: array
            distance:
              type: number
            duration:
              type: number
            polyline_outbound:
              type: string
            polyline_return:
              type: string
    responses:
      200:
        description: Lưu thành công
    """
    data = request.get_json()
    username = data.get("username")
    start_point = data.get("start_point")
    places = data.get("places")
    poly_out = data.get("polyline_outbound", "")
    poly_ret = data.get("polyline_return", "")
    
    if not username or not start_point or not places: return jsonify({"error": "Thiếu thông tin"}), 400
    user = User.query.filter_by(username=username).first()
    if not user: return jsonify({"error": "User 404"}), 404

    new_route = RouteHistory(
        user_id=user.id,
        name=f"Lộ trình từ {start_point[:20]}...",
        start_point=start_point,
        places_json=json.dumps(places),
        polyline_outbound=poly_out,
        polyline_return=poly_ret,
        total_distance=data.get("distance", 0.0),
        total_duration=data.get("duration", 0.0)
    )
    db.session.add(new_route)
    db.session.commit()
    return jsonify({"message": "Saved", "route": new_route.to_dict()})

@map_bp.route("/api/routes/<username>", methods=["GET"])
def get_user_routes(username):
    """Lấy danh sách lộ trình đã lưu của User"""
    user = User.query.filter_by(username=username).first()
    if not user: return jsonify({"error": "User 404"}), 404
    routes = RouteHistory.query.filter_by(user_id=user.id).order_by(RouteHistory.created_at.desc()).all()
    return jsonify([r.to_dict() for r in routes])

@map_bp.route("/api/routes/<int:route_id>", methods=["DELETE"])
def delete_route(route_id):
    """Xóa lộ trình"""
    route = RouteHistory.query.get(route_id)
    if not route: return jsonify({"error": "Not found"}), 404
    db.session.delete(route)
    db.session.commit()
    return jsonify({"message": "Deleted"})

@map_bp.route("/api/routes/<int:route_id>", methods=["PUT"])
def update_route_name(route_id):
    """Đổi tên lộ trình"""
    route = RouteHistory.query.get(route_id)
    if not route: return jsonify({"error": "Not found"}), 404
    route.name = request.get_json().get("name", route.name)
    db.session.commit()
    return jsonify({"message": "Updated", "route": route.to_dict()})