# api/app.py
import sys
import os
import uuid
from dotenv import load_dotenv

# 1. LOAD CONFIG
load_dotenv()
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)
backend_dir = os.path.dirname(current_dir)

from flask import Flask, jsonify
from flask_cors import CORS
from flasgger import Swagger
from models import db, bcrypt, Restaurant

# IMPORT BLUEPRINTS
from restaurant_routes import restaurant_bp
from auth_routes import auth_bp
from review_routes import review_bp
from map_routes import map_bp  # <--- Blueprint Mới

app = Flask(__name__, static_folder='../static')

# --- CONFIGURATION ---
app.config['SWAGGER'] = {'title': 'Food Tour API', 'uiversion': 3}
swagger = Swagger(app)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret')

# DATABASE
db_url = os.environ.get('DATABASE_URL') or os.environ.get('DATABASE_URL_LOCAL')
if not db_url: db_url = "sqlite:///fallback.db"
if db_url.startswith("postgres://"): db_url = db_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_BINDS'] = {'restaurants_db': db_url}

# UPLOAD & KEYS
app.config['UPLOAD_FOLDER'] = os.path.join(backend_dir, 'static', 'uploads')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
app.config['GOONG_API_KEY'] = os.environ.get('GOONG_API_KEY', "")

# CORS
allowed_origins = [
    "http://localhost:5173", 
    "http://localhost:3000",
    "http://localhost:8080",
    "https://tdtt-group7-project.vercel.app"
]
CORS(app, resources={r"/api/*": {"origins": allowed_origins}}, supports_credentials=True)

# --- INIT ---
db.init_app(app)
bcrypt.init_app(app)

with app.app_context():
    db.create_all()

# --- REGISTER BLUEPRINTS ---
app.register_blueprint(auth_bp)        # Login, Register
app.register_blueprint(restaurant_bp)  # Search, Detail
app.register_blueprint(review_bp)      # Reviews, Favorites
app.register_blueprint(map_bp)         # Geocode, Route, Optimize

# --- SEED DATA (Giữ lại để nạp data nếu cần) ---
@app.route("/api/seed_database", methods=["GET"])
def seed_database():
    if Restaurant.query.first(): return jsonify({"message": "Data exists!"})
    # ... (Code seed data mẫu của bạn, giữ nguyên hoặc bỏ qua nếu đã nạp từ sqlite)
    return jsonify({"message": "Done"})

@app.route("/")
def hello(): return "Backend is Running Perfectly!"

if __name__ == "__main__":
    app.run(debug=True, port=5000)