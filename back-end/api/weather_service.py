# api/weather_service.py
from flask import Blueprint, request, jsonify, current_app
import requests

# Tạo Blueprint
weather_bp = Blueprint('weather_bp', __name__)

def get_weather_helper(city_name):
    """Hàm hỗ trợ gọi API OpenWeather"""
    api_key = current_app.config.get('OPEN_WEATHER_API_KEY')
    
    if not api_key:
        print("❌ LỖI: Chưa cấu hình OPEN_WEATHER_API_KEY")
        return None

    url = f"http://api.openweathermap.org/data/2.5/weather?q={city_name}&appid={api_key}&units=metric&lang=vi"
    
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            return {
                "city": data["name"],
                "temp": data["main"]["temp"],
                "desc": data["weather"][0]["description"],
                "humidity": data["main"]["humidity"]
            }
        else:
            print(f"Weather API Error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Weather Connection Error: {e}")
        return None

@weather_bp.route("/api/weather/current", methods=["GET"])
def get_current_weather():
    """
    Lấy thông tin thời tiết hiện tại theo tên thành phố
    ---
    tags:
      - Weather
    parameters:
      - name: city
        in: query
        type: string
        default: Ho Chi Minh City
        description: Tên thành phố (không dấu hoặc tiếng Anh)
    responses:
      200:
        description: Trả về thông tin nhiệt độ, mô tả, độ ẩm
        schema:
          type: object
          properties:
            city:
              type: string
            temp:
              type: number
            desc:
              type: string
            humidity:
              type: number
      404:
        description: Không tìm thấy dữ liệu hoặc thành phố
      500:
        description: Lỗi server
    """
    # Lấy tham số city từ URL (VD: ?city=Hanoi), mặc định là Ho Chi Minh City
    city_param = request.args.get('city', 'Ho Chi Minh City')
    
    try:
        data = get_weather_helper(city_param)
        if data:
            return jsonify(data)
        return jsonify({"error": "Không thể lấy dữ liệu thời tiết"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500