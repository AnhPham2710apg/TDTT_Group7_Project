import sqlite3
import json
import re
import os
import logging

# --- CẤU HÌNH ĐƯỜNG DẪN ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Nếu bạn muốn đọc từ CSV, hãy sửa đoạn code đọc dữ liệu bên dưới.
# Mặc định code này đang đọc từ DB như bạn cung cấp.
SOURCE_DB = os.path.join(BASE_DIR, "db", "restaurants_enriched.db")
TARGET_DB = os.path.join(BASE_DIR, "db", "restaurants_processed.db")

BATCH_SIZE = 1000

# Thiết lập Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# --- 1. TỪ ĐIỂN TỪ KHÓA NÂNG CAO (SUPER DICTIONARY) ---
# (Phần này được giữ nguyên như code gốc của bạn)
KEYWORDS_CONFIG = {
    "cuisine": {
        "Nhật Bản": (
            r"\b(nhật|nhat|japan|japanese|nhat ban|nhật-bản|sushi|sashimi|"
            r"ramen|udon|tempura|takoyaki|takoyaki|donburi|bento|izakaya|"
            r"omakase|mochi|teriyaki|wasabi|nhatphong|nhat phong|nhậu nhật|"
            r"quán nhật|jpan|jp style|mi nhật|mi nhat)\b"
        ),
        "Hàn Quốc": (
            r"\b(han|hàn|korea|korean|han quoc|hàn quốc|gim bap|kimbap|"
            r"kim bap|tokbokki|tokboki|tok boki|teokbokki|tteokbokki|"
            r"bibimbap|bbq hàn|bbq han|mi cay|mì cay|mi cay 7 cap|7 cap|"
            r"kimchi|seoul|soju|quán hàn|hanstyle|h-style)\b"
        ),
        "Trung Quốc": (
            r"\b(trung|trung hoa|trunghoa|china|chinese|hồng kông|hong kong|"
            r"hongkong|hk|dimsum|diem sum|hã cảo|ha cao|xiao long bao|"
            r"sủi cảo|sui cao|mie ho|mi ho|mì ho|mì gia|my gia|mỳ|"
            r"mỳ vịt quay|vịt quay|tứ xuyên|tứxuyên|thượng hải|shanghai|"
            r"tieng hoa)\b"
        ),
        "Thái Lan": (
            r"\b(thái|thai|thaistyle|thái lan|tay lan|tom yum|tomyum|"
            r"padthai|pad thai|somtum|som tum|lẩu thái|lau thai|chả thai|"
            r"xôi xoài|xoi xoai|trà thái|tra thai|gỏi đu đủ|goi du du)\b"
        ),
        "Ý": (
            r"\b(ý|italy|italian|y|pizza|piza|piza|pissa|past[aơ]|"
            r"spagetti|spaghetti|mì ý|mi y|my y|gelato|risotto|tiramisu|"
            r"lasagna|bolognese|carbonara|macaroni|pasta house)\b"
        ),
        "Pháp": (
            r"\b(pháp|phap|french|france|bánh pháp|banh phap|croissant|"
            r"bánh sừng trâu|baguette|bánh mì pháp|pate|patê|gan ngỗng|"
            r"foie gras|macaron|macarong|crepe|cafe pháp)\b"
        ),
        "Âu/Mỹ": (
            r"\b(âu|au|mỹ|my|american|western|fastfood|fast food|burger|"
            r"bơ gơ|gà rán|ga ran|fried chicken|steak|mì ý|beefsteak|"
            r"bò bít tết|bit tet|pizza kiểu mỹ|kfc|mcdonalds|mc donald|"
            r"lotteria|bánh burger|pate|khoai tây chiên|bbq|texas)\b"
        ),
        "Ấn Độ": (
            r"\b(ấn|an do|ấn độ|india|indian|cà ri|cari|curry|masala|"
            r"naan|tandoori|biryani|dal|quán ấn độ|gia vị ấn)\b"
        ),
        "Việt Nam": (
            r"\b(viet|viet nam|vietnam|vietnamese|quán cơm|phở|pho|bun|bún|"
            r"hu tieu|hủ tiếu|banh mi|bánh mì|bánh mỳ|bun dau|bún đậu|"
            r"bun cha|bún chả|cao lầu|mi quang|mì quảng|goi cuon|gỏi cuốn|"
            r"lẩu|lau|canh|kho|xào|xao|ngon kiểu việt)\b"
        ),
    },
    "food_type": {
        "chay": (
            r"\b(chay|chay trường|ăn chay|vegan|vegetarian|vat chay|"
            r"món chay|đồ chay|do chay|đậu hũ|dau hu|tau hu|tofu|"
            r"plant-based|healthy food|sạch|thuần chay|ăn sạch|anchay|veg)\b"
        )
    },
    "beverage": (
        r"\b(cafe|ca phe|cà phê|coffee|cf|caphe|tea|tra|trà|nuoc|nước|"
        r"nuoc ep|juice|sinh tố|sinhtố|smoothie|smooti|milktea|trà sữa|"
        r"trasua|ts|highlands|phúc long|phuc long|starbucks|daxay|đá xay|"
        r"cocktail|coktail|bia|beer|beo|rượu|ruou|ruou vang|wine|soda|"
        r"mocktail|bar|pub|bida|night drink)\b"
    ),
    "food_exclusion": (
        r"\b(nhà hàng|restaurant|quán ăn|bún|phở|cơm|lẩu|nướng|món|"
        r"bánh mì|pizza|sushi|mì|buffet|bbq)\b"
    ),
    "course_type": {
        "tráng miệng": (
            r"\b(tráng miệng|trang mieng|dessert|dessert|banh kem|bánh kem|"
            r"che|chè|kem|ice cream|bingsu|bing su|pudding|flan|flan bánh|"
            r"bánh ngọt|sweet|tiramisu|snack)\b"
        ),
        "món khai vị": (
            r"\b(khai vị|salad|sa lát|salát|appetizer|khoai tây|"
            r"khoai tay chien|fries|nem rán|chả giò|cha gio|súp|sup|"
            r"soup|gỏi|goi)\b"
        ),
    },
    # Flavor Direct: Từ khóa chỉ vị trực tiếp
    "flavor_direct": {
        "cay": (
            r"\b(cay|cay xè|spicy|spi cy|cayy|cayyy|ớt|ot|sa tế|sa te|"
            r"sate|satế|tiêu|chili|wasabi|mì cay|mi cay|tokboki cay|"
            r"gà cay|ga cay|go cay)\b"
        ),
        "ngọt": (
            r"\b(ngot|ngọt|ngọt lịm|sweet|sweat|swet|đường|duong|mat ong|"
            r"mật ong|caramel|kem|bánh|cake|socola|sô cô la|socolad)\b"
        ),
        "chua": (
            r"\b(chua|chua chua|chua cay|sour|sawr|giấm|dấm|chanh|chah|"
            r"me|xí muội|xí muoi)\b"
        ),
        "đắng": (
            r"\b(dang|đắng|bitter|đắng đậm|espresso|coffee|cafe đằm|"
            r"cafe đậm)\b"
        ),
        "mặn": (
            r"\b(man|mặn|nặm|đậm đà|nước mắm|nuoc mam|muối|muoi|rim|"
            r"khô|kho|rim)\b"
        ),
        "béo": (
            r"\b(beo|béo|béo ngậy|fatty|cream|cheese|phô mai|pho mai|"
            r"bơ|bo|sữa|sua|mayonnaise|mayo)\b"
        ),
        "thanh đạm": (
            r"\b(thanh|light|healthy|thanh đạm|nhẹ nhàng|fresssh|"
            r"fresh|rau củ|luộc|luoc|hấp|hap)\b"
        ),
    },
    # Flavor Inference: Suy luận vị từ món ăn (Dish -> Flavor)
    "flavor_inference_dishes": {
        # --- VỊ MẶN / UMAMI ---
        "mặn": (
            r"\b("
            # Món Việt
            r"bún đậu|mắm tôm|kho tộ|kho quẹt|cơm tấm|bún mắm|lẩu mắm|"
            r"bò kho|phở|bún chả|bánh mì|bánh cuốn|bún riêu|bún cá|"
            r"bún thịt nướng|cơm rang|cơm chiên|cơm niêu|cơm gà|xôi mặn|"
            r"gỏi|nem nướng|bánh xèo|bánh căn|bánh khọt|nem lụi|thịt kho|"
            r"cá kho tộ|thịt quay|thịt kho tàu|cá nướng|cá xiên|ốc xào|"
            r"ốc luộc|cua rang|ghẹ rang|hến xúc|lẩu|lẩu bò|lẩu gà|"
            r"lẩu cá|cháo lòng|cháo lươn|giò lụa|chả quế|thịt ngâm|"
            r"mắm cá|tóp mỡ|ruốc|"
            # Món Á - Nhật, Hàn, Trung
            r"ramen|udon|soba|gyudon|donburi|sashimi|sushi|teriyaki|"
            r"yakitori|okonomiyaki|bibimbap|bulgogi|samgyeopsal|"
            r"jjajangmyeon|dim sum|xíu mại|há cảo|sủi cảo|"
            r"lẩu Tứ Xuyên|thịt kho tàu Trung Quốc|"
            # Món Tây
            r"pizza savory|burger|pasta savory|beefsteak|steak|gravy|"
            r"kebab|shawarma|ham|prosciutto|salami|taco|burrito|"
            r"hot dog|fried chicken|fish and chips|"
            # Từ mô tả vị
            r"đậm đà|mặn mà|ngon mặn|umami|rich savory|salty|đậm vị|"
            r"mặn đậm|ướp muối|ướp gia vị|nước mắm"
            r")\b"
        ),
        # --- VỊ BÉO ---
        "béo": (
            r"\b("
            r"pizza|carbonara|trà sữa|cheese|phô mai|bơ tỏi|cốt dừa|"
            r"kem dừa|bánh bông lan|bánh kem|croissant|su kem|cream|"
            r"mayonnaise|gan ngỗng|foie gras|bacon|mỡ hành|gà rán|"
            r"khoai tây chiên|milkshake|ice cream|gelato|tiramisu|"
            r"pudding|custard|cheesecake|sữa đặc|sữa tươi|"
            r"whipping cream|mỡ động vật|shortening|bơ cacao|beurre|"
            r"fondue|sốt kem|alfredo sauce|carbonara sauce|đậm béo|"
            r"béo ngậy|cream sauce|rich|ngậy|oily|bơ nhiều|greasy"
            r")\b"
        ),
        # --- VỊ CAY ---
        "cay": (
            r"\b("
            r"bún bò huế|mì cay|lẩu thái|tom yum|gà cay|tokbokki|"
            r"kimchi|mì hàn quốc|sa tế|ớt|chili|spicy|wasabi|"
            r"lẩu Tứ Xuyên cay|cà ri cay|cà ri đỏ|cà ri xanh|"
            r"paprika|peri peri|hot sauce|tabasco|buffalo wings|"
            r"đỏ lửa|siêu cay|cay xè|cay nồng|cay cháy lưỡi|"
            r"cay tê|spicy level 3|cay cay|cay nhẹ|cay vừa"
            r")\b"
        ),
        # --- VỊ NGỌT ---
        "ngọt": (
            r"\b("
            r"chè|bánh flan|sinh tố|nước ép|bánh ngọt|kẹo|caramel|"
            r"mật ong|trái cây|xoài chín|dưa hấu|ổi chín|nho|trà đào|"
            r"trà vải|latte|mocha|milk tea|matcha|dessert|sweet|"
            r"ngọt thanh|ngọt đậm|ngọt béo|gato|pancake|waffle|donut|"
            r"pudding|macaron|siro|syrup|đường|đường mía|"
            r"maple syrup|honey|vol-au-vent|sweet bun"
            r")\b"
        ),
        # --- VỊ CHUA ---
        "chua": (
            r"\b("
            r"canh chua|gỏi cuốn|gỏi xoài|xoài lắc|mắm me|chanh|"
            r"giấm|dấm|dưa muối|kimchi chua|mojito|lemonade|yakult|"
            r"sữa chua|yaourt|giấm táo|giấm balsamic|chua nhẹ|"
            r"chua thanh|sour|acidic|vinegar|lactic"
            r")\b"
        ),
        # --- VỊ THANH ĐẠM / NHẠT ---
        "thanh đạm": (
            r"\b("
            r"rau luộc|rau hấp|salad|salad trộn|gỏi cuốn|súp rau củ|"
            r"canh rau|canh rong biển|sashimi không sốt|sushi chay|"
            r"đậu hũ|đậu phụ|đậu hũ non|đậu hấp|ăn kiêng|eat clean|"
            r"healthy food|keto|low carb|nhẹ nhàng|thanh mát|"
            r"thanh đạm|ít gia vị|ít muối|ít dầu|low fat|low sodium|"
            r"tinh khiết|hương vị nhẹ|clear broth|white meat|plain"
            r")\b"
        ),
        # --- VỊ ĐẮNG ---
        "đắng": (
            r"\b("
            r"cà phê|coffee|espresso|americano|cold brew|cacao đậm|"
            r"matcha đặc|bia đen|bia craft|rượu vang đỏ chát|"
            r"sô cô la đen|dark chocolate|85% cacao|khổ qua|"
            r"mướp đắng|rau đắng|endive|arugula|radicchio|burnt|"
            r"grill cháy|cháy cạnh|charcoal flavor|vị đắng|"
            r"đắng nhẹ|đắng chát|bitter|hậu đắng|aftertaste"
            r")\b"
        ),
    },
}

