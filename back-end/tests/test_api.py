# back-end/tests/test_api.py
import pytest
import sys
import os
import json

# Thêm đường dẫn để Python tìm thấy code trong thư mục api
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + "/api")

from app import app, db
from models import User

@pytest.fixture
def client():
    # Cấu hình chế độ Test
    app.config['TESTING'] = True
    # Dùng database ảo trong RAM (SQLite) để test cho nhanh, không đụng vào DB thật
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            # Tạo 1 user mẫu để test login
            user = User(username="testuser")
            user.set_password("password123")
            db.session.add(user)
            db.session.commit()
        yield client

# --- TEST CASE 1: Kiểm tra trang chủ ---
def test_home_page(client):
    response = client.get('/')
    assert response.status_code == 200

# --- TEST CASE 2: Đăng nhập thất bại ---
def test_login_fail(client):
    response = client.post('/api/login', json={
        "username": "testuser",
        "password": "wrongpassword"
    })
    assert response.status_code == 401 # Mong đợi lỗi 401

# --- TEST CASE 3: Đăng nhập thành công ---
def test_login_success(client):
    response = client.post('/api/login', json={
        "username": "testuser",
        "password": "password123"
    })
    assert response.status_code == 200 # Mong đợi thành công
    data = json.loads(response.data)
    assert data['user']['username'] == "testuser"

# --- TEST CASE 4: Tìm kiếm (Dù DB ảo chưa có data nhưng API phải chạy được) ---
def test_search_api(client):
    response = client.get('/api/search?keyword=pho')
    # API search trả về 200 (kể cả list rỗng) là đạt
    assert response.status_code == 200