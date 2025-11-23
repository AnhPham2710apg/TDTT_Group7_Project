import sqlite3
import json
import re
import os
import logging
from datetime import datetime

# --- CẤU HÌNH ĐƯỜNG DẪN DB ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_DB = os.path.join(BASE_DIR, 'db', 'restaurants_enrich.db')
TARGET_DB = os.path.join(BASE_DIR, 'db', 'restaurants_processed.db')

BATCH_SIZE = 1000  # Số lượng dòng insert mỗi lần (Tối ưu hiệu suất)

# Thiết lập Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

# --- TỪ ĐIỂN TỪ KHÓA (DỄ DÀNG MỞ RỘNG) ---
KEYWORDS_CONFIG = {
    'cuisine': {
        'Việt': r'\b(việt|viet|vietnamese|phở|bún|cơm|hủ tiếu|bánh mì|gỏi cuốn|chả cá|lẩu mắm|bò kho|cháo|lòng)\b',
        'Hàn': r'\b(hàn|korea|korean|kimchi|kimbap|tokbokki|bibimbap|seoul|mì cay|bbq hàn|thịt nướng hàn)\b',
        'Nhật': r'\b(nhật|japan|japanese|sushi|sashimi|ramen|udon|tempura|wagyu|mochi|teriyaki)\b',
        'Trung': r'\b(trung|china|chinese|dimsum|há cảo|quảng đông|hongkong|vịt quay|sủi cảo|người hoa|tứ xuyên|hồng kông)\b',
        'Thái': r'\b(thái|thai|tomyum|pad thai|lẩu thái|som tum|chè thái)\b',
        'Ý': r'\b(ý|italian|pizza|pasta|spaghetti|lasagna|carbonara)\b',
        'Pháp': r'\b(pháp|french|bistro|croissant|baguette|pâté)\b',
        'Âu/Mỹ': r'\b(âu|mỹ|american|usa|burger|steak|western|beefsteak|texas|fast food|gà rán|kfc|mcdonald)\b',
    },
    'food_type': {
        'chay': r'\b(chay|vegan|vegetarian|thực dưỡng|buddha|rau củ)\b'
    },
    'beverage': r'\b(cafe|coffee|tea|trà|nước|bar|pub|beer|sinh tố|juice|milktea|phúc long|highlands|starbucks|đá xay)\b',
    'food': r'\b(nhà hàng|restaurant|quán ăn|bún|phở|cơm|lẩu|nướng|món|bánh mì|pizza|sushi|mì)\b',
    'course_type': {
        'tráng miệng': r'\b(dessert|bakery|ice cream|bánh|chè|kem|ngọt|ăn vặt|tráng miệng|yogurt|rau câu|bánh flan)\b',
        'món khai vị': r'\b(khai vị|salad|gỏi|soup|chả giò)\b'
    },
    'flavor': {
        'cay': r'\b(cay|spicy|sate|sa tế|tiêu|ớt|tomyum|mì cay|sichuan)\b',
        'ngọt': r'\b(ngọt|sweet|chè|bánh|kem|sữa|trà sữa|đường)\b',
        'chua': r'\b(chua|sour|me|giấm|chanh|tomyum|xoài)\b',
        'đắng': r'\b(đắng|bitter|cafe|coffee|socola đen)\b',
        'mặn': r'\b(mặn|nước mắm|kho|muối|đậm đà|hải sản)\b'
    }
}

# --- 1. LOGIC XỬ LÝ (CLASSIFICATION) ---

def get_full_text(row):
    """Gộp và làm sạch text đầu vào."""
    parts = [
        row['name'], row['category'], row['subtypes'], 
        row['description'], row['review_tags']
    ]
    return " ".join([str(p).lower() for p in parts if p])

def map_cuisine(text):
    for cuisine, pattern in KEYWORDS_CONFIG['cuisine'].items():
        if re.search(pattern, text):
            return cuisine
    return 'Khác'

def map_food_type(text):
    if re.search(KEYWORDS_CONFIG['food_type']['chay'], text):
        return 'chay'
    return 'mặn'

def map_beverage_or_food(text):
    is_drink = re.search(KEYWORDS_CONFIG['beverage'], text)
    is_food = re.search(KEYWORDS_CONFIG['food'], text)
    
    if is_drink and is_food: return 'cả 2'
    if is_drink: return 'nước'
    return 'khô' 

