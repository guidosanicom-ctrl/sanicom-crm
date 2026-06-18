import { useEffect, useState, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

let leafletLoaded = false;

export default function MapView({ lat, lng, nombre, ciudad, onLocalizar, geoLoading, tieneDir = false }) {
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const instanceRef = useRef(null);
  const mapId = useRef(`map-${Math.random().toString(36).slice(2)}`).current;

  // Cargar Leaflet una sola vez
  useEffect(() => {
    if (!lat || !lng) return;
    if (window.L) { setMapReady(true); return; }
    if (leafletLoaded) return;
    leafletLoaded = true;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.id = 'leaflet-js';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setMapReady(true);
    document.body.appendChild(script);
  }, [lat, lng]);

  // Inicializar / actualizar mapa cuando cambian coordenadas o Leaflet está listo
  useEffect(() => {
    if (!mapReady || !lat || !lng) return;
    const L = window.L;
    const el = document.getElementById(mapId);
    if (!L || !el) return;

    // Destruir instancia anterior si existe
    if (instanceRef.current) {
      try { instanceRef.current.remove(); } catch {}
      instanceRef.current = null;
    }

    try {
      const map = L.map(mapId).setView([lat, lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);
      L.marker([lat, lng]).addTo(map)
        .bindPopup(`<b>${nombre || ''}</b><br>${ciudad || ''}`)
        .openPopup();
      instanceRef.current = map;
    } catch {}
  }, [mapReady, lat, lng]);

  if (!lat || !lng) {
    const sinDireccion = !tieneDir;
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col items-center justify-center h-48 text-gray-400 gap-3">
        <MapPin className="w-8 h-8" />
        <p className="text-sm text-center">
          {geoLoading
            ? 'Buscando ubicación…'
            : sinDireccion
              ? 'Sin dirección registrada'
              : 'No se pudo localizar esta dirección'}
        </p>
        {onLocalizar && tieneDir && !geoLoading && (
          <button
            onClick={onLocalizar}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1B4F8A] rounded-lg hover:bg-[#163f6e] cursor-pointer transition-colors"
          >
            <MapPin className="w-3.5 h-3.5" />Localizar en mapa
          </button>
        )}
        {geoLoading && <Loader2 className="w-5 h-5 animate-spin text-[#1B4F8A]" />}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div id={mapId} style={{ height: 220 }} />
    </div>
  );
}
