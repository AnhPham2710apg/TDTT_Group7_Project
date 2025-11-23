# config.py

#!!! QUAN TRỌNG: Thay thế bằng REST API Key (Secret Key) của bạn 
GOONG_API_KEY = "YOUR_SERVICE_API_KEY"

# Base URL cho các dịch vụ REST API [3]
BASE_URL = "https://rsapi.goong.io"

# Giới hạn API của Goong là 5 requests/giây 
# Chúng ta đặt thời gian chờ là 0.25 giây (cho 4 req/giây) để đảm bảo an toàn.
REQUEST_SLEEP_TIME = 0.35