import os
import pytest
import json
from unittest.mock import patch

# --- QUAN TRỌNG: Đặt biến môi trường TRƯỚC KHI import app ---
os.environ["FLASK_TESTING"] = "True"

# Bây giờ mới import app (lúc này app sẽ tự động nhận cấu hình RAM)
from api.app import app
from api.models import db, Restaurant

@pytest.fixture
def client():
    # Cấu hình thêm API Key giả
    app.config['GOONG_API_KEY'] = 'fake_key_for_testing'

    with app.test_client() as client:
        with app.app_context():
            # Tạo bảng mới trong RAM
            db.create_all()
            
            # Thêm dữ liệu giả
            res1 = Restaurant(
                place_id="123", name="Phở Thìn", 
                full_address="13 Lò Đúc, Hà Nội",
                district="Quận Hai Bà Trưng", 
                latitude=21.018, longitude=105.855,
                rating=4.5, foodType="mặn", bevFood="khô"
            )
            db.session.add(res1)
            db.session.commit()
            
        yield client
        
        # Dọn dẹp
        with app.app_context():
            db.session.remove()
            db.drop_all()

# --- CÁC TEST CASE ---

def test_search_api_basic(client):
    """Test tìm kiếm cơ bản"""
    response = client.get('/api/search?keyword=Phở')
    data = json.loads(response.data)
    
    assert response.status_code == 200
    assert len(data) >= 1
    assert data[0]['name'] == "Phở Thìn"

@patch('api.routes.get_coords_from_goong') 
def test_search_with_radius(mock_get_coords, client):
    """Test tìm quanh bán kính (Mock API)"""
    mock_get_coords.return_value = (21.018, 105.855) 
    
    response = client.get('/api/search?district=Quận Hai Bà Trưng&radius=1')
    data = json.loads(response.data)
    
    assert response.status_code == 200
    assert len(data) > 0
    assert data[0]['name'] == "Phở Thìn"

@patch('api.routes.get_coords_from_goong')
def test_search_radius_api_fail(mock_get_coords, client):
    """Test khi API Goong lỗi (None)"""
    mock_get_coords.return_value = None
    
    response = client.get('/api/search?district=Quận Hai Bà Trưng&radius=1')
    data = json.loads(response.data)
    
    assert response.status_code == 200
    assert data[0]['name'] == "Phở Thìn"