import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';

let leafletLoaded = false;

export default function MapView({ lat, lng, nombre, ciudad }) {
  const [mapReady, setMapReady] = useState(false);
  const mapId = `map-${Math.random().toString(36).slice(2)}`;

  useEffect(() => {
    if (!lat || !lng) return;

    const initMap = () => {
      const L = window.L;
      if (!L || !document.getElementById(mapId)) return;
      const map = L.map(mapId).setView([lat, lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
      L.marker([lat, lng]).addTo(map).bindPopup(`<b>${nombre}</b><br>${ciudad || ''}`).openPopup();
      return map;
    };

    if (window.L) { setMapReady(true); return; }

    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setMapReady(true);
      document.body.appendChild(script);
    }
  }, [lat, lng]);

  useEffect(() => {
    if (!mapReady || !lat || !lng) return;
    const L = window.L;
    if (!L || !document.getElementById(mapId)) return;
    try {
      const map = L.map(mapId).setView([lat, lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
      L.marker([lat, lng]).addTo(map).bindPopup(`<b>${nombre}</b><br>${ciudad || ''}`).openPopup();
    } catch {}
  }, [mapReady, lat, lng]);

  if (!lat || !lng) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col items-center justify-center h-48 text-gray-400">
        <MapPin className="w-8 h-8 mb-2" />
        <p className="text-sm">Sin coordenadas guardadas</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div id={mapId} style={{ height: 220 }} />
    </div>
  );
}
