import os
from flask import Blueprint, request, jsonify, url_for, current_app
from werkzeug.utils import secure_filename
from models import db, User

auth_bp = Blueprint('auth_bp', __name__)

# --- CONFIG UPLOAD ---
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@auth_bp.route("/api/register", methods=["POST"])
def register():
    """
    Đăng ký tài khoản
    ---
    tags:
      - Authentication
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            username:
              type: string
            password:
              type: string
    responses:
      200:
        description: Đăng ký thành công
      400:
        description: Lỗi
    """
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 400
        
    new_user = User(username=username)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "User created", "user": new_user.to_dict()})

@auth_bp.route("/api/login", methods=["POST"])
def login():
    """
    Đăng nhập
    ---
    tags:
      - Authentication
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            username:
              type: string
            password:
              type: string
    responses:
      200:
        description: Thành công
      401:
        description: Sai thông tin
    """
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
        
    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        return jsonify({"message": "Login successful", "user": user.to_dict()})
    else:
        return jsonify({"error": "Invalid credentials"}), 401
      
# 3. [NEW] GET PROFILE (Khắc phục lỗi 404)
@auth_bp.route("/api/profile/<username>", methods=["GET"])
def get_user_profile(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict())

# [FIXED] UPDATE PROFILE
@auth_bp.route("/api/profile", methods=["PUT"])
def update_profile():
    data = request.get_json()
    
    # 1. Lấy định danh User cũ để tìm trong DB
    current_username = data.get("current_username") 
    # 2. Lấy thông tin mới muốn cập nhật
    new_username = data.get("username")
    
    if not current_username:
        return jsonify({"message": "Missing current_username"}), 400
        
    user = User.query.filter_by(username=current_username).first()
    if not user:
        return jsonify({"message": "User not found"}), 404
    
    # 3. Xử lý đổi tên (Nếu có gửi lên và khác tên cũ)
    if new_username and new_username != current_username:
        # Check trùng tên với người khác
        if User.query.filter_by(username=new_username).first():
            return jsonify({"message": "Username already taken"}), 409
        user.username = new_username

    # 4. Cập nhật các trường khác
    if "email" in data:
        user.email = data["email"]
    if "bio" in data:
        user.bio = data["bio"]
    if "avatar" in data:
        user.avatar = data["avatar"]
        
    try:
        db.session.commit()
        return jsonify({"message": "Profile updated", "user": user.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error: {str(e)}"}), 500

# 5. [NEW] UPLOAD AVATAR
@auth_bp.route("/api/upload/avatar", methods=["POST"])
def upload_avatar():
    if 'file' not in request.files:
        return jsonify({"message": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "No selected file"}), 400
        
    if file and allowed_file(file.filename):
        try:
            filename = secure_filename(file.filename)
            # Tạo tên file unique để tránh cache
            import time
            unique_filename = f"{int(time.time())}_{filename}"
            
            # Lưu vào static/uploads/avatars
            upload_folder = os.path.join(current_app.static_folder, 'uploads', 'avatars')
            os.makedirs(upload_folder, exist_ok=True)
            
            file_path = os.path.join(upload_folder, unique_filename)
            file.save(file_path)
            
            # Trả về đường dẫn tương đối để Frontend tự ghép với API_BASE_URL
            relative_url = f"/static/uploads/avatars/{unique_filename}"
            return jsonify({"url": relative_url})
            
        except Exception as e:
            print(f"Upload error: {e}")
            return jsonify({"message": "Upload failed"}), 500
            
    return jsonify({"message": "File type not allowed"}), 400