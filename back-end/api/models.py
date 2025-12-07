# /back-end/models.py

from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
import json
from datetime import datetime

db = SQLAlchemy()
bcrypt = Bcrypt()


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(
            password
        ).decode("utf-8")

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {"id": self.id, "username": self.username}


class Favorite(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    # Lưu place_id của Goong
    place_id = db.Column(db.String(255), nullable=False)

    # Đảm bảo mỗi user chỉ có thể_favorite 1 địa điểm 1 lần
    __table_args__ = (
        db.UniqueConstraint("user_id", "place_id", name="_user_place_uc"),
    )


class Restaurant(db.Model):
    # Quan trọng: Liên kết model này với database restaurants_processed.db
    __bind_key__ = "restaurants_db"

    # Tên bảng phải khớp với trong file sqlite của bạn
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
    description = db.Column(db.String)
    range = db.Column(db.String)  # Ví dụ: "10k-50k" hoặc "$$"

    # --- SỬA CÁC DÒNG DƯỚI ĐÂY ---
    # Thêm tham số string vào đầu để ép tên cột trùng khớp
    foodType = db.Column("foodtype", db.String)      # foodType -> foodtype
    bevFood = db.Column("bevfood", db.String)        # bevFood -> bevfood
    cuisine = db.Column(db.String)
    flavor = db.Column(db.String)
    courseType = db.Column("coursetype", db.String)  # courseType -> coursetype
    district = db.Column(db.String)
    minPrice = db.Column("minprice", db.Integer)     # minPrice -> minprice
    maxPrice = db.Column("maxprice", db.Integer)     # maxPrice -> maxprice

    def to_dict(self):
        """
        Chuyển đổi object thành dict để trả về JSON.
        Xử lý null data tại đây để frontend không bị lỗi.
        """
        # Tính toán price_level (1-4) dựa trên range hoặc minPrice nếu cần
        # Ở đây tôi giả định logic đơn giản, bạn có thể tùy chỉnh
        level = 1
        if self.maxPrice:
            if self.maxPrice > 2000000:
                level = 4
            elif self.maxPrice > 500000:
                level = 3
            elif self.maxPrice > 100000:
                level = 2

        return {
            "id": str(self.id),  # Frontend thường dùng string cho id
            "place_id": self.place_id or "",
            "name": self.name or "Tên đang cập nhật",
            "address": self.full_address or "",  # Map full_address -> address
            "lat": self.latitude or 0.0,  # Map latitude -> lat
            "lng": self.longitude or 0.0,  # Map longitude -> lng
            "rating": self.rating or 0.0,
            "price_level": level,  # Frontend cần field này để hiện icon $
            "photo_url": self.photo_url or "",
            "description": self.description or "",
            "phone_number": self.phone or "",
            "website": self.site or "",
            "working_hour": self.working_hour or "",
            # Trả thêm các trường filter để frontend dùng nếu cần
            "cuisine": self.cuisine,
            "district": self.district,
        }


class RouteHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    start_point = db.Column(db.String(200), nullable=False)
    places_json = db.Column(db.Text, nullable=False)
    
    # --- SỬA THÀNH 2 CỘT ---
    polyline_outbound = db.Column(db.Text, nullable=True) 
    polyline_return = db.Column(db.Text, nullable=True)
    # -----------------------
    
    total_distance = db.Column(db.Float, nullable=True)
    total_duration = db.Column(db.Float, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "start_point": self.start_point,
            "places": json.loads(self.places_json),
            
            # --- TRẢ VỀ 2 POLYLINE ---
            "polyline_outbound": self.polyline_outbound,
            "polyline_return": self.polyline_return,
            # -------------------------
            
            "distance": self.total_distance,
            "duration": self.total_duration,
            
            "created_at": self.created_at.isoformat(),
        }
        
class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    
    # Liên kết với nhà hàng qua place_id (vì nhà hàng nằm ở DB khác, ta dùng ID chuỗi)
    place_id = db.Column(db.String(255), nullable=False)
    
    rating = db.Column(db.Integer, nullable=False) # 1 đến 5 sao
    comment = db.Column(db.Text, nullable=True)
    
    # Lưu link ảnh (đơn giản nhất). Nếu muốn upload file thật, cần cấu hình thêm AWS S3 hoặc thư mục static
    images = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship để lấy thông tin user (Avatar, Username) dễ dàng
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
                # Giả sử sau này user có avatar, tạm thời lấy chữ cái đầu
                "avatar_letter": self.user.username[0].upper() if self.user.username else "U"
            }
        }