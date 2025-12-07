import sqlite3
import psycopg2
from psycopg2.extras import execute_values
import os

# --- CẤU HÌNH ---
SQLITE_USER_DB = "../db/database.db" 

# Cấu hình PostgreSQL
PG_HOST = "localhost"
PG_DB = "foodtour_db"
PG_USER = "postgres"
PG_PASS = "271006"  # <-- Thay mật khẩu của bạn

def reset_sequence(pg_cursor, table_name):
    """
    Reset bộ đếm ID tự động.
    Lưu ý: table_name sẽ được bao trong dấu ngoặc kép để tránh lỗi từ khóa 'user'
    """
    try:
        # Thêm dấu ngoặc kép quanh table_name
        pg_cursor.execute(f'SELECT MAX(id) FROM "{table_name}";')
        max_id = pg_cursor.fetchone()[0]
        if max_id:
            # Với hàm pg_get_serial_sequence, ta truyền tên bảng thường (không cần ngoặc kép trong chuỗi)
            # nhưng tốt nhất để PostgreSQL tự xử lý
            pg_cursor.execute(f"SELECT setval(pg_get_serial_sequence('\"{table_name}\"', 'id'), {max_id});")
            print(f"   -> Đã cập nhật bộ đếm ID cho bảng {table_name} lên {max_id}")
    except Exception as e:
        # Lỗi này thường không nghiêm trọng nếu bảng ít dữ liệu
        print(f"   (Info: Reset sequence message: {e})")

def migrate_table(table_name, sq_cursor, pg_cursor):
    print(f"--- Đang xử lý bảng: {table_name} ---")
    
    # 1. Đọc dữ liệu từ SQLite
    try:
        sq_cursor.execute(f"SELECT * FROM {table_name}")
        rows = sq_cursor.fetchall()
        
        if not rows:
            print(f"   Bảng {table_name} trong SQLite trống. Bỏ qua.")
            return

        col_names = [d[0] for d in sq_cursor.description]
        print(f"   Tìm thấy {len(rows)} dòng dữ liệu.")
        
    except Exception as e:
        print(f"   Lỗi đọc bảng {table_name} từ SQLite: {e}")
        return

    # 2. Ghi sang PostgreSQL
    try:
        # SỬA LỖI TẠI ĐÂY: Thêm dấu ngoặc kép "" quanh {table_name}
        # TRUNCATE TABLE "user" ...
        pg_cursor.execute(f'TRUNCATE TABLE "{table_name}" RESTART IDENTITY CASCADE;')
        
        cols = ",".join(col_names)
        
        # INSERT INTO "user" ...
        query = f'INSERT INTO "{table_name}" ({cols}) VALUES %s'
        
        execute_values(pg_cursor, query, rows)
        print(f"   -> Đã chuyển thành công bảng {table_name}.")
        
        reset_sequence(pg_cursor, table_name)
        
    except Exception as e:
        print(f"   Lỗi ghi PostgreSQL bảng {table_name}: {e}")
        # Quan trọng: Nếu lỗi, phải rollback để không chặn các lệnh sau (Lỗi transaction aborted)
        pg_cursor.connection.rollback()

def main():
    if not os.path.exists(SQLITE_USER_DB):
        print(f"Lỗi: Không tìm thấy file {SQLITE_USER_DB}")
        return

    try:
        sq_conn = sqlite3.connect(SQLITE_USER_DB)
        sq_cursor = sq_conn.cursor()
        
        pg_conn = psycopg2.connect(host=PG_HOST, database=PG_DB, user=PG_USER, password=PG_PASS)
        pg_cursor = pg_conn.cursor()
        
        # Chuyển lần lượt
        migrate_table("user", sq_cursor, pg_cursor)
        migrate_table("route_history", sq_cursor, pg_cursor)
        migrate_table("favorite", sq_cursor, pg_cursor)
        
        pg_conn.commit()
        print("\n>>> HOÀN TẤT CHUYỂN ĐỔI USER DATA!")
        
    except Exception as e:
        print(f"Lỗi kết nối chung: {e}")
    finally:
        if 'sq_conn' in locals(): sq_conn.close()
        if 'pg_conn' in locals(): pg_conn.close()

if __name__ == "__main__":
    main()