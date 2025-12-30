# TDTT Group 7 Project - Food Tour Assistant

Welcome to the Food Tour Assistant project! This application allows users to discover restaurants, view details, reviews, and weather information, plan food tour routes, and more.

## Project Structure

The project is divided into two main parts:
- **`back-end/`**: Python Flask API server handling data, authentication, and logic.
- **`front-end/`**: React (Vite) application for the user interface.

---

## 🚀 How to Run the Project

### Prerequisites
- **Python** (3.10 or higher)
- **Node.js** (18 or higher)
- **Git**

### 1. Backend Setup (Flask API)

The backend runs on port `5000` by default.

#### **Step 1: Navigate to the backend directory**
**Windows / Linux / macOS:**
```bash
cd back-end
```

#### **Step 2: Create and Activate Virtual Environment**
It is recommended to use a virtual environment to manage dependencies.

**Windows:**
```powershell
# Create virtual environment
python -m venv .venv

# Activate it
.venv\Scripts\activate
```

**Linux / macOS:**
```bash
# Create virtual environment
python3 -m venv .venv

# Activate it
source .venv/bin/activate
```

#### **Step 3: Install Dependencies**
**Windows / Linux / macOS:**
```bash
pip install -r requirements.txt
```

#### **Step 4: Configuration (.env)**
Create a file named `.env` in the `back-end` directory. This file stores your database connection and API keys.

**Example content for `.env`:**
```ini
# Database Configuration
DATABASE_URL=sqlite:///database.db
# Or for PostgreSQL: postgresql://user:password@localhost:5432/dbname

# API Keys
GOONG_API_KEY=your_goong_api_key_here
OPEN_WEATHER_API_KEY=your_open_weather_api_key_here
SECRET_KEY=your_secret_key_here
```

#### **Step 5: Run the Backend Server**
**Windows:**
```powershell
python api/app.py
```

**Linux / macOS:**
```bash
python3 api/app.py
```

---

### 2. Frontend Setup (React App)

The frontend runs on port `5173` by default.

#### **Step 1: Navigate to the frontend directory**
Open a new terminal window (keep the backend running in the previous one).

**Windows / Linux / macOS:**
```bash
cd front-end
```

#### **Step 2: Install Dependencies**
```bash
npm install
```

#### **Step 3: Run the Development Server**
```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173`.

---

## 🔑 API Keys & Configuration

### Backend API Keys
Fill these in the `.env` file located in the `back-end` folder (as shown in Step 4 above).
- **`GOONG_API_KEY`**: For map services.
- **`OPEN_WEATHER_API_KEY`**: For fetching weather data.
- **`SECRET_KEY`**: For session security and JWT tokens.
- **`DATABASE_URL`**: Connection string to your database.

### Frontend API Keys
Currently, the map API key for the frontend is configured directly in the code.
- **Location**: `front-end/src/components/RouteMap.tsx`
- **Variable**: `GOONG_MAP_KEY`
- **Action**: Open the file and replace `"YOUR_MAP_API_KEY"` with your actual Goong Map key.

---

## 🗄️ Database Location

The database configuration is controlled by the **`DATABASE_URL`** variable in your `back-end/.env` file.

- **SQLite (Default/Local)**: If you use `sqlite:///database.db`, the database will be a file named `database.db` located in the `back-end` folder (or wherever the relative path points).
- **PostgreSQL/MySQL**: If you provide a full connection string (e.g., `postgresql://...`), the database is hosted on that server.

*Fallback*: If no `.env` or `DATABASE_URL` is found, the system will attempt to create/use `sqlite:///fallback.db` in the `back-end` directory.

---

## 📝 Features
- **User Authentication**: Login, Register.
- **Restaurant Discovery**: Search, Filter, View Details.
- **Reviews**: Read and write reviews for places.
- **Map & Routing**: Visualize locations and plan routes using Goong Map.
- **Weather**: View weather forecasts for your trip.
