# tests/test_calculations.py
import pytest
from restaurant_routes import haversine_distance

def test_haversine_distance():
    # Tọa độ Hồ Gươm
    lat1, lon1 = 21.028511, 105.854444
    # Tọa độ Nhà Hát Lớn (cách khoảng 400-500m)
    lat2, lon2 = 21.024440, 105.857590

    distance = haversine_distance(lat1, lon1, lat2, lon2)

    # Kiểm tra xem kết quả có hợp lý không (khoảng 0.5km)
    assert 0.4 < distance < 0.6
    assert isinstance(distance, float)

def test_haversine_same_point():
    # Khoảng cách giữa 2 điểm giống nhau phải là 0
    dist = haversine_distance(10.0, 10.0, 10.0, 10.0)
    assert dist == 0