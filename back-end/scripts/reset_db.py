# reset_db.py
from sqlalchemy import create_engine, text

# Dán link DB Render vào đây
DB_URL = "postgresql://food_tour_db_user:uiECcoGwSz9EmzKg8LliGSvmWKyJN3Zo@dpg-d4qokpu3jp1c739lagd0-a.singapore-postgres.render.com/food_tour_db"
if DB_URL.startswith("postgres://"): DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DB_URL)
with engine.connect() as conn:
    # Lệnh này xóa sạch bảng restaurants để tạo lại từ đầu
    conn.execute(text("DROP TABLE IF EXISTS restaurants CASCADE;"))
    conn.commit()
    print("Đã xóa bảng cũ thành công!")