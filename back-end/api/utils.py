# api/utils.py
import os
from datetime import datetime

# Danh sách đuôi file ảnh cho phép upload
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    """
    Kiểm tra xem file upload có phải là ảnh hợp lệ không.
    Input: "image.png"
    Output: True / False
    """
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def check_is_open(open_str, close_str):
    """
    Kiểm tra xem quán có đang mở cửa không dựa vào giờ hiện tại.
    
    Args:
        open_str (str): Giờ mở cửa (VD: "08:00" hoặc "08:00:00")
        close_str (str): Giờ đóng cửa (VD: "22:00" hoặc "22:00:00")
        
    Returns:
        bool: True nếu đang mở, False nếu đã đóng.
    """
    # 1. Nếu dữ liệu trong DB bị thiếu hoặc rỗng, mặc định trả về True (Đang mở)
    #    để tránh việc ẩn nhầm quán ăn khi chưa có thông tin giờ.
    if not open_str or not close_str:
        return True

    try:
        # 2. Lấy giờ hiện tại của hệ thống
        now = datetime.now().time()
        
        # 3. Chuẩn hóa chuỗi giờ từ Database
        # Cắt lấy 5 ký tự đầu tiên để bỏ qua phần giây nếu có (VD: "08:00:00" -> "08:00")
        fmt = "%H:%M"
        open_time = datetime.strptime(str(open_str)[:5], fmt).time()
        close_time = datetime.strptime(str(close_str)[:5], fmt).time()

        # 4. So sánh giờ
        if close_time < open_time: 
            # Trường hợp mở qua đêm (VD: Mở 18:00 tối -> Đóng 02:00 sáng hôm sau)
            # Quán mở khi: Giờ hiện tại >= 18:00  HOẶC  Giờ hiện tại <= 02:00
            return now >= open_time or now <= close_time
        else:
            # Trường hợp mở trong ngày (VD: Mở 08:00 sáng -> Đóng 22:00 tối)
            # Quán mở khi: 08:00 <= Giờ hiện tại <= 22:00
            return open_time <= now <= close_time
            
    except Exception as e:
        # Nếu gặp lỗi (VD: sai định dạng ngày tháng), in lỗi ra console để debug
        # nhưng vẫn trả về True để app không bị crash.
        print(f"Lỗi kiểm tra giờ mở cửa: {e}")
        return True