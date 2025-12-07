# database.py
import os
import sqlite3
from sqlite3 import Error

# Lấy đường dẫn file này -> trỏ ra cha -> vào db
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_FILE = os.path.join(BASE_DIR, "db", "restaurants_hcmc.db")


def create_connection():
    """Tạo kết nối đến tệp database SQLite"""
    conn = None
    try:
        conn = sqlite3.connect(DB_FILE)
        print(f"Đã kết nối đến SQLite, phiên bản {sqlite3.version}")
        return conn
    except Error as e:
        print(e)
    return conn


def create_table(conn):
    """Tạo bảng 'restaurants' nếu nó chưa tồn tại"""
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
        print("Đã tạo bảng 'restaurants' (hoặc đã tồn tại).")
    except Error as e:
        print(e)


def insert_restaurant(conn, restaurant_data):
    """
    Chèn một nhà hàng mới vào bảng 'restaurants'.
    Sử dụng 'INSERT OR IGNORE' để bỏ qua nếu 'goong_place_id' đã tồn tại.
    """
    sql = """ INSERT OR IGNORE INTO restaurants(
                goong_place_id, name, address, latitude, longitude,
                province, district, commune
              )
              VALUES(?,?,?,?,?,?,?,?) """
    try:
        cur = conn.cursor()
        cur.execute(
            sql,
            (
                restaurant_data["goong_place_id"],
                restaurant_data["name"],
                restaurant_data["address"],
                restaurant_data["latitude"],
                restaurant_data["longitude"],
                restaurant_data.get("province"),
                restaurant_data.get("district"),
                restaurant_data.get("commune"),
            ),
        )
        conn.commit()
        return cur.lastrowid
    except Error as e:
        print(f"Lỗi khi chèn dữ liệu: {e}")
        return None
