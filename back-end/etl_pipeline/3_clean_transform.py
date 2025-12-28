import sqlite3
import json
import re
import os
import logging
import time
from deep_translator import GoogleTranslator
import config

# --- CẤU HÌNH ĐƯỜNG DẪN ---
SOURCE_DB = config.DB_AI_TAGGED  # Input
TARGET_DB = config.DB_FINAL_PATH # Output

BATCH_SIZE = 1000

# Thiết lập Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# --- 1. TỪ ĐIỂN TỪ KHÓA NÂNG CAO ---
KEYWORDS_CONFIG = {
    "cuisine": {
        "Nhật Bản": r"\b(nhật|nhat|japan|japanese|nhat ban|sushi|sashimi|ramen|udon|tempura|takoyaki|bento|izakaya|omakase|teriyaki|wasabi)\b",
        "Hàn Quốc": r"\b(han|hàn|korea|korean|han quoc|gim bap|kimbap|tokbokki|bibimbap|bbq hàn|kimchi|soju)\b",
        "Trung Quốc": r"\b(trung|trung hoa|china|chinese|dimsum|hã cảo|sủi cảo|mì gia|vịt quay|tứ xuyên)\b",
        "Thái Lan": r"\b(thái|thai|tom yum|padthai|lẩu thái|xôi xoài)\b",
        "Ý": r"\b(ý|italy|italian|pizza|pasta|spaghetti|mì ý|risotto|lasagna)\b",
        "Pháp": r"\b(pháp|french|france|croissant|baguette|pate|gan ngỗng|macaron|crepe)\b",
        "Âu/Mỹ": r"\b(âu|mỹ|american|western|fastfood|burger|gà rán|steak|beefsteak|bbq|texas)\b",
        "Ấn Độ": r"\b(ấn|india|indian|cà ri|curry|masala|naan)\b",
        "Việt Nam": r"\b(viet|viet nam|phở|bún|hủ tiếu|bánh mì|cơm|gỏi|lẩu|kho|xào)\b",
    },
    "food_type": {
        "chay": r"\b(chay|vegan|vegetarian|tofu|đậu hũ|nấm|rau củ|thực dưỡng)\b"
    },
    "beverage": r"\b(cafe|cà phê|coffee|tea|trà|nước|juice|sinh tố|smoothie|milktea|trà sữa|bia|rượu|cocktail)\b",
    "food_exclusion": r"\b(nhà hàng|quán ăn|bún|phở|cơm|lẩu|nướng|bánh mì|pizza)\b",
    "course_type": {
        "tráng miệng": r"\b(tráng miệng|dessert|chè|kem|ice cream|bánh ngọt|cake|pudding)\b",
        "món khai vị": r"\b(khai vị|appetizer|salad|gỏi|súp|soup|chả giò|khoai tây chiên)\b",
    },
    "flavor_direct": {
        "cay": r"\b(cay|spicy|ớt|sa tế|mì cay)\b",
        "ngọt": r"\b(ngọt|sweet|đường|mật ong|kem|chè)\b",
        "chua": r"\b(chua|sour|chanh|me|giấm)\b",
        "đắng": r"\b(đắng|bitter|cafe|cà phê)\b",
        "mặn": r"\b(mặn|nước mắm|muối|kho|rim)\b",
        "béo": r"\b(béo|fatty|cheese|phô mai|bơ|sữa|cốt dừa)\b",
        "thanh đạm": r"\b(thanh|light|healthy|luộc|hấp|rau)\b",
    },
    "flavor_inference_dishes": {
        "mặn": r"\b(kho tộ|mắm|bún đậu|cơm tấm|thịt kho|cá kho)\b",
        "béo": r"\b(trà sữa|carbonara|pizza|gà rán|khoai tây chiên)\b",
        "cay": r"\b(bún bò huế|lẩu thái|mì cay|kimchi)\b",
        "ngọt": r"\b(chè|bánh flan|trà sữa|sinh tố)\b",
    }
}

# --- 2. HÀM XỬ LÝ TEXT ---
def clean_text(text):
    if not text: return ""
    text = str(text).lower().replace("\n", " ").replace(",", " ").replace(".", " ")
    return re.sub(r"\s+", " ", text).strip()

def get_full_text(row):
    # Sử dụng phương pháp an toàn để tránh lỗi KeyError
    parts = []
    # Danh sách các cột có thể dùng để phân tích (nếu có trong DB)
    possible_keys = ["name", "category", "subtypes", "description", "review_tags", "cuisine_origin", "ai_vibe"]
    
    for key in possible_keys:
        # row.keys() trả về danh sách tên cột của dòng hiện tại
        if key in row.keys() and row[key]:
            parts.append(str(row[key]))
            
    return clean_text(" ".join(parts))

