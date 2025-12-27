from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
import json
from datetime import datetime

db = SQLAlchemy()
bcrypt = Bcrypt()

# ----------------------------------------------------
# 1. USER MODEL
# ----------------------------------------------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {"id": self.id, "username": self.username}

# ----------------------------------------------------
# 2. RESTAURANT MODEL (CORE DATA)
# ----------------------------------------------------
class Restaurant(db.Model):
    # Liên kết với database riêng (nếu dùng Bind) hoặc DB chính
    # Lưu ý: Nếu bạn dùng chung 1 DB trên Render thì bind_key này vẫn trỏ về DB chính
    __bind_key__ = "restaurants_db"
    __tablename__ = "restaurants"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    place_id = db.Column(db.String, unique=True)
    name = db.Column(db.String)
    full_address = db.Column(db.String)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    rating = db.Column(db.Float)
    working_hour = db.Column(db.String)
    photo_url = db.Column(db.String)
    street_view = db.Column(db.String)
    phone = db.Column(db.String)
    site = db.Column(db.String)
    category = db.Column(db.String)
    review_tags = db.Column(db.String)
    subtypes = db.Column(db.String)
    
    # --- CỘT MÔ TẢ ĐA NGÔN NGỮ ---
    description = db.Column(db.String)      # Tiếng Việt (Mặc định)
    description_en = db.Column(db.String)   # Tiếng Anh (Mới thêm)
    
    range = db.Column(db.String)  

    # --- MAP TÊN CỘT CHÍNH XÁC (Lower Case cho Postgres) ---
    foodType = db.Column("foodtype", db.String)      
    bevFood = db.Column("bevfood", db.String)        
    cuisine = db.Column(db.String)
    flavor = db.Column(db.String)
    courseType = db.Column("coursetype", db.String)  
    district = db.Column(db.String)
    minPrice = db.Column("minprice", db.Integer)     
    maxPrice = db.Column("maxprice", db.Integer)     

    def to_dict(self, lang='vi'):
        """
        Chuyển đổi object thành dict chuẩn cho Frontend.
        lang: 'vi' hoặc 'en' để chọn ngôn ngữ hiển thị.
        """

        # --- LOGIC CHỌN NGÔN NGỮ ---
        # Mặc định lấy tiếng Việt
        final_description = self.description
        # Nếu yêu cầu tiếng Anh VÀ có dữ liệu tiếng Anh thì lấy
        if lang == 'en' and self.description_en:
            final_description = self.description_en

        return {
            "id": str(self.id), 
            "place_id": self.place_id or "",
            "name": self.name or "Tên đang cập nhật",
            "address": self.full_address or self.district or "Đang cập nhật",
            "lat": self.latitude or 0.0,
            "lng": self.longitude or 0.0,
            "rating": self.rating or 0.0,
            "price_level": self.range,
            "photo_url": self.photo_url or "",
            
            # TRẢ VỀ FIELD ĐÃ ĐƯỢC DỊCH
            "description": final_description or "",
            
            "phone_number": self.phone or "",
            "website": self.site or "",
            "working_hour": self.working_hour or "",
            "cuisine": self.cuisine or "",
            "food_type": self.foodType or "",
            "district": self.district or "",
            "min_price": self.minPrice or 0,
            "max_price": self.maxPrice or 0
        }

# ----------------------------------------------------
# 3. USER DATA MODELS
# ----------------------------------------------------
class Favorite(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    place_id = db.Column(db.String(255), nullable=False) # Lưu place_id chuỗi

    __table_args__ = (
        db.UniqueConstraint("user_id", "place_id", name="_user_place_uc"),
    )

class RouteHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    start_point = db.Column(db.String(200), nullable=False)
    places_json = db.Column(db.Text, nullable=False)
    
    polyline_outbound = db.Column(db.Text, nullable=True) 
    polyline_return = db.Column(db.Text, nullable=True)
    
    total_distance = db.Column(db.Float, nullable=True)
    total_duration = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "start_point": self.start_point,
            "places": json.loads(self.places_json),
            "polyline_outbound": self.polyline_outbound,
            "polyline_return": self.polyline_return,
            "distance": self.total_distance,
            "duration": self.total_duration,
            "created_at": self.created_at.isoformat(),
        }

class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    place_id = db.Column(db.String(255), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text, nullable=True)
    images = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref="reviews")

    def to_dict(self):
        return {
            "id": self.id,
            "place_id": self.place_id,
            "rating": self.rating,
            "comment": self.comment,
            "images": json.loads(self.images) if self.images else [],
            "created_at": self.created_at.isoformat(),
            "user": {
                "username": self.user.username,
                "avatar_letter": self.user.username[0].upper() if self.user.username else "U"
            }
        }