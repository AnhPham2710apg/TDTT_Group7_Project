# api/auth_routes.py
import os
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify, current_app
from models import db, User

auth_bp = Blueprint('auth_bp', __name__)

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

# --- PROFILE ENDPOINTS ---

@auth_bp.route("/api/profile/<username>", methods=["GET"])
def get_profile(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"message": "User not found"}), 404
    return jsonify(user.to_dict())

@auth_bp.route("/api/profile", methods=["PUT"])
def update_profile():
    data = request.get_json()
    username = data.get("username")
    
    if not username:
        return jsonify({"message": "Username required"}), 400
        
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"message": "User not found"}), 404
        
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

@auth_bp.route("/api/upload/avatar", methods=["POST"])
def upload_avatar():
    if 'file' not in request.files:
        return jsonify({"message": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "No selected file"}), 400
        
    if file:
        filename = secure_filename(file.filename)
        # Save to static/uploads/avatars
        upload_folder = os.path.join(current_app.static_folder, 'uploads', 'avatars')
        os.makedirs(upload_folder, exist_ok=True)
        
        file_path = os.path.join(upload_folder, filename)
        file.save(file_path)
        
        # Return URL (relative to static)
        file_url = f"http://127.0.0.1:5000/static/uploads/avatars/{filename}"
        return jsonify({"url": file_url})
        
    return jsonify({"message": "Upload failed"}), 500