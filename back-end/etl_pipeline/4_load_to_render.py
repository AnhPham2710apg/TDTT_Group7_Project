import sys
import os
import sqlite3
import hashlib
import time
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# --- PATH CONFIGURATION ---
current_file_path = os.path.abspath(__file__)
etl_pipeline_dir = os.path.dirname(current_file_path)
backend_dir = os.path.dirname(etl_pipeline_dir)

sys.path.append(etl_pipeline_dir)
api_dir = os.path.join(backend_dir, 'api')
sys.path.append(api_dir)

# --- IMPORTS ---
try:
    import config
except ImportError as e:
    print(f"❌ Error importing config: {e}")
    sys.exit(1)

try:
    # Import Restaurant để đẩy dữ liệu
    # Import Base (nếu có) hoặc dùng Restaurant.metadata để tạo bảng
    from models import Restaurant
except ImportError as e:
    print(f"❌ Error importing models: {e}")
    sys.exit(1)

# ==============================================================================
# CONFIGURATION
# ==============================================================================
START_ID = 1      
END_ID = 3000     # Tăng range lên để chắc chắn cover hết
BATCH_SIZE = 50   

# Hàm tạo ID duy nhất (Deterministic ID)
def generate_deterministic_id(name, address):
    if not name: name = "unknown"
    if not address: address = "unknown"
    # Hash tên + địa chỉ để tạo ra ID cố định
    raw_str = f"{name.strip().lower()}_{address.strip().lower()}"
    return f"imp_{hashlib.md5(raw_str.encode('utf-8')).hexdigest()[:10]}"

# ==============================================================================

def transfer_data_final():
    source_db = config.DB_FINAL_PATH
    
    if not os.path.exists(source_db):
        print(f"❌ SQLite file not found at: {source_db}")
        return

    # ---------------------------------------------------------
    # 1. Connect to Render (PostgreSQL)
    # ---------------------------------------------------------
    print("☁️  Connecting to Render Server...")
    db_url = config.RENDER_DB_URL
    
    if db_url and db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    
    # Force UTF-8 encoding
    if "?" not in db_url:
        db_url += "?client_encoding=utf8"
    else:
        db_url += "&client_encoding=utf8"
        
    try:
        pg_engine = create_engine(db_url)
        Session = sessionmaker(bind=pg_engine)
        session = Session()
        print("✅ Connected to Server successfully!")
        
        # --- FIX QUAN TRỌNG: TẠO BẢNG NẾU CHƯA CÓ ---
        # Lệnh này sẽ kiểm tra model Restaurant và tạo bảng 'restaurants' trên server
        # nếu nó chưa tồn tại. Khắc phục lỗi "relation does not exist".
        print("🛠  Checking/Creating table schema on Server...")
        Restaurant.metadata.create_all(pg_engine)
        print("✅ Schema checked/created.")
        
    except Exception as e:
        print(f"❌ Render Connection/Schema Error: {e}")
        return

    # ---------------------------------------------------------
    # 2. Get existing IDs from Server
    # ---------------------------------------------------------
    print("🔍 Checking existing data on Server...")
    existing_ids = set()
    try:
        result = session.execute(text("SELECT place_id FROM restaurants"))
        for row in result:
            existing_ids.add(row[0])
        print(f"   -> Found {len(existing_ids)} restaurants already on Server.")
    except Exception as e:
        print(f"⚠️  Could not fetch existing IDs (Table empty or error): {e}")

    # ---------------------------------------------------------
    # 3. Read data from SQLite
    # ---------------------------------------------------------
    print(f"🔌 Reading SQLite data (ID {START_ID} -> {END_ID})...")
    sqlite_conn = sqlite3.connect(source_db)
    sqlite_conn.row_factory = sqlite3.Row
    cursor = sqlite_conn.cursor()
    
    try:
        cursor.execute(
            "SELECT * FROM restaurants WHERE id BETWEEN ? AND ?", 
            (START_ID, END_ID)
        )
        rows = cursor.fetchall()
    except Exception as e:
        print(f"❌ SQLite Read Error: {e}")
        return

    # ---------------------------------------------------------
    # 4. Filter and Load Data
    # ---------------------------------------------------------
    print(f"🚀 Processing {len(rows)} rows...")
    count_success = 0
    count_skipped = 0
    current_batch = []

    for i, row in enumerate(rows):
        try:
            # --- XỬ LÝ DỮ LIỆU ---
            
            # 1. Tên & Địa chỉ
            r_name = row['name']
            r_district = row['district']
            r_full_address = row['full_address'] if 'full_address' in row.keys() else r_district

            # 2. Xử lý ID
            if row['place_id']:
                place_id = row['place_id']
            else:
                place_id = generate_deterministic_id(r_name, r_full_address)
            
            # SKIP nếu đã tồn tại
            if place_id in existing_ids:
                count_skipped += 1
                continue

            # 3. Xử lý Range (Quan trọng: SQLite giờ đã là số)
            # Nếu trong SQLite range là NULL, ta gán mặc định là 1
            val_range = row['range']
            if val_range is None: 
                val_range = 1
            else:
                # Đảm bảo ép kiểu về int
                try:
                    val_range = int(val_range)
                except:
                    val_range = 1

            # 4. Tạo Object Restaurant
            new_res = Restaurant(
                place_id=place_id,
                name=r_name,
                full_address=r_full_address,
                
                latitude=row['latitude'] or 0.0,
                longitude=row['longitude'] or 0.0,
                rating=row['rating'] or 0.0,
                working_hour=row['working_hour'],
                photo_url=row['photo_url'],
                phone=row['phone'],
                site=row['site'],
                description=row['description'],
                
                # Cột range giờ là số nguyên (Integer)
                range=val_range,
                
                # Các cột phân loại AI
                foodType=row['foodType'],
                bevFood=row['bevFood'],
                cuisine=row['cuisine'],
                flavor=row['flavor'],
                courseType=row['courseType'],
                district=r_district,
                
                # Giá tiền
                minPrice=row['minPrice'] or 0,
                maxPrice=row['maxPrice'] or 0
            )
            
            current_batch.append(new_res)
            existing_ids.add(place_id) 

            # Gửi Batch
            if len(current_batch) >= BATCH_SIZE:
                session.bulk_save_objects(current_batch)
                session.commit()
                count_success += len(current_batch)
                print(f"   ---> Loaded: {count_success} (Skipped so far: {count_skipped})")
                current_batch = [] 

        except Exception as e:
            session.rollback()
            # In lỗi chi tiết nhưng không dừng chương trình
            print(f"⚠️ Error on row ID {row['id']}: {e}")
            current_batch = []

    # Load nốt batch cuối cùng
    if current_batch:
        try:
            session.bulk_save_objects(current_batch)
            session.commit()
            count_success += len(current_batch)
        except Exception as e:
            print(f"⚠️ Error saving final batch: {e}")

    session.close()
    sqlite_conn.close()
    
    print("================================================")
    print(f"🎉 FINISHED!")
    print(f"   - Total Scanned: {len(rows)}")
    print(f"   - Newly Loaded: {count_success}")
    print(f"   - Skipped (Duplicate): {count_skipped}")
    print("================================================")

if __name__ == "__main__":
    transfer_data_final()