# --- 2. HÀM XỬ LÝ TEXT ---


def clean_text(text):
    """Làm sạch văn bản để regex hoạt động tốt hơn."""
    if not text:
        return ""
    # Chuyển thành chuỗi, chữ thường
    text = str(text).lower()
    # Loại bỏ dấu câu thừa, giữ lại chữ cái và số Tiếng Việt
    text = (
        text.replace("\n", " ")
        .replace(",", " ")
        .replace(".", " ")
        .replace("-", " ")
    )
    # Chuẩn hóa khoảng trắng
    text = re.sub(r"\s+", " ", text).strip()
    return text


def get_full_text(row):
    """Gộp tất cả các trường thông tin quan trọng."""
    # Giữ nguyên các cột cần thiết cho việc suy luận, không cần thay đổi
    parts = [
        row["name"],
        row["category"],
        row["subtypes"],
        row["description"],
        row["review_tags"],
    ]
    return clean_text(" ".join([str(p) for p in parts if p]))


# --- 3. CÁC HÀM MAPPING LOGIC CAO CẤP ---

# (Các hàm map_cuisine, map_food_type, map_beverage_or_food, 
# map_course_type, map_flavor, map_price_range được giữ nguyên)


def map_cuisine(text):
    """
    Xác định ẩm thực theo độ ưu tiên.
    Ưu tiên tìm các món nước ngoài trước, nếu không thấy mới check món Việt.
    """
    # 1. Check các ẩm thực đặc thù (Foreign)
    for cuisine, pattern in KEYWORDS_CONFIG["cuisine"].items():
        if cuisine != "Việt Nam" and re.search(pattern, text):
            return cuisine

    # 2. Check Việt Nam (Low priority để tránh override)
    if re.search(KEYWORDS_CONFIG["cuisine"]["Việt Nam"], text):
        return "Việt Nam"

    return "Khác"


