# api/review_routes.py
import os
import uuid
import json
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from models import db, Review, User, Favorite
from utils import allowed_file

review_bp = Blueprint('review_bp', __name__)

# ==============================================================================
# 1. QUẢN LÝ ĐÁNH GIÁ (REVIEWS)
# ==============================================================================

@review_bp.route("/api/reviews/<place_id>", methods=["GET"])
def get_reviews(place_id):
    """
    Lấy danh sách đánh giá của một địa điểm
    ---
    tags:
      - Reviews
    parameters:
      - name: place_id
        in: path
        type: string
        required: true
        description: ID của địa điểm (lấy từ Goong hoặc Database)
    responses:
      200:
        description: Danh sách các bài đánh giá
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
              rating:
                type: integer
              comment:
                type: string
              user:
                type: object
                properties:
                  username:
                    type: string
                  avatar_letter:
                    type: string
              images:
                type: array
                items:
                  type: string
                  description: URL của ảnh
    """
    try:
        reviews = Review.query.filter_by(place_id=place_id).order_by(Review.created_at.desc()).all()
        return jsonify([r.to_dict() for r in reviews])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@review_bp.route("/api/reviews", methods=["POST"])
def add_review():
    """
    Đăng bài đánh giá mới (Có upload ảnh)
    ---
    tags:
      - Reviews
    consumes:
      - multipart/form-data
    parameters:
      - name: username
        in: formData
        type: string
        required: true
        description: Tên đăng nhập của người đánh giá
      - name: place_id
        in: formData
        type: string
        required: true
        description: ID địa điểm
      - name: rating
        in: formData
        type: integer
        required: true
        description: Số sao (1-5)
      - name: comment
        in: formData
        type: string
        description: Nội dung bình luận
      - name: images
        in: formData
        type: file
        description: Chọn file ảnh để upload (Hỗ trợ upload nhiều file trên Postman/Frontend)
    responses:
      200:
        description: Đánh giá thành công
      400:
        description: Thiếu thông tin hoặc file không hợp lệ
      401:
        description: Người dùng chưa đăng nhập hoặc không tồn tại
    """
    try:
        username = request.form.get("username")
        place_id = request.form.get("place_id")
        rating = request.form.get("rating")
        comment = request.form.get("comment")
        files = request.files.getlist('images')

        if not username or not place_id or not rating:
            return jsonify({"error": "Thiếu thông tin"}), 400

        user = User.query.filter_by(username=username).first()
        if not user: return jsonify({"error": "Unauthorized"}), 401
            
        saved_filenames = []
        for file in files:
            if file and allowed_file(file.filename): # Dùng hàm từ utils
                ext = file.filename.rsplit('.', 1)[1].lower()
                unique_filename = f"{uuid.uuid4().hex}.{ext}"
                upload_folder = current_app.config['UPLOAD_FOLDER']
                file.save(os.path.join(upload_folder, unique_filename))
                saved_filenames.append(request.host_url + 'static/uploads/' + unique_filename)

        new_review = Review(
            user_id=user.id, place_id=place_id, rating=int(rating),
            comment=comment, images=json.dumps(saved_filenames)
        )
        db.session.add(new_review)
        db.session.commit()
        return jsonify({"message": "Success", "review": new_review.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@review_bp.route("/api/reviews/<int:review_id>", methods=["DELETE"])
def delete_review(review_id):
    """
    Xóa một bài đánh giá
    ---
    tags:
      - Reviews
    parameters:
      - name: review_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Đã xóa thành công
      404:
        description: Không tìm thấy bài đánh giá
    """
    try:
        review = Review.query.get(review_id)
        if not review: return jsonify({"error": "Not found"}), 404
        db.session.delete(review)
        db.session.commit()
        return jsonify({"message": "Deleted"})
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Error"}), 500
      
# --- THÊM ĐOẠN NÀY VÀO ---
@review_bp.route("/api/user/<username>/reviews", methods=["GET"])
def get_user_reviews(username):
    """
    Lấy danh sách các đánh giá do một User viết
    ---
    tags:
      - Reviews
    """
    try:
        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        # Lấy tất cả review của user này, sắp xếp mới nhất trước
        reviews = Review.query.filter_by(user_id=user.id).order_by(Review.created_at.desc()).all()
        
        return jsonify([r.to_dict() for r in reviews])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==============================================================================
# 2. QUẢN LÝ YÊU THÍCH (FAVORITES)
# ==============================================================================

@review_bp.route("/api/favorite", methods=["POST"])
def add_favorite():
    """
    Thêm địa điểm vào danh sách yêu thích
    ---
    tags:
      - Favorites
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            username:
              type: string
              example: "admin"
            place_id:
              type: string
              example: "place_12345"
    responses:
      200:
        description: Đã thêm vào yêu thích
      400:
        description: User không tồn tại hoặc địa điểm đã có trong danh sách
    """
    data = request.get_json()
    username = data.get("username")
    place_id = data.get("place_id")
    
    if not username or not place_id:
        return jsonify({"error": "Thiếu thông tin"}), 400

    user = User.query.filter_by(username=username).first()
    if not user: return jsonify({"error": "User 404"}), 404
    
    if not Favorite.query.filter_by(user_id=user.id, place_id=place_id).first():
        db.session.add(Favorite(user_id=user.id, place_id=place_id))
        db.session.commit()
    return jsonify({"message": "Added"})

@review_bp.route("/api/favorite/<username>", methods=["GET"])
def get_favorites(username):
    """
    Lấy danh sách ID các địa điểm yêu thích của User
    ---
    tags:
      - Favorites
    parameters:
      - name: username
        in: path
        type: string
        required: true
    responses:
      200:
        description: Thành công
        schema:
          type: object
          properties:
            username:
              type: string
            favorites:
              type: array
              items:
                type: string
                description: List các place_id
    """
    user = User.query.filter_by(username=username).first()
    if not user: return jsonify({"error": "User 404"}), 404
    favs = Favorite.query.filter_by(user_id=user.id).all()
    return jsonify({"username": username, "favorites": [f.place_id for f in favs]})

@review_bp.route("/api/favorite", methods=["DELETE"])
def remove_favorite():
    """
    Xóa địa điểm khỏi danh sách yêu thích
    ---
    tags:
      - Favorites
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            username:
              type: string
            place_id:
              type: string
    responses:
      200:
        description: Đã xóa thành công
    """
    data = request.get_json()
    user = User.query.filter_by(username=data.get("username")).first()
    if not user: return jsonify({"error": "User 404"}), 404
    fav = Favorite.query.filter_by(user_id=user.id, place_id=data.get("place_id")).first()
    if fav:
        db.session.delete(fav)
        db.session.commit()
    return jsonify({"message": "Removed"})