# Food Tour Assistant - Setup Guide

## 🎉 Project Overview

Food Tour Assistant is a modern web application that helps users discover restaurants based on their preferences, save favorites, and optimize routes for their food tours.

## 🏗️ Architecture

### Frontend (✅ Complete)
- **Framework**: React + TypeScript + Vite
- **Styling**: TailwindCSS with custom design system
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **UI Components**: Shadcn/ui
- **Maps**: @react-google-maps/api (ready for integration)

### Backend (🔄 Needs Setup)
**Important**: Lovable doesn't support Python/Flask. Instead, we use **Lovable Cloud** which provides:
- PostgreSQL database (instead of SQLite)
- Built-in authentication system
- Serverless Edge Functions (TypeScript/Deno instead of Python)
- All the features you need!

## 📱 Available Pages

1. **Home Page** (`/`) - Landing page with features
2. **Login Page** (`/login`) - User authentication
3. **Register Page** (`/register`) - New user registration
4. **Search Page** (`/search`) - Search restaurants by preferences
5. **Results Page** (`/results`) - Display restaurant recommendations
6. **Favorites Page** (`/favorites`) - User's saved restaurants
7. **Optimize Route Page** (`/optimize`) - TSP route optimization with map

## 🚀 Current Status

### ✅ Completed
- Beautiful food-themed design system (warm orange/amber palette)
- All 7 pages with modern UI
- Component architecture (Navbar, RestaurantCard, etc.)
- Routing and navigation
- Mock data for demonstration
- Responsive design

### 🔄 Next Steps

1. **Enable Lovable Cloud** (replaces Python backend)
   - Click "Connect Lovable Cloud" button below
   - This gives you database, auth, and serverless functions

2. **Set up Google Maps API**
   - Get API key from Google Cloud Console
   - Enable: Places API, Distance Matrix API, Maps JavaScript API
   - Add as secret in Lovable Cloud

3. **Create Edge Functions** (replaces Flask routes)
   - `recommend` - Restaurant recommendations
   - `optimize` - TSP route optimization
   - `favorites` - Manage user favorites

4. **Database Tables** (auto-created with Lovable Cloud)
   - `users` - User authentication
   - `favorites` - Saved restaurants

## 🔑 Environment Variables Needed

```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

## 🎨 Design Features

- **Color Palette**: Warm food-themed (orange, amber, red)
- **Gradients**: Hero gradient for CTAs
- **Shadows**: Card shadows for depth
- **Animations**: Smooth hover effects and transitions
- **Typography**: Clean, modern font hierarchy

## 📝 API Endpoints (To Be Created)

### User Management
- `POST /register` - Register new user
- `POST /login` - User login
- `GET /favorites` - Get user favorites
- `POST /favorites` - Add favorite

### Recommendations
- `POST /recommend` - Get restaurant recommendations
  - Input: `{ keyword, budget, district }`
  - Output: Array of restaurants with `is_favorite` flag

### Route Optimization
- `POST /optimize` - Optimize route using TSP
  - Input: `{ place_ids[], starting_point }`
  - Output: `{ order[], total_distance, total_duration, polyline }`

## 🧪 Testing

The app currently works with mock data. You can:
1. Navigate through all pages
2. See the UI/UX design
3. Test user flows
4. Click through all features

## 📦 Technologies Used

- React 18
- TypeScript
- TailwindCSS
- React Router
- Axios
- Shadcn/ui components
- Lucide icons
- @react-google-maps/api (ready)

## 🎯 Next Implementation Priority

1. Enable Lovable Cloud
2. Add Google Maps API key
3. Create recommendation edge function
4. Create optimization edge function (OR-Tools equivalent in TypeScript)
5. Implement real authentication
6. Connect map visualization

## 💡 Notes

- The UI is fully functional with navigation
- All forms validate input
- Toast notifications for user feedback
- Responsive design works on all devices
- Clean code architecture for easy backend integration

Ready to connect the backend? Click the button below! 👇
