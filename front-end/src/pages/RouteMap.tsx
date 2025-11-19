// src/components/RouteMap.tsx

import { MapContainer, TileLayer, GeoJSON, useMap, Marker, Popup } from 'react-leaflet';
import { LatLngExpression, Icon } from 'leaflet';
import { useEffect } from 'react';
import L from 'leaflet';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = new Icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Định nghĩa lại kiểu GeoJSON (bạn có thể import từ OptimizeRoutePage nếu đã export)
interface GeoJSONLineString {
  type: "LineString";
  coordinates: [number, number][]; // [lon, lat]
}

// --- Component con để tự động zoom theo đường đi ---
interface MapEffectProps {
  polyline: GeoJSONLineString;
}

function MapEffect({ polyline }: MapEffectProps) {
  const map = useMap();

  useEffect(() => {
    if (polyline && polyline.coordinates.length > 0) {
      // 1. Tạo một layer GeoJSON (không hiển thị) chỉ để lấy bounds
      // Lưu ý: L.geoJSON sẽ tự động xử lý [lon, lat] thành [lat, lon] cho Leaflet
      const geoJsonLayer = L.geoJSON(polyline);
      
      // 2. Lấy "khung" (bounds) của đường đi
      const bounds = geoJsonLayer.getBounds();
      
      // 3. Ra lệnh cho bản đồ "fit" (zoom + di chuyển) vừa khít vào khung đó
      map.fitBounds(bounds, { padding: [50, 50] }); // Thêm 50px padding
    }
  }, [polyline, map]); // Chạy lại khi polyline hoặc map thay đổi

  return null;
}

// 3. Định nghĩa kiểu Waypoint (có thể import nếu bạn đưa ra file riêng)
interface Waypoint {
  id: string;
  lat: number;
  lon: number;
}

// --- Component bản đồ chính ---
interface RouteMapProps {
  polylineData: GeoJSONLineString | null;
  points: Waypoint[]; // 4. Thêm prop 'points'
}

// Tọa độ mặc định (ví dụ: trung tâm TP. HCM)
const defaultCenter: LatLngExpression = [10.7769, 106.7009];

export const RouteMap = ({ polylineData, points }: RouteMapProps) => {
  // Key để "bắt buộc" React render lại MapContainer khi polyline thay đổi
  // Điều này giúp component 'MapEffect' chạy đúng
  // Key sẽ dựa trên cả polyline VÀ các điểm
  const mapKey = (polylineData ? JSON.stringify(polylineData.coordinates) : 'default') +
                 (points ? JSON.stringify(points.map(p => p.id)) : '');

  return (
    <MapContainer
      key={mapKey}
      center={defaultCenter}
      zoom={13}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%', borderRadius: '8px' }}
      attributionControl={false}
    >
      {/* Lớp bản đồ nền (sử dụng OpenStreetMap) */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Hiển thị đường đi (polyline) nếu có
        Component GeoJSON của react-leaflet đủ thông minh
        để xử lý đối tượng GeoJSON (với tọa độ [lon, lat])
      */}
      {polylineData && (
        <GeoJSON 
          data={polylineData} 
          style={() => ({
            color: '#3b82f6', // Màu xanh
            weight: 5,
            opacity: 0.8,
          })} 
        />
      )}
      
      {/* Component hiệu ứng để tự động zoom */}
      {polylineData && <MapEffect polyline={polylineData} />}
      {/* --- BẮT ĐẦU THAY ĐỔI --- */}
      {/* 6. Vẽ các điểm Marker (MapPin) */}
      {points.map((point, index) => {
        // Đặt tên cho Popup
        let popupText = point.id; // Tên nhà hàng
        if (point.id === 'start-point') popupText = 'Điểm xuất phát';
        if (point.id === 'end-point') popupText = 'Điểm kết thúc';
        
        return (
          <Marker 
            key={`${point.id}-${index}`} 
            position={[point.lat, point.lon]} // Leaflet dùng [lat, lon]
          >
            <Popup>
              {popupText}
            </Popup>
          </Marker>
        )
      })}
      {/* --- KẾT THÚC THAY ĐỔI --- */}
    </MapContainer>
  );
};

export default RouteMap;