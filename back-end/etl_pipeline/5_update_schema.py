# 5_update_schema.py
import sys
import os
from sqlalchemy import create_engine, text

# --- PATH CONFIGURATION ---
current_file_path = os.path.abspath(__file__)
etl_pipeline_dir = os.path.dirname(current_file_path)
backend_dir = os.path.dirname(etl_pipeline_dir)
sys.path.append(etl_pipeline_dir)
api_dir = os.path.join(backend_dir, 'api')
sys.path.append(api_dir)

import config

def add_columns_to_user_table():
    print("☁️  Connecting to Render Database...")
    db_url = config.RENDER_DB_URL # Lấy từ config.py
    
    # Fix url cho thư viện Python
    if db_url and db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
        
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            print("🛠  Updating Schema (Adding email, avatar, bio)...")
            
            # Dùng transaction để đảm bảo an toàn
            with conn.begin():
                # 1. Thêm cột email
                conn.execute(text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS email VARCHAR(120);'))
                
                # 2. Thêm cột avatar
                conn.execute(text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS avatar VARCHAR(255);'))
                
                # 3. Thêm cột bio
                conn.execute(text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS bio TEXT;'))
                
                # 4. (Tùy chọn) Đặt ràng buộc unique cho email
                # Lưu ý: Chỉ chạy dòng dưới nếu dữ liệu email hiện tại không bị trùng hoặc đang null
                try:
                    conn.execute(text('ALTER TABLE "user" ADD CONSTRAINT uq_user_email UNIQUE (email);'))
                except Exception as e:
                    print(f"⚠️  Warning: Could not add unique constraint to email (might contain duplicates/nulls): {e}")

        print("✅ Database Schema Updated Successfully!")
        
    except Exception as e:
        print(f"❌ Error updating schema: {e}")

if __name__ == "__main__":
    add_columns_to_user_table()