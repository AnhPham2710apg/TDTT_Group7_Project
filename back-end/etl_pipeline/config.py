import os
from dotenv import load_dotenv

# Tìm file .env ở thư mục gốc (back-end)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, '.env'))

# --- API KEYS ---
GOONG_API_KEY = os.getenv("GOONG_API_KEY")
OUTSCRAPER_API_KEY = os.getenv("OUTSCRAPER_API_KEY")
RENDER_DB_URL = os.getenv("DATABASE_URL_RENDER") or os.getenv("DATABASE_URL")

# --- CẤU HÌNH KHÁC ---
REQUEST_SLEEP_TIME = 0.2

# --- ĐƯỜNG DẪN DATABASE (QUAN TRỌNG: ĐỊNH NGHĨA 1 CHỖ) ---
DB_FOLDER = os.path.join(BASE_DIR, "db")
if not os.path.exists(DB_FOLDER):
    os.makedirs(DB_FOLDER)

# Bước 1: Scan ra file này
DB_RAW_PATH = os.path.join(DB_FOLDER, "1_raw_data.db")
# Bước 2: Enrich ra file này
DB_ENRICHED_PATH = os.path.join(DB_FOLDER, "2_enriched_data.db")
# Bước 3: Chạy AI để làm giàu và gán nhãn data
DB_AI_TAGGED = os.path.join(DB_FOLDER, "3_ai_tagged.db")
# Bước 4: Process ra file này (để nạp lên Render)
DB_FINAL_PATH = os.path.join(DB_FOLDER, "4_processed_data.db")