def translate_to_english(text):
    if not text or len(str(text).strip()) < 5: return ""
    try:
        return GoogleTranslator(source='auto', target='en').translate(text)
    except:
        return text 

# --- 3. MAPPING LOGIC ---
def map_cuisine(text):
    for cuisine, pattern in KEYWORDS_CONFIG["cuisine"].items():
        if cuisine != "Việt Nam" and re.search(pattern, text): return cuisine
    if re.search(KEYWORDS_CONFIG["cuisine"]["Việt Nam"], text): return "Việt Nam"
    return "Khác"

def map_food_type(text):
    if re.search(KEYWORDS_CONFIG["food_type"]["chay"], text): return "chay"
    return "mặn"

def map_beverage_or_food(text, category):
    text_check = text + " " + clean_text(category)
    is_drink = re.search(KEYWORDS_CONFIG["beverage"], text_check)
    is_food = re.search(KEYWORDS_CONFIG["food_exclusion"], text_check)
    if is_drink and is_food: return "cả 2"
    if is_drink: return "nước"
    return "khô"

def map_course_type(text, bev_or_food):
    if bev_or_food == "nước": return "đồ uống"
    if re.search(KEYWORDS_CONFIG["course_type"]["tráng miệng"], text): return "tráng miệng"
    if re.search(KEYWORDS_CONFIG["course_type"]["món khai vị"], text): return "món khai vị"
    return "món chính"

def map_flavor(text, cuisine, category, bev_or_food):
    flavors = set()
    category = clean_text(category)
    for flavor, pattern in KEYWORDS_CONFIG["flavor_direct"].items():
        if re.search(pattern, text): flavors.add(flavor)
    for flavor, pattern in KEYWORDS_CONFIG["flavor_inference_dishes"].items():
        if re.search(pattern, text): flavors.add(flavor)
    
    if re.search(r"\b(dessert|bakery|ice cream|trà sữa|chè|bánh)\b", text): flavors.add("ngọt")
    if cuisine == "Thái Lan": flavors.update(["chua", "cay"])
    elif cuisine == "Hàn Quốc": flavors.add("cay")
    elif cuisine == "Việt Nam" and bev_or_food != "nước" and "ngọt" not in flavors: flavors.add("mặn")
    
    return list(flavors)

def map_district(address):
    if not address: return "Khác"
    pattern = r"(q[0-9]+|quận\s?[0-9]+|quan\s?[0-9]+|district\s?[0-9]+|gò vấp|bình thạnh|tân bình|tân phú|phú nhuận|bình tân|thủ đức|hóc môn|củ chi|nhà bè|bình chánh)\b"
    match = re.search(pattern, address, re.IGNORECASE)
    if match:
        d = match.group(0).title()
        d = re.sub(r"Q\.?\s?(\d+)", r"Quận \1", d)
        d = d.replace("Tp.", "Thành Phố").replace("Tp ", "Thành Phố ")
        return d.strip()
    return "Khác"

def calculate_range_score(range_str):
    if not range_str: return 1
    r = str(range_str).strip()
    if "VERY_EXPENSIVE" in r: return 4
    if "EXPENSIVE" in r: return 3
    if "MODERATE" in r: return 2
    if "INEXPENSIVE" in r: return 1
    count = r.count('₫')
    if count > 0: return min(count, 4)
    # Fallback cho số
    if r.isdigit() and 1 <= int(r) <= 4: return int(r)
    return 1

def map_price_range(range_str):
    score = calculate_range_score(range_str)
    if score == 1: return 1000, 100000
    if score == 2: return 100000, 500000
    if score == 3: return 500000, 2000000
    if score == 4: return 2000000, 10000000
    return 0, 5000000