def map_food_type(text):
    if re.search(KEYWORDS_CONFIG["food_type"]["chay"], text):
        return "chay"
    return "mặn"


def map_beverage_or_food(text, category):
    """Kết hợp cả text và category gốc của Google Maps"""
    text_check = text + " " + clean_text(category)

    is_drink = re.search(KEYWORDS_CONFIG["beverage"], text_check)
    is_food = re.search(KEYWORDS_CONFIG["food_exclusion"], text_check)

    # Logic ưu tiên
    if is_drink and is_food:
        return "cả 2"
    if is_drink:
        return "nước"
    # Mặc định là 'khô' (đồ ăn) nếu không tìm thấy từ khóa nước
    return "khô"


def map_course_type(text, bev_or_food):
    if bev_or_food == "nước":
        return "đồ uống"
    if re.search(KEYWORDS_CONFIG["course_type"]["tráng miệng"], text):
        return "tráng miệng"
    if re.search(KEYWORDS_CONFIG["course_type"]["món khai vị"], text):
        return "món khai vị"
    return "món chính"


def map_flavor(text, cuisine, category, bev_or_food):
    """
    Logic suy luận hương vị phức hợp (Complex Inference)
    """
    flavors = set()
    category = clean_text(category)

    # --- LAYER 1: Tìm kiếm trực tiếp (Direct Keyword) ---
    for flavor, pattern in KEYWORDS_CONFIG["flavor_direct"].items():
        if re.search(pattern, text):
            flavors.add(flavor)

    # --- LAYER 2: Suy luận từ món ăn (Dish Inference) ---
    for flavor, pattern in KEYWORDS_CONFIG["flavor_inference_dishes"].items():
        if re.search(pattern, text):
            flavors.add(flavor)

    # --- LAYER 3: Suy luận từ Category/Type (Category Inference) ---
    # Nếu là Bakery/Dessert/Cafe -> chắc chắn có Ngọt
    if re.search(
        r"\b(dessert|bakery|ice cream|trà sữa|chè|bánh|cake|sinh tố)\b",
        text + " " + category,
    ):
        flavors.add("ngọt")

    # Nếu là Cafe -> Đắng
    if re.search(r"\b(cafe|coffee)\b", text + " " + category):
        flavors.add("đắng")

    # --- LAYER 4: Suy luận từ Cuisine (Cuisine Fallback) ---
    # Chỉ thêm vào nếu danh sách flavor còn trống hoặc bổ sung tính đặc trưng
    if cuisine == "Thái Lan":
        flavors.update(["chua", "cay", "đậm đà"])
    elif cuisine == "Hàn Quốc":
        flavors.add("cay")
    elif cuisine == "Ấn Độ":
        flavors.update(["cay", "đậm đà"])  # Cari thường đậm
    elif cuisine == "Việt Nam":
        # Món Việt thường đậm đà/mặn (nước mắm)
        if "ngọt" not in flavors and bev_or_food != "nước":
            flavors.add("mặn")
    elif cuisine == "Âu/Mỹ":
        if re.search(r"\b(cheese|phô mai|burger|pizza)\b", text):
            flavors.add("béo")

    # --- LAYER 5: Logic tương quan (Correlation) ---
    # Nếu có Cay -> thường sẽ Mặn (trừ khi là tráng miệng cay - hiếm)
    if "cay" in flavors and "ngọt" not in flavors and bev_or_food != "nước":
        flavors.add("mặn")

    # Nếu là Trà Sữa -> Auto Béo + Ngọt
    if re.search(r"trà sữa", text):
        flavors.update(["béo", "ngọt"])

    # Chuyển set về list
    return list(flavors)


