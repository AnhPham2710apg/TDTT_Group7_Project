import sys
import os

# 1. Lấy đường dẫn tuyệt đối của thư mục hiện tại (thư mục back-end)
current_dir = os.path.dirname(os.path.abspath(__file__))

# 2. Xác định đường dẫn thư mục 'api'
api_dir = os.path.join(current_dir, "api")

# 3. Thêm 'api' vào danh sách đường dẫn tìm kiếm của Python (sys.path)
# Việc này giúp Python hiểu câu lệnh "from models import..." bên trong routes.py
sys.path.insert(0, api_dir)
sys.path.insert(0, current_dir)