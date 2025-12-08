import sqlite3
import json
import time
import re
import os
from outscraper import ApiClient
import config  # Import config

# --- CẤU HÌNH PHẠM VI ID ---
START_ID = 4000      # Sửa lại số này khi chạy thật
END_ID = 4001    # Quét hết

# --- PHẦN 1: KHỞI TẠO DATABASE ---

# --- HÀM KHỞI TẠO DB ĐÍCH ---
def init_target_db():
    conn = sqlite3.connect(config.DB_ENRICHED_PATH)
    cursor = conn.cursor()
    
    # Tạo bảng enriched
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS restaurants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            place_id TEXT UNIQUE,
            name TEXT,
            full_address TEXT,
            latitude REAL,
            longitude REAL,
            street TEXT,
            borough TEXT,
            city TEXT,
            country TEXT,
            rating REAL,
            range TEXT,
            working_hour TEXT,
            photo_url TEXT,
            street_view TEXT,
            phone TEXT,
            site TEXT,
            category TEXT,
            review_tags TEXT,
            subtypes TEXT,
            description TEXT
        )
    """)
    conn.commit()
    conn.close()

def get_source_data(start_id, end_id):
    if not os.path.exists(config.DB_RAW_PATH):
        print(f"❌ Lỗi: Không tìm thấy DB nguồn {config.DB_RAW_PATH}")
        return []

    conn = sqlite3.connect(config.DB_RAW_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT id, name, address, latitude, longitude "
            "FROM restaurants WHERE id BETWEEN ? AND ?",
            (start_id, end_id),
        )
        return cursor.fetchall()
    except Exception as e:
        print(f"❌ Lỗi đọc DB nguồn: {e}")
        return []
    finally:
        conn.close()

# --- HÀM XỬ LÝ DỮ LIỆU CHUYÊN BIỆT ---
def parse_working_hours(place_data):
    # Ưu tiên 1: Lấy từ dictionary working_hours (dữ liệu gốc chính xác nhất)
    raw_hours = place_data.get("working_hours")

    if isinstance(raw_hours, dict):
        # Lặp qua từng cặp (Thứ, Giờ)
        # Ví dụ: "Monday": "10AM-10PM"
        parts = []
        for day, hours in raw_hours.items():
            parts.append(f"{day}: {hours}")
        return " | ".join(parts)

    elif isinstance(raw_hours, list):
        # Trường hợp hiếm: API trả về list ["Monday: 10AM-10PM", ...]
        return " | ".join([str(item) for item in raw_hours])

    # Ưu tiên 2: Nếu không có working_hours, mới dùng csv_compatible
    csv_hours = place_data.get("working_hours_csv_compatible")
    if csv_hours:
        return csv_hours.replace(",", ": ").replace("|", " | ")

    return None


# --- PHẦN 2: HÀM DEBUG & LƯU DATA ---


def print_debug_data(data, processing_id):
    print("\n--------------------------------------------------")
    print(
        f"🛠 [Đang xử lý dòng ID gốc: {processing_id}] "
        f"-> Dữ liệu chuẩn bị lưu:"
    )
    print("--------------------------------------------------")
    print(f"🆔 Place ID:    {data['place_id']}")
    print(f"🏷 Name:        {data['name']}")
    print(f"📍 Address:     {data['full_address']}")
    print(f"📡 Coordinates: ({data['latitude']}, {data['longitude']})")
    print(f"⭐ Rating:      {data['rating']}")
    print(f"💰 Price:       {data['range']}")
    print(f"⏰ Working Hour:  {data['working_hour']}")
    print(f"📝 Description: {data['description']}")
    print(f"📂 Category:    {data['category']}")
    print(f"🏷 Subtypes:    {data['subtypes']}")
    print(f"💬 Tags:        {data['review_tags']}")
    print(
        f"📸 Photo:       {data['photo_url'][:50]}..."
        if data["photo_url"]
        else "📸 Photo: None"
    )
    print(f"🌐 Website:     {data['site']}")
    print("--------------------------------------------------\n")


def normalize_price_range(raw_range):
    if not raw_range:
        return None

    text = (
        raw_range.lower()
        .replace("vnđ", "")
        .replace("vnd", "")
        .replace("đ", "")
    )
    text = text.replace(",", ".").replace(" ", "")

    matches = re.findall(r"\d+\.?\d*\s*[k|m]?", text)

    if not matches:
        return None

    prices = []
    for m in matches:
        num = float(re.findall(r"\d+\.?\d*", m)[0])
        if "k" in m:
            num *= 1000
        elif "m" in m:
            num *= 1000000
        prices.append(num)

    if len(prices) == 1:
        avg_price = prices[0]
    else:
        avg_price = sum(prices) / len(prices)

    if avg_price < 75000:
        return "₫"
    elif avg_price < 200000:
        return "₫₫"
    elif avg_price < 500000:
        return "₫₫₫"
    else:
        return "₫₫₫₫"

def save_to_target_db(place_data, source_ref_id):
    place_id = place_data.get("place_id")
    name = place_data.get("name")

    if not place_id or not name:
        return

    conn = sqlite3.connect(config.DB_ENRICHED_PATH, timeout=30)
    cursor = conn.cursor()

    # --- 1. Trích xuất dữ liệu (Giữ nguyên logic cũ) ---
    full_address = place_data.get("full_address")
    latitude = place_data.get("latitude")
    longitude = place_data.get("longitude")
    street = place_data.get("street")
    borough = place_data.get("borough")
    city = place_data.get("city")
    country = place_data.get("country")
    rating = place_data.get("rating") or place_data.get("reviews_score")

    raw_price = (
        place_data.get("range")
        or place_data.get("price_level")
        or place_data.get("price")
    )
    price_level = normalize_price_range(raw_price)

    working_hour_str = parse_working_hours(place_data)

    photo_url = place_data.get("photo")
    if not photo_url:
        photos_list = place_data.get("photos")
        if photos_list and len(photos_list) > 0:
            photo_url = photos_list[0]

    site = place_data.get("site") or place_data.get("website")
    street_view = place_data.get("street_view")
    phone = place_data.get("phone")
    category = place_data.get("category")
    description = (
        place_data.get("description")
        or place_data.get("about", {}).get("summary")
    )

    tags_raw = place_data.get("reviews_tags")
    review_tags_str = (
        json.dumps(tags_raw, ensure_ascii=False) if tags_raw else None
    )
    subtypes_raw = place_data.get("subtypes")
    subtypes_str = (
        json.dumps(subtypes_raw, ensure_ascii=False)
        if isinstance(subtypes_raw, list)
        else subtypes_raw
    )

    final_data = {
        "place_id": place_id,
        "name": name,
        "full_address": full_address,
        "latitude": latitude,
        "longitude": longitude,
        "street": street,
        "borough": borough,
        "city": city,
        "country": country,
        "rating": rating,
        "range": price_level,
        "working_hour": working_hour_str,
        "photo_url": photo_url,
        "street_view": street_view,
        "phone": phone,
        "site": site,
        "category": category,
        "review_tags": review_tags_str,
        "subtypes": subtypes_str,
        "description": description,
    }

    print_debug_data(final_data, source_ref_id)

    # --- 2. SỬ DỤNG INSERT OR IGNORE ---
    # Cú pháp này tự động bỏ qua nếu trùng UNIQUE key (ở đây là place_id)
    sql = """
        INSERT OR IGNORE INTO restaurants (
            place_id, name, full_address, latitude, longitude, street,
            borough, city, country, rating, range, working_hour,
            photo_url, street_view, phone, site,
            category, review_tags, subtypes, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    values = tuple(final_data.values())

    try:
        cursor.execute(sql, values)
        conn.commit()

        # Kiểm tra xem có dòng nào thực sự được thêm vào không
        if cursor.rowcount > 0:
            print(f"✅ [Dòng {source_ref_id}] Đã lưu mới thành công.")
        else:
            # rowcount = 0 nghĩa là nó đã IGNORE (bỏ qua) do trùng lặp
            print(
                f"⏭ [Dòng {source_ref_id}] Bỏ qua: "
                "Dữ liệu đã tồn tại (Trùng Place ID)."
            )

    except sqlite3.OperationalError as e:
        if "locked" in str(e):
            print("❌ Database Locked: Hãy đóng phần mềm xem DB.")
        else:
            print(f"❌ Lỗi SQLite: {e}")
    except Exception as e:
        print(f"❌ Lỗi chung: {e}")
    finally:
        conn.close()


# --- PHẦN 3: CHẠY CHƯƠNG TRÌNH ---
def main():
    init_target_db()
    
    # Lấy API Key từ config (Đã sửa lỗi hardcode rỗng)
    if not config.OUTSCRAPER_API_KEY:
        print("❌ Lỗi: Chưa có OUTSCRAPER_API_KEY trong .env")
        return

    print(f"\n📡 Đang đọc dữ liệu từ dòng {START_ID} đến {END_ID}...")
    source_rows = get_source_data(START_ID, END_ID)

    if not source_rows:
        print("⚠ Không tìm thấy dữ liệu nguồn.")
        return

    print(f"📋 Tìm thấy {len(source_rows)} địa điểm. Bắt đầu OutScraper...")
    client = ApiClient(api_key=config.OUTSCRAPER_API_KEY)

    for row in source_rows:
        src_id, src_name, src_address, src_lat, src_lng = row
        query = f"{src_name} + {src_address} near {src_lat},{src_lng}"
        print(f"🔎 [Dòng {src_id}] Searching: {query}")

        try:
            results = client.google_maps_search(
                query, limit=1, language="vi", region="VN"
            )

            if results and len(results) > 0:
                place_list = results[0]
                if place_list and len(place_list) > 0:
                    save_to_target_db(place_list[0], src_id)
                else:
                    print(f"⚠ [Dòng {src_id}] API trả về danh sách rỗng.")
            else:
                print(f"⚠ [Dòng {src_id}] Không có dữ liệu trả về.")
        except Exception as e:
            print(f"❌ [Dòng {src_id}] Lỗi API: {e}")

        time.sleep(1)

    print("\n🎉 Hoàn tất!")


if __name__ == "__main__":
    main()