def map_course_type(text, bev_or_food):
    if bev_or_food == 'nước': return 'đồ uống'
    if re.search(KEYWORDS_CONFIG['course_type']['tráng miệng'], text): return 'tráng miệng'
    if re.search(KEYWORDS_CONFIG['course_type']['món khai vị'], text): return 'món khai vị'
    return 'món chính'

def map_flavor(text, cuisine):
    flavors = set()
    # Check theo keyword
    for flavor_name, pattern in KEYWORDS_CONFIG['flavor'].items():
        if re.search(pattern, text):
            flavors.add(flavor_name)

    # Fallback logic (Suy luận nếu không tìm thấy tag)
    if not flavors:
        if cuisine == 'Thái': flavors.update(['chua', 'cay'])
        elif cuisine == 'Hàn': flavors.add('cay')
        elif cuisine == 'Việt': flavors.add('mặn')
    
    return list(flavors)

def map_district(address):
    if not address: return 'Khác'
    
    # Regex cải tiến: Bắt Q1, Q.1, Quận 1, TP Thủ Đức, Nhà Bè...
    pattern = r'(Quận\s\d+|Quận\s[A-Za-zÀ-ỹ]+|District\s\d+|Thành phố\sThủ Đức|TP\.?\s?Thủ Đức|Huyện\s[A-Za-zÀ-ỹ]+|Gò Vấp|Bình Thạnh|Tân Bình|Tân Phú|Phú Nhuận|Bình Tân|Q\.?\s?\d+)'
    
    match = re.search(pattern, address, re.IGNORECASE)
    if match:
        d = match.group(0).title() # Viết hoa chữ cái đầu
        
        # Chuẩn hóa tên
        d = re.sub(r'Q\.?\s?(\d+)', r'Quận \1', d) # Q.1 -> Quận 1
        d = d.replace("Tp.", "Thành Phố").replace("Tp ", "Thành Phố ")
        return d.strip()
        
    return 'Khác'

def map_price_range(range_str):
    """
    Logic giá: 1k-100k | 100k-500k | 500k-2tr | 2tr-10tr
    """
    if not range_str: 
        return 0, 5000000 
    
    r = str(range_str).strip()
    length = len(r)

    # Mapping an toàn
    if length == 1 or r == 'PRICE_LEVEL_INEXPENSIVE': return 1000, 100000
    if length == 2 or r == 'PRICE_LEVEL_MODERATE': return 100000, 500000
    if length == 3 or r == 'PRICE_LEVEL_EXPENSIVE': return 500000, 2000000
    if length == 4 or r == 'PRICE_LEVEL_VERY_EXPENSIVE': return 2000000, 10000000 
        
    return 0, 5000000

# --- 2. QUY TRÌNH MIGRATION ---

def create_processed_db():
    if not os.path.exists(SOURCE_DB):
        logger.error(f"Không tìm thấy DB nguồn: {SOURCE_DB}")
        return

    # Xóa DB cũ nếu tồn tại
    if os.path.exists(TARGET_DB):
        try:
            os.remove(TARGET_DB)
            logger.info(f"Đã xóa database cũ: {TARGET_DB}")
        except OSError as e:
            logger.error(f"Không thể xóa file DB cũ: {e}")
            return

    try:
        # Kết nối DB
        src_conn = sqlite3.connect(SOURCE_DB)
        src_conn.row_factory = sqlite3.Row
        src_cur = src_conn.cursor()

        tgt_conn = sqlite3.connect(TARGET_DB)
        tgt_cur = tgt_conn.cursor()

        # Tắt synchronous để insert nhanh hơn (chỉ dùng khi tạo mới DB)
        tgt_cur.execute("PRAGMA synchronous = OFF")
        tgt_cur.execute("PRAGMA journal_mode = MEMORY")

        logger.info("Đang khởi tạo cấu trúc bảng...")
        tgt_cur.execute('''
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
                range TEXT, 
                
                -- CỘT INFERRED
                foodType TEXT,
                bevFood TEXT,
                cuisine TEXT,
                flavor TEXT,
                courseType TEXT,
                district TEXT,
                minPrice INTEGER,
                maxPrice INTEGER
            )
        ''')

        # Đọc dữ liệu
        logger.info("Đang đọc dữ liệu từ nguồn...")
        src_cur.execute("SELECT * FROM restaurants")
        rows = src_cur.fetchall()
        total_rows = len(rows)
        logger.info(f"Tổng số dòng cần xử lý: {total_rows}")

        batch_data = []
        count = 0

        for row in rows:
            try:
                # Logic xử lý từng dòng
                full_text = get_full_text(row)
                address = row['full_address'] or row['borough'] or ""
                
                cuisine = map_cuisine(full_text)
                food_type = map_food_type(full_text)
                bev_food = map_beverage_or_food(full_text)
                course_type = map_course_type(full_text, bev_food)
                
                flavor_list = map_flavor(full_text, cuisine)
                flavor_json = json.dumps(flavor_list, ensure_ascii=False)
                
                district = map_district(address)
                min_p, max_p = map_price_range(row['range'])

                # Gom dữ liệu vào tuple
                data_tuple = (
                    row['place_id'], row['name'], row['full_address'], row['latitude'], row['longitude'],
                    row['rating'], row['working_hour'], row['photo_url'], row['street_view'], row['phone'], row['site'],
                    row['category'], row['review_tags'], row['subtypes'], row['description'], row['range'],
                    food_type, bev_food, cuisine, 
                    flavor_json, course_type, district, 
                    min_p, max_p
                )
                batch_data.append(data_tuple)
                count += 1

                # Batch Insert
                if len(batch_data) >= BATCH_SIZE:
                    tgt_cur.executemany('''
                        INSERT INTO restaurants (
                            place_id, name, full_address, latitude, longitude, 
                            rating, working_hour, photo_url, street_view, phone, site,
                            category, review_tags, subtypes, description, range,
                            foodType, bevFood, cuisine, flavor, courseType, district, 
                            minPrice, maxPrice
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', batch_data)
                    tgt_conn.commit()
                    batch_data = [] # Reset batch
                    logger.info(f"Đã xử lý: {count}/{total_rows}")

            except Exception as e:
                logger.warning(f"Lỗi xử lý dòng ID {row.get('id', 'Unknown')}: {e}")
                continue

        # Insert nốt số dữ liệu còn lại trong batch
        if batch_data:
            tgt_cur.executemany('''
                INSERT INTO restaurants (
                    place_id, name, full_address, latitude, longitude, 
                    rating, working_hour, photo_url, street_view, phone, site,
                    category, review_tags, subtypes, description, range,
                    foodType, bevFood, cuisine, flavor, courseType, district, 
                    minPrice, maxPrice
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', batch_data)
            tgt_conn.commit()

        # Tạo Index để search nhanh hơn
        logger.info("Đang tạo chỉ mục (Index)...")
        tgt_cur.execute("CREATE INDEX idx_min_price ON restaurants(minPrice)")
        tgt_cur.execute("CREATE INDEX idx_max_price ON restaurants(maxPrice)")
        tgt_cur.execute("CREATE INDEX idx_cuisine ON restaurants(cuisine)")
        tgt_cur.execute("CREATE INDEX idx_district ON restaurants(district)")

        logger.info(f"✅ HOÀN TẤT! Đã chuyển đổi {count} nhà hàng sang {TARGET_DB}")

    except sqlite3.Error as e:
        logger.error(f"Lỗi Database nghiêm trọng: {e}")
    finally:
        if src_conn: src_conn.close()
        if tgt_conn: tgt_conn.close()

# --- 3. TEST (VALIDATION) ---

def test_search_example():
    if not os.path.exists(TARGET_DB): return

    conn = sqlite3.connect(TARGET_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    print("\n" + "="*30)
    print("🔍 KIỂM TRA DỮ LIỆU SAU KHI XỬ LÝ")
    print("="*30)
    
    # Test 1: Thống kê Cuisine
    cur.execute("SELECT cuisine, COUNT(*) as c FROM restaurants GROUP BY cuisine ORDER BY c DESC LIMIT 5")
    print("\n--- Top 5 Ẩm thực phổ biến ---")
    for r in cur.fetchall():
        print(f"{r['cuisine']}: {r['c']}")

    # Test 2: Check giá
    cur.execute("SELECT name, minPrice, maxPrice FROM restaurants WHERE minPrice > 0 LIMIT 3")
    print("\n--- Ví dụ về Giá ---")
    for r in cur.fetchall():
        print(f"{r['name']}: {r['minPrice']:,}đ - {r['maxPrice']:,}đ")

    conn.close()

if __name__ == "__main__":
    create_processed_db()
    test_search_example()