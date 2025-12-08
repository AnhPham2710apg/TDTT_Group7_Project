import sqlite3
from sqlite3 import Error
import config  # Import config cùng thư mục

def create_connection():
    """Tạo kết nối đến tệp database SQLite (Raw Data)"""
    conn = None
    try:
        # Sử dụng đường dẫn từ config
        conn = sqlite3.connect(config.DB_RAW_PATH)
        print(f"✅ Đã kết nối SQLite: {config.DB_RAW_PATH}")
        return conn
    except Error as e:
        print(f"❌ Lỗi kết nối DB: {e}")
    return conn

def create_table(conn):
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS restaurants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goong_place_id TEXT NOT NULL UNIQUE,
        name TEXT,
        address TEXT,
        latitude REAL,
        longitude REAL,
        province TEXT,
        district TEXT,
        commune TEXT
    );
    """
    try:
        c = conn.cursor()
        c.execute(create_table_sql)
    except Error as e:
        print(e)

def insert_restaurant(conn, restaurant_data):
    sql = """ INSERT OR IGNORE INTO restaurants(
                goong_place_id, name, address, latitude, longitude,
                province, district, commune
              )
              VALUES(?,?,?,?,?,?,?,?) """
    try:
        cur = conn.cursor()
        cur.execute(sql, (
            restaurant_data["goong_place_id"],
            restaurant_data["name"],
            restaurant_data["address"],
            restaurant_data["latitude"],
            restaurant_data["longitude"],
            restaurant_data.get("province"),
            restaurant_data.get("district"),
            restaurant_data.get("commune"),
        ))
        conn.commit()
        return cur.lastrowid
    except Error as e:
        print(f"Lỗi khi chèn dữ liệu: {e}")
        return None