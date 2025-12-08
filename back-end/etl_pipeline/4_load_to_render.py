import sys
import os
import sqlite3
import uuid
import time
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# --- PATH CONFIGURATION ---
# Get the absolute path of the current file (4_load_to_render.py)
# e.g., .../back-end/etl_pipeline/steps/4_load_to_render.py
current_file_path = os.path.abspath(__file__)

# Get the 'etl_pipeline' directory (parent of steps)
etl_pipeline_dir = os.path.dirname(current_file_path)

# Get the 'back-end' directory (parent of etl_pipeline)
backend_dir = os.path.dirname(etl_pipeline_dir)

# Append 'etl_pipeline' to sys.path so we can import 'config'
sys.path.append(etl_pipeline_dir)

# Append 'api' to sys.path so we can import 'models'
api_dir = os.path.join(backend_dir, 'api')
sys.path.append(api_dir)

# --- IMPORTS ---
try:
    import config  # Importing from etl_pipeline/config.py
except ImportError as e:
    print(f"❌ Error importing config: {e}")
    sys.exit(1)

try:
    from models import Restaurant  # Importing from api/models.py
except ImportError as e:
    print(f"❌ Error importing models: {e}")
    print(f"   Debug: sys.path is {sys.path}")
    sys.exit(1)

# ==============================================================================
# CONFIGURATION
# ==============================================================================
START_ID = 1      # Start ID in SQLite
END_ID = 500        # End ID
BATCH_SIZE = 50     # Batch size for bulk inserts

# ==============================================================================

def transfer_data_final():
    source_db = config.DB_FINAL_PATH
    
    if not os.path.exists(source_db):
        print(f"❌ SQLite file not found at: {source_db}")
        return

    # 1. Connect to Render (PostgreSQL)
    print("☁️  Connecting to Render Server...")
    db_url = config.RENDER_DB_URL
    if db_url and db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
        
    try:
        pg_engine = create_engine(db_url)
        Session = sessionmaker(bind=pg_engine)
        session = Session()
        print("✅ Connected to Server successfully!")
    except Exception as e:
        print(f"❌ Render Connection Error: {e}")
        return

    # 2. Get existing IDs from Server (To avoid duplicates)
    print("🔍 Checking existing data on Server...")
    existing_ids = set()
    try:
        # Fetch only place_id to save bandwidth
        result = session.execute(text("SELECT place_id FROM restaurants"))
        for row in result:
            existing_ids.add(row[0])
        print(f"   -> Found {len(existing_ids)} restaurants already on Server.")
    except Exception as e:
        print(f"⚠️  Could not fetch existing IDs (Table might not exist yet): {e}")

    # 3. Read data from SQLite by Range
    print(f"🔌 Reading SQLite data (ID {START_ID} -> {END_ID})...")
    sqlite_conn = sqlite3.connect(source_db)
    sqlite_conn.row_factory = sqlite3.Row
    cursor = sqlite_conn.cursor()
    
    try:
        cursor.execute(
            "SELECT * FROM restaurants WHERE id BETWEEN ? AND ?", 
            (START_ID, END_ID)
        )
        rows = cursor.fetchall()
    except Exception as e:
        print(f"❌ SQLite Read Error: {e}")
        return

    # 4. Filter and Load Data
    print(f"🚀 Processing {len(rows)} rows...")
    count_success = 0
    count_skipped = 0
    current_batch = []

    for i, row in enumerate(rows):
        place_id = row['place_id'] if row['place_id'] else f"imp_{uuid.uuid4().hex[:10]}"
        
        # CHECK DUPLICATE: Skip if ID exists on server
        if place_id in existing_ids:
            count_skipped += 1
            continue

        try:
            # Create Restaurant object
            # Note: Ensure these column names match your SQLite schema EXACTLY
            new_res = Restaurant(
                place_id=place_id,
                name=row['name'],
                # Handle full_address vs address naming difference if any
                full_address=row['full_address'] if 'full_address' in row.keys() else row['district'], 
                
                latitude=row['latitude'] or 0.0,
                longitude=row['longitude'] or 0.0,
                rating=row['rating'] or 0.0,
                working_hour=row['working_hour'],
                photo_url=row['photo_url'],
                phone=row['phone'],
                site=row['site'],
                description=row['description'],
                range=row['range'],
                
                # Filter columns
                foodType=row['foodType'],
                bevFood=row['bevFood'],
                cuisine=row['cuisine'],
                flavor=row['flavor'],
                courseType=row['courseType'],
                district=row['district'],
                minPrice=row['minPrice'],
                maxPrice=row['maxPrice']
            )
            
            current_batch.append(new_res)
            # Add to temp set to avoid duplicates within this batch
            existing_ids.add(place_id) 

            # Send Batch
            if len(current_batch) >= BATCH_SIZE:
                session.bulk_save_objects(current_batch)
                session.commit()
                count_success += len(current_batch)
                print(f"   ---> Loaded: {count_success} (Skipped: {count_skipped})")
                current_batch = [] 

        except Exception as e:
            session.rollback()
            print(f"⚠️ Error on row ID {row['id']}: {e}")
            current_batch = []

    # Load remaining batch
    if current_batch:
        session.bulk_save_objects(current_batch)
        session.commit()
        count_success += len(current_batch)

    session.close()
    sqlite_conn.close()
    
    print("================================================")
    print(f"🎉 FINISHED!")
    print(f"   - Total Scanned: {len(rows)}")
    print(f"   - Newly Loaded: {count_success}")
    print(f"   - Skipped (Duplicate): {count_skipped}")
    print("================================================")

if __name__ == "__main__":
    transfer_data_final()