# back-end/tests/test_api.py
import pytest
import sys
import os
import json

# Add the api directory to the path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + "/api")

from app import app, db
from models import User

@pytest.fixture
def client():
    # 1. Configure the app for testing
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    # 2. Create a test client
    with app.test_client() as client:
        # 3. Establish an application context
        with app.app_context():
            # SETUP: Create tables and default data
            db.create_all()
            
            # Check if user exists before adding to avoid IntegrityError
            if not User.query.filter_by(username="testuser").first():
                user = User(username="testuser")
                user.set_password("password123")
                db.session.add(user)
                db.session.commit()
            
            # Yield control to the test function
            yield client
            
            # TEARDOWN: Clean up after test is done
            db.session.remove()
            db.drop_all()

# ... (Keep your test functions below as they are) ...

def test_home_page(client):
    response = client.get('/')
    assert response.status_code == 200

def test_login_fail(client):
    response = client.post('/api/login', json={
        "username": "testuser",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

def test_login_success(client):
    response = client.post('/api/login', json={
        "username": "testuser",
        "password": "password123"
    })
    assert response.status_code == 200
    data = json.loads(response.data)
    # Check if 'user' key exists in response (adjust based on your actual API response structure)
    if 'user' in data:
        assert data['user']['username'] == "testuser"

def test_search_api(client):
    response = client.get('/api/search?keyword=pho')
    # Depending on your mock data or logic, this might return 200 OK
    assert response.status_code == 200