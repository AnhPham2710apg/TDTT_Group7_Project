import sqlite3
import psycopg2
from psycopg2.extras import execute_values
import os

# --- CẤU HÌNH ---
# Kiểm tra lại đường dẫn file này cho đúng vị trí trên máy bạn
SQLITE_DB_PATH = "db/restaurants_processed.db" 

# Thông tin PostgreSQL
PG_HOST = "localhost"
PG_DB = "restaurants_db"
PG_USER = "postgres"
PG_PASS = "271006" # <-- Thay mật khẩu của bạn vào đây

def migrate():
    print("--- BẮT ĐẦU CHUYỂN DỮ LIỆU ---")
    
    # 1. KIỂM TRA FILE SQLITE
    if not os.path.exists(SQLITE_DB_PATH):
        print(f"Lỗi: Không tìm thấy file {SQLITE_DB_PATH}")
        return

    # 2. ĐỌC DỮ LIỆU CŨ
    try:
        sq_conn = sqlite3.connect(SQLITE_DB_PATH)
        sq_cursor = sq_conn.cursor()
        sq_cursor.execute("SELECT * FROM restaurants")
        rows = sq_cursor.fetchall()
        
        if not rows:
            print("File SQLite không có dữ liệu nào!")
            return

        col_names = [d[0] for d in sq_cursor.description]
        print(f">>> Đã đọc {len(rows)} dòng từ SQLite.")
        
    except Exception as e:
        print(f"Lỗi đọc SQLite: {e}")
        return

    # 3. GHI SANG POSTGRESQL
    try:
        pg_conn = psycopg2.connect(host=PG_HOST, database=PG_DB, user=PG_USER, password=PG_PASS)
        pg_cursor = pg_conn.cursor()
        
        # Xóa dữ liệu cũ (nếu có)
        pg_cursor.execute("TRUNCATE TABLE restaurants RESTART IDENTITY;")
        
        # --- ĐOẠN ĐÃ SỬA LỖI ---
        cols = ",".join(col_names)
        
        # execute_values chỉ cần 1 placeholder %s duy nhất
        # Nó sẽ tự động biến đổi thành: VALUES (v1,v2), (v3,v4)...
        query = f"INSERT INTO restaurants ({cols}) VALUES %s"
        
        execute_values(pg_cursor, query, rows)
        # -----------------------

        pg_conn.commit()
        
        print(">>> THÀNH CÔNG! Đã chuyển toàn bộ dữ liệu sang PostgreSQL.")
        
    except Exception as e:
        print(f"Lỗi ghi PostgreSQL: {e}")
        print("Gợi ý: Hãy chắc chắn bạn đã chạy 'python app.py' một lần để tạo bảng trước.")
    finally:
        if 'sq_conn' in locals(): sq_conn.close()
        if 'pg_conn' in locals(): pg_conn.close()

if __name__ == "__main__":
    migrate()