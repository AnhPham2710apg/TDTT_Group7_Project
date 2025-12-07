import { useEffect, useRef, useState } from 'react';
import goongjs from '@goongmaps/goong-js';
import polyline from '@mapbox/polyline';
import '@goongmaps/goong-js/dist/goong-js.css';

const GOONG_MAP_KEY = "m0h13U1deb9pxgukC0cN745d6H4FQNi2vyZNPi5m"; 

interface Waypoint {
  id: string;
  address?: string;
  lat: number;
  lon: number;
}

interface RouteMapProps {
  polylineOutbound: string | null;
  polylineReturn: string | null;
  points: Waypoint[];
  focusPoint?: { lat: number; lon: number } | null;
}

export const RouteMap = ({ polylineOutbound, polylineReturn, points, focusPoint }: RouteMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<goongjs.Map | null>(null);
  const markersRef = useRef<goongjs.Marker[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);

  // 1. KHỞI TẠO MAP
  useEffect(() => {
    if (mapRef.current) return;

    goongjs.accessToken = GOONG_MAP_KEY;

    const map = new goongjs.Map({
      container: mapContainerRef.current!,
      style: 'https://tiles.goong.io/assets/goong_map_web.json',
      center: [106.7009, 10.7769],
      zoom: 12,
      attributionControl: false
    });

    map.addControl(new goongjs.NavigationControl(), 'top-right');

    map.on('load', () => {
      setIsMapReady(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. ZOOM KHI CLICK
  useEffect(() => {
    if (!mapRef.current || !focusPoint) return;
    
    mapRef.current.flyTo({
      center: [focusPoint.lon, focusPoint.lat],
      zoom: 16,
      speed: 1.5,
      curve: 1.42,
      essential: true
    });
  }, [focusPoint]);

  // 3. VẼ MAP
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    // --- A. VẼ MARKER ---
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    
    const markerBounds = new goongjs.LngLatBounds();
    let hasPoints = false;

    points.forEach((point, index) => {
      hasPoints = true;
      
      const el = document.createElement('div');
      
      // --- SỬA LỖI TẠI ĐÂY ---
      // Chỉ index 0 là điểm xuất phát (Icon Map Pin)
      // Tất cả các điểm còn lại (1, 2, 3...) là số thứ tự
      if (index === 0) {
        // Icon SVG trực tiếp (Không lo lỗi ảnh)
        el.className = 'custom-marker-start';
        el.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#16a34a" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" fill="white"/>
          </svg>
        `;
        el.style.width = '40px';
        el.style.height = '40px';
        el.style.display = 'flex';
        el.style.justifyContent = 'center';
        el.style.alignItems = 'center';
        el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'; // Bóng đổ
      } else {
        // Icon số tròn
        el.className = 'custom-marker-number';
        el.innerText = `${index}`;
        el.style.backgroundColor = '#16a34a'; // Xanh lá
        el.style.color = 'white';
        el.style.width = '28px';
        el.style.height = '28px';
        el.style.borderRadius = '50%';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.fontWeight = 'bold';
        el.style.fontSize = '14px';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      }

      // Popup
      const popupHTML = `
        <div style="font-family: sans-serif; padding: 4px;">
          <h3 style="margin:0; font-size:14px; font-weight:600; color:#111;">${index === 0 ? "Xuất phát" : `Điểm số ${index}`}</h3>
          <p style="margin:4px 0 0; font-size:12px; color:#666;">${point.id}</p>
        </div>
      `;

      const popup = new goongjs.Popup({ 
        offset: index === 0 ? 35 : 20, // Offset khác nhau cho icon khác nhau
        closeButton: false,
        className: 'apple-popup' 
      }).setHTML(popupHTML);
      
      // Tinh chỉnh anchor để icon cắm đúng điểm
      const marker = new goongjs.Marker({ 
          element: el, 
          anchor: index === 0 ? 'bottom' : 'center' // Pin thì cắm đáy, Số thì cắm tâm
      })
        .setLngLat([point.lon, point.lat])
        .setPopup(popup)
        .addTo(map);
        
      markersRef.current.push(marker);
      markerBounds.extend([point.lon, point.lat]);
    });

    // --- B. HÀM VẼ LAYER ---
    const drawLayer = (id: string, encoded: string | null, color: string) => {
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(id)) map.removeSource(id);

        if (!encoded) return;

        try {
            const decodedRaw = polyline.decode(encoded);
            const coordinates = decodedRaw.map(c => [c[1], c[0]]);

            map.addSource(id, {
                'type': 'geojson',
                'data': {
                    'type': 'Feature',
                    'properties': {},
                    'geometry': { 'type': 'LineString', 'coordinates': coordinates }
                }
            });

            const layers = map.getStyle().layers;
            let firstSymbolId;
            if (layers) {
                for (const layer of layers) {
                    if (layer.type === 'symbol') { firstSymbolId = layer.id; break; }
                }
            }

            map.addLayer({
                'id': id,
                'type': 'line',
                'source': id,
                'layout': { 'line-join': 'round', 'line-cap': 'round' },
                'paint': {
                    'line-color': color,
                    'line-width': 6,
                    'line-opacity': 0.9
                }
            }, firstSymbolId);

            return coordinates;
        } catch (e) {
            console.error(`Lỗi vẽ ${id}:`, e);
            return [];
        }
    };

    const coordsOutbound = drawLayer('route-outbound', polylineOutbound, '#16a34a');
    const coordsReturn = drawLayer('route-return', polylineReturn, '#f97316');

    // --- C. ZOOM ---
    const allCoords = [...(coordsOutbound || []), ...(coordsReturn || [])];
    
    if (allCoords.length > 0) {
        const start = allCoords[0] as [number, number];
        const bounds = allCoords.reduce((b, c) => b.extend(c as [number, number]), new goongjs.LngLatBounds(start, start));
        
        if (!focusPoint) {
             map.fitBounds(bounds, { padding: 60 });
        }
    } else if (hasPoints && !focusPoint) {
        map.fitBounds(markerBounds, { padding: 60, maxZoom: 14 });
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polylineOutbound, polylineReturn, points, isMapReady]);

  return (
    <>
      <style>{`
        .apple-popup .mapboxgl-popup-content {
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(0,0,0,0.05);
        }
        .apple-popup .mapboxgl-popup-tip {
          border-top-color: rgba(255, 255, 255, 0.95);
        }
      `}</style>
      <div 
        ref={mapContainerRef} 
        className="w-full h-full rounded-lg shadow-inner bg-gray-100 overflow-hidden" 
      />
    </>
  );
};

export default RouteMap;