def map_district(address):
    if not address:
        return "Khác"
    # Regex bắt tất cả các biến thể quận huyện TP.HCM
    pattern = (
        r"(q[0-9]+|quận\s?[0-9]+|quan\s?[0-9]+|district\s?[0-9]+|"
        r"d\s?[0-9]+|gò vấp|govap|binh thanh|bình thạnh|tan binh|"
        r"tân bình|tan phu|tân phú|phu nhuan|phú nhuận|binh tan|"
        r"bình tân|thuduc|thủ đức|hocmon|hoc mon|củ chi|cuchi|"
        r"nha be|nhabe|binhchanh|hóc môn)\b"
    )
    match = re.search(pattern, address, re.IGNORECASE)
    if match:
        d = match.group(0).title()
        d = re.sub(r"Q\.?\s?(\d+)", r"Quận \1", d)
        d = d.replace("Tp.", "Thành Phố").replace("Tp ", "Thành Phố ")
        return d.strip()
    return "Khác"


def map_price_range(range_str):
    if not range_str:
        return 0, 5000000
    r = str(range_str).strip()
    length = len(r)
    if length == 1 or r == "PRICE_LEVEL_INEXPENSIVE":
        return 1000, 100000
    if length == 2 or r == "PRICE_LEVEL_MODERATE":
        return 100000, 500000
    if length == 3 or r == "PRICE_LEVEL_EXPENSIVE":
        return 500000, 2000000
    if length == 4 or r == "PRICE_LEVEL_VERY_EXPENSIVE":
        return 2000000, 10000000
    return 0, 5000000


