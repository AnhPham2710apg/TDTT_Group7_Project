import sys
import os
import sqlite3
import uuid
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# ==============================================================================
# CẤU HÌNH (QUAN TRỌNG NHẤT)
# ==============================================================================

# ⚠️ LƯU Ý: Để chạy từ máy tính cá nhân (Local), bạn BẮT BUỘC phải dùng link:
# "External Database URL" (Lấy từ Dashboard Render -> PostgreSQL -> Connections)
# Link thường có đuôi là: ...@oregon-postgres.render.com/food_tour_db
RENDER_DB_URL = "postgresql://food_tour_db_user:uiECcoGwSz9EmzKg8LliGSvmWKyJN3Zo@dpg-d4qokpu3jp1c739lagd0-a.singapore-postgres.render.com/food_tour_db"

# Đường dẫn file SQLite nguồn
SQLITE_SOURCE_PATH = "db/restaurants_processed.db"

# Giới hạn số lượng (Theo yêu cầu của bạn)
LIMIT_RECORDS = 500  
BATCH_SIZE = 10      

# ==============================================================================

# Xử lý đường dẫn để import models
current_dir = os.path.dirname(os.path.abspath(__file__))
# Nhảy ra folder cha (back-end) rồi vào api
sys.path.append(os.path.join(os.path.dirname(current_dir), 'api')) 

try:
    from models import Restaurant
except ImportError:
    print("❌ Lỗi: Không tìm thấy file 'api/models.py'. Hãy kiểm tra lại cấu trúc thư mục.")
    sys.exit(1)

# Fix lỗi giao thức cho SQLAlchemy
if RENDER_DB_URL and RENDER_DB_URL.startswith("postgres://"):
    RENDER_DB_URL = RENDER_DB_URL.replace("postgres://", "postgresql://", 1)

def transfer_data_final():
    # 1. Kiểm tra file SQLite
    # Lưu ý: Script đang nằm trong folder scripts/, nên phải lùi lại 1 cấp để tìm db/
    db_path_fixed = os.path.join(os.path.dirname(current_dir), SQLITE_SOURCE_PATH)
    
    if not os.path.exists(db_path_fixed):
        print(f"❌ Không tìm thấy file SQLite tại: {db_path_fixed}")
        return

    # 2. Kết nối Render
    print("☁️  Đang kết nối tới Server Render (Vui lòng đợi)...")
    try:
        pg_engine = create_engine(RENDER_DB_URL)
        Session = sessionmaker(bind=pg_engine)
        session = Session()
        print("✅ Kết nối Server thành công!")
    except Exception as e:
        print(f"❌ Lỗi kết nối Render: {e}")
        print("👉 Gợi ý: Hãy kiểm tra lại RENDER_DB_URL. Phải dùng link EXTERNAL (đuôi .render.com)")
        return

    # 3. Đọc dữ liệu từ SQLite
    print(f"🔌 Đang đọc {LIMIT_RECORDS} dòng từ SQLite...")
    sqlite_conn = sqlite3.connect(db_path_fixed)
    sqlite_conn.row_factory = sqlite3.Row
    cursor = sqlite_conn.cursor()
    
    try:
        cursor.execute(f"SELECT * FROM restaurants LIMIT {LIMIT_RECORDS}")
        rows = cursor.fetchall()
    except Exception as e:
        print(f"❌ Lỗi đọc bảng SQLite: {e}")
        return

    # 4. Vòng lặp nạp dữ liệu
    print(f"🚀 Bắt đầu nạp {len(rows)} quán lên mây...")
    count_success = 0
    current_batch = []

    for i, row in enumerate(rows):
        try:
            # Tạo object Restaurant (Mapping khớp 100% với models.py)
            new_res = Restaurant(
                # Các trường cơ bản
                place_id=row['place_id'] if row['place_id'] else f"imp_{uuid.uuid4().hex[:10]}",
                name=row['name'],
                
                # QUAN TRỌNG: Model dùng 'full_address', không phải 'address'
                full_address=row['full_address'] if row['full_address'] else row['district'],
                
                latitude=row['latitude'] or 0.0,
                longitude=row['longitude'] or 0.0,
                rating=row['rating'] or 0.0,
                
                # Các trường chi tiết
                working_hour=row['working_hour'],
                photo_url=row['photo_url'],
                phone=row['phone'],
                site=row['site'],
                description=row['description'],
                range=row['range'],
                
                # Các trường phân loại (cho bộ lọc)
                foodType=row['foodType'],
                bevFood=row['bevFood'],
                cuisine=row['cuisine'],
                flavor=row['flavor'],
                courseType=row['courseType'],
                district=row['district'],
                minPrice=row['minPrice'],
                maxPrice=row['maxPrice']
            )
            
            current_batch.append(new_res)

            # Cơ chế Batch: Đủ 10 cái thì gửi đi
            if len(current_batch) >= BATCH_SIZE or (i + 1) == len(rows):
                session.bulk_save_objects(current_batch)
                session.commit()
                
                count_success += len(current_batch)
                print(f"   ---> Đã nạp: {count_success}/{len(rows)} quán")
                
                current_batch = [] # Reset lô hàng
                time.sleep(0.1)    # Nghỉ xíu cho server thở

        except Exception as e:
            session.rollback()
            print(f"⚠️ Lỗi tại dòng {i}: {e}")
            current_batch = [] # Bỏ qua lô lỗi này

    session.close()
    sqlite_conn.close()
    
    print("------------------------------------------------")
    print(f"🎉 XONG! Tổng cộng đã nạp: {count_success} quán")
    print("------------------------------------------------")

if __name__ == "__main__":
    transfer_data_final()