import requests

# API Key
API_KEY = "3db98fa6f7a6c85063c028c06845b65e" 

# --- PHẦN 1: ĐỊNH NGHĨA HÀM ---
def get_weather_by_city(city_name):
    url = f"http://api.openweathermap.org/data/2.5/weather?q={city_name}&appid={API_KEY}&units=metric&lang=vi"
    
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            return {
                "city": data["name"],
                "temp": data["main"]["temp"],
                "desc": data["weather"][0]["description"],
                "humidity": data["main"]["humidity"]
            }
        else:
            print(f"Lỗi từ API: {response.status_code}")
            return None
    except Exception as e:
        print(f"Lỗi kết nối: {e}")
        return None

# --- PHẦN 2: CHẠY THỬ (TEST) ---
if __name__ == "__main__":
    print(">>> Đang kiểm tra thời tiết...")
    
    # Ở đây gọi hàm 'get_weather_by_city' thì ở trên phải định nghĩa y hệt vậy
    ket_qua = get_weather_by_city("Hanoi")
    
    if ket_qua:
        print("-" * 30)
        print(f"Thành phố: {ket_qua['city']}")
        print(f"Nhiệt độ:  {ket_qua['temp']}°C")
        print(f"Mô tả:     {ket_qua['desc']}")
        print(f"Độ ẩm:     {ket_qua['humidity']}%")
        print("-" * 30)
    else:
        print("Không lấy được dữ liệu.")