# --- 4. MAIN PROCESSING ---
def create_processed_db():
    if not os.path.exists(SOURCE_DB):
        logger.error(f"Không tìm thấy DB nguồn: {SOURCE_DB}")
        return

    # Xóa DB cũ nếu có (Tránh lỗi table already exists)
    if os.path.exists(TARGET_DB):
        try: os.remove(TARGET_DB)
        except: pass

    try:
        src_conn = sqlite3.connect(SOURCE_DB)
        src_conn.row_factory = sqlite3.Row
        src_cur = src_conn.cursor()

        tgt_conn = sqlite3.connect(TARGET_DB)
        tgt_cur = tgt_conn.cursor()
        tgt_cur.execute("PRAGMA synchronous = OFF")

        # Đảm bảo xóa bảng cũ nếu remove file thất bại
        tgt_cur.execute("DROP TABLE IF EXISTS restaurants")

        # 1. TẠO BẢNG ĐÍCH
        tgt_cur.execute("""
            CREATE TABLE restaurants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                place_id TEXT UNIQUE,
                name TEXT,
                full_address TEXT,
                latitude REAL,
                longitude REAL,
                rating REAL,
                working_hour TEXT,
                photo_url TEXT,
                street_view TEXT,
                phone TEXT,
                site TEXT,
                category TEXT,
                review_tags TEXT,
                subtypes TEXT,
                description TEXT,
                description_en TEXT,
                range INTEGER,
                foodType TEXT,
                bevFood TEXT,
                cuisine TEXT,
                flavor TEXT,
                courseType TEXT,
                district TEXT,
                minPrice INTEGER,
                maxPrice INTEGER
            )
        """)

        logger.info("Đang đọc dữ liệu từ DB nguồn...")
        
        # --- QUAN TRỌNG: CHỈ SELECT CÁC CỘT CÓ TRONG MODELS.PY ---
        # Không select street, borough, city, country
        src_cur.execute("SELECT * FROM restaurants")
        rows = src_cur.fetchall()
        
        batch_data = []
        count = 0
        total_rows = len(rows)

        insert_sql = """
            INSERT INTO restaurants (
                place_id, name, full_address, latitude, longitude,
                rating, working_hour, photo_url, street_view, phone, site,
                category, review_tags, subtypes, description, description_en, range,
                foodType, bevFood, cuisine, flavor, courseType, district,
                minPrice, maxPrice
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """

        print("🚀 Đang xử lý và dịch dữ liệu...")

        for row in rows:
            try:
                # Helper function để lấy giá trị an toàn (tránh lỗi nếu cột không tồn tại)
                def get_val(col_name, default=""):
                    return row[col_name] if col_name in row.keys() and row[col_name] is not None else default

                # Logic: Lấy địa chỉ từ full_address
                full_addr = get_val("full_address")
                
                full_text = get_full_text(row)
                category_orig = get_val("category")

                # Mapping logic
                cuisine = map_cuisine(full_text)
                food_type = map_food_type(full_text)
                bev_food = map_beverage_or_food(full_text, category_orig)
                course_type = map_course_type(full_text, bev_food)
                flavor_json = json.dumps(map_flavor(full_text, cuisine, category_orig, bev_food), ensure_ascii=False)
                district = map_district(full_addr)
                
                range_raw = get_val("range")
                min_p, max_p = map_price_range(range_raw)
                range_score = calculate_range_score(range_raw)

                # Dịch thuật
                desc_vi = get_val("description")
                desc_en = ""
                if desc_vi:
                    desc_en = translate_to_english(desc_vi)
                    if count % 20 == 0 and count > 0: time.sleep(0.5)

                data_tuple = (
                    get_val("place_id"), 
                    get_val("name"), 
                    full_addr, 
                    get_val("latitude", 0.0), 
                    get_val("longitude", 0.0),
                    get_val("rating", 0.0), 
                    get_val("working_hour"), 
                    get_val("photo_url"), 
                    get_val("street_view"), 
                    get_val("phone"), 
                    get_val("site"),
                    category_orig, 
                    get_val("review_tags"), 
                    get_val("subtypes"),
                    desc_vi, 
                    desc_en, 
                    range_score,
                    food_type, bev_food, cuisine, flavor_json, course_type, district, min_p, max_p
                )
                batch_data.append(data_tuple)
                count += 1

                if len(batch_data) >= BATCH_SIZE:
                    tgt_cur.executemany(insert_sql, batch_data)
                    tgt_conn.commit()
                    batch_data = []
                    logger.info(f"Progress: {count}/{total_rows}")

            except Exception as e:
                # logger.warning(f"Error row {count}: {e}") # Uncomment để debug
                continue

        if batch_data:
            tgt_cur.executemany(insert_sql, batch_data)
            tgt_conn.commit()

        # Tạo Index
        try:
            tgt_cur.execute("CREATE INDEX idx_min_price ON restaurants(minPrice)")
            tgt_cur.execute("CREATE INDEX idx_range ON restaurants(range)")
        except: pass

        logger.info(f"✅ XONG! Tổng cộng {count} nhà hàng.")

    except Exception as e:
        logger.error(f"FATAL ERROR: {e}")
    finally:
        if "src_conn" in locals(): src_conn.close()
        if "tgt_conn" in locals(): tgt_conn.close()

# --- 5. TEST FUNCTION ---
def test_results():
    if not os.path.exists(TARGET_DB):
        return
    conn = sqlite3.connect(TARGET_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    print("\n--- TEST: CHECK TRANSLATION ---")
    cur.execute(
        "SELECT name, description, description_en FROM restaurants "
        "WHERE description IS NOT NULL LIMIT 3"
    )
    for r in cur.fetchall():
        print(f"Name: {r['name']}")
        print(f"VI: {r['description'][:50]}...")
        print(f"EN: {r['description_en'][:50]}...")
        print("-" * 30)

    conn.close()

if __name__ == "__main__":
    create_processed_db()
    test_results()