# --- 4. MAIN PROCESSING ---


def create_processed_db():
    if not os.path.exists(SOURCE_DB):
        logger.error(f"Không tìm thấy DB nguồn: {SOURCE_DB}")
        return

    # Xóa DB đích cũ
    if os.path.exists(TARGET_DB):
        try:
            os.remove(TARGET_DB)
            logger.info("Đã reset database đích.")
        except OSError:
            pass

    try:
        src_conn = sqlite3.connect(SOURCE_DB)
        src_conn.row_factory = sqlite3.Row
        src_cur = src_conn.cursor()

        tgt_conn = sqlite3.connect(TARGET_DB)
        tgt_cur = tgt_conn.cursor()

        # Tối ưu tốc độ ghi
        tgt_cur.execute("PRAGMA synchronous = OFF")
        tgt_cur.execute("PRAGMA journal_mode = MEMORY")

        # Tạo bảng (Cấu trúc bảng đích được giữ nguyên)
        tgt_cur.execute(
            """
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
        """
        )

        logger.info("Đang đọc dữ liệu từ DB nguồn...")
        # CHỈNH SỬA: Truy vấn SELECT để lấy tất cả các cột của cấu trúc mới
        src_cur.execute(
            """
            SELECT place_id, name, full_address, latitude, longitude,
                   street, borough, city, country, rating, range, 
                   working_hour, photo_url, street_view, phone, site, 
                   category, review_tags, subtypes, description
            FROM restaurants
        """
        )
        rows = src_cur.fetchall()

        batch_data = []
        count = 0
        total_rows = len(rows)

        # CHỈNH SỬA: Danh sách cột trong INSERT INTO (giữ nguyên cấu trúc đích)
        insert_sql = """
            INSERT INTO restaurants (
                place_id, name, full_address, latitude, longitude,
                rating, working_hour, photo_url, street_view, phone, site,
                category, review_tags, subtypes, description, range,
                foodType, bevFood, cuisine, flavor, courseType, district,
                minPrice, maxPrice
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?
            )
        """

        for row in rows:
            try:
                # Dùng full_address + borough để mapping district
                address_for_district = (
                    row["full_address"] or row["borough"] or ""
                )
                
                full_text = get_full_text(row)
                category_orig = row["category"] or ""

                # Mapping Steps
                cuisine = map_cuisine(full_text)
                food_type = map_food_type(full_text)
                bev_food = map_beverage_or_food(full_text, category_orig)
                course_type = map_course_type(full_text, bev_food)

                # Flavor mapping
                flavor_list = map_flavor(
                    full_text, cuisine, category_orig, bev_food
                )
                flavor_json = json.dumps(flavor_list, ensure_ascii=False)

                district = map_district(address_for_district)
                min_p, max_p = map_price_range(row["range"])

                # Cập nhật data_tuple để lấy dữ liệu từ DB nguồn CŨ
                data_tuple = (
                    row["place_id"],
                    row["name"],
                    row["full_address"],
                    row["latitude"],
                    row["longitude"],
                    row["rating"],
                    row["working_hour"],
                    row["photo_url"],
                    row["street_view"],
                    row["phone"],
                    row["site"],
                    row["category"],
                    row["review_tags"],
                    row["subtypes"],
                    row["description"],
                    row["range"],
                    # CỘT INFERRED
                    food_type,
                    bev_food,
                    cuisine,
                    flavor_json,
                    course_type,
                    district,
                    min_p,
                    max_p,
                )
                batch_data.append(data_tuple)
                count += 1

                if len(batch_data) >= BATCH_SIZE:
                    tgt_cur.executemany(insert_sql, batch_data)
                    tgt_conn.commit()
                    batch_data = []
                    logger.info(f"Progress: {count}/{total_rows}")

            except Exception as e:
                # Ghi log lỗi với thông tin cột đã thay đổi để debug dễ hơn
                name = row["name"] if "name" in row else "Unknown"
                logger.warning(f"Error processing row '{name}': {e}")
                continue

        if batch_data:
            tgt_cur.executemany(insert_sql, batch_data)
            tgt_conn.commit()

        # Tạo Index
        tgt_cur.execute("CREATE INDEX idx_min_price ON restaurants(minPrice)")
        tgt_cur.execute("CREATE INDEX idx_cuisine ON restaurants(cuisine)")
        tgt_cur.execute("CREATE INDEX idx_flavor ON restaurants(flavor)")

        logger.info(f"✅ XONG! Tổng cộng {count} nhà hàng.")

    except Exception as e:
        logger.error(f"FATAL ERROR: {e}")
    finally:
        if "src_conn" in locals():
            src_conn.close()
        if "tgt_conn" in locals():
            tgt_conn.close()


# --- 5. TEST FUNCTION ---
def test_results():
    if not os.path.exists(TARGET_DB):
        return
    conn = sqlite3.connect(TARGET_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    print("\n--- TEST: CÁC VỊ ĐƯỢC SUY LUẬN ---")
    cur.execute(
        "SELECT name, cuisine, flavor FROM restaurants "
        "WHERE flavor != '[]' LIMIT 10"
    )
    for r in cur.fetchall():
        print(f"[{r['cuisine']}] {r['name']} -> {r['flavor']}")

    print("\n--- TEST: PHÂN LOẠI ẨM THỰC ---")
    cur.execute(
        "SELECT cuisine, COUNT(*) as c FROM restaurants "
        "GROUP BY cuisine ORDER BY c DESC"
    )
    for r in cur.fetchall():
        print(f"{r['cuisine']}: {r['c']}")
    conn.close()


if __name__ == "__main__":
    create_processed_db()
    test_results()