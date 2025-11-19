# /back-end/models.py

from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
import json

db = SQLAlchemy()
bcrypt = Bcrypt()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)
    def to_dict(self):
        return {"id": self.id, "username": self.username}

class Favorite(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    place_id = db.Column(db.String(255), nullable=False) # Lưu place_id của Goong

    # Đảm bảo mỗi user chỉ có thể_favorite 1 địa điểm 1 lần
    __table_args__ = (db.UniqueConstraint('user_id', 'place_id', name='_user_place_uc'),)

class Restaurant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    
    # Dùng 'place_id' của Goong làm khóa unique
    place_id = db.Column(db.String(255), unique=True, nullable=False, index=True) 
    
    name = db.Column(db.String(255), nullable=False)
    address = db.Column(db.Text)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    
    rating = db.Column(db.Float, nullable=True)
    user_ratings_total = db.Column(db.Integer, nullable=True)
    
    # 'types' có thể là list, ta lưu dạng Text
    types = db.Column(db.Text, nullable=True) 
    
    business_status = db.Column(db.String(50), nullable=True)

    # Lưu toàn bộ JSON gốc để xử lý sau
    raw_json = db.Column(db.Text, nullable=True)

    def to_dict(self):
        # Chuyển đổi đối tượng Restaurant thành dictionary
        # Frontend sẽ nhận dữ liệu này
        photo_url = None
        try:
            # Thử trích xuất ảnh đầu tiên từ raw_json (nếu có)
            raw = json.loads(self.raw_json or '{}')
            photos = raw.get('photos', [])
            if photos:
                # API của Goong có thể cần tham chiếu ảnh, 
                # ở đây ta giả định nó là một URL hoặc ID (cần kiểm tra lại cấu trúc JSON của Goong)
                # Tạm thời lấy 'vicinity' làm placeholder nếu logic ảnh phức tạp
                photo_url = raw.get('icon', None) # Hoặc một trường ảnh cụ thể
        except:
            pass # Bỏ qua nếu JSON lỗi

        return {
            "id": self.id, # ID của CSDL nội bộ
            "place_id": self.place_id, # ID của Goong
            "name": self.name,
            "address": self.address,
            "lat": self.lat,
            "lng": self.lng,
            "rating": self.rating,
            "user_ratings_total": self.user_ratings_total,
            "types": self.types.split(',') if self.types else [],
            "business_status": self.business_status,
            "photo_url": photo_url # Sẽ cần tinh chỉnh
        }