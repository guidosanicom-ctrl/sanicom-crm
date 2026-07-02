import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, DirectionsRenderer } from '@react-google-maps/api';
import { useClientesStore } from '../../store/clientesStore';
import { useAuthStore } from '../../store/authStore';
import { geocodificar } from '../../utils/geocode';
import { MapPin, Route, X, Loader2, Navigation } from 'lucide-react';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const LIBRARIES = ['geometry'];
const CENTER_ES = { lat: 40.4168, lng: -3.7038 }; // Madrid

const MARKER_COLOR = {
  'Activo':        '#22C55E',
  'Inactivo':      '#EF4444',
  'No disponible': '#F59E0B',
};
const ESTADO_LABEL = {
  'Activo':        '🟢 Contactado',
  'Inactivo':      '🔴 No contactado',
  'No disponible': '🟡 No disponible',
};

const EQUIPO_KEYWORDS = {
  'Diatermia':      ['diatermia', 'ros', 'indiba'],
  'Onda de Choque': ['onda', 'choque', 'radial', 'focal', 'ems', 'eswt'],
  'Ecógrafo':       ['eco', 'ecografo', 'sonoscape', 'esaote', 'mindray'],
  'Super Inductiva':['inductiva', 'magneto', 'bltl', 'sis'],
};
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const matchEquipo = (cliente, filtro) => {
  if (!filtro) return true;
  const kws = EQUIPO_KEYWORDS[filtro] || [];
  const txt = (cliente.equiposInteres || [])
    .map(e => `${e.nombre || ''} ${e.categoria || ''} ${e.subcategoria || ''} ${e.modeloMarca || ''}`)
    .map(norm).join(' ');
  return kws.some(kw => txt.includes(norm(kw)));
};

function markerIcon(estado, selected) {
  const color = MARKER_COLOR[estado] || '#6B7280';
  return {
    path: window.google.maps.SymbolPath.CIRCLE,
    scale: selected ? 14 : 10,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: selected ? 3 : 2,
  };
}

export default function MapaPage() {
  const { clientes, updateCliente } = useClientesStore();
  const { user, CARLOS_ESPECIALIDADES } = useAuthStore();
  const navigate = useNavigate();

  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: API_KEY, libraries: LIBRARIES });
  const mapRef = useRef(null);

  // Filtros
  const [filterEsp, setFilterEsp]    = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterEquipo, setFilterEquipo] = useState('');

  // UI state
  const [activeId, setActiveId]   = useState(null);   // marker info abierto
  const [routeIds, setRouteIds]   = useState(new Set()); // clientes en ruta
  const [directions, setDirections] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [geocoding, setGeocoding]  = useState(false);
  const [geocodedCount, setGeocodedCount] = useState(0);

  // Carlos ve solo sus especialidades
  const isCarlos = user?.email === 'carlosleal@sanicom.es';
  const baseClientes = isCarlos
    ? clientes.filter(c => CARLOS_ESPECIALIDADES.includes(c.especialidad))
    : clientes;

  // Especialidades disponibles para filtro
  const especialidades = useMemo(() =>
    [...new Set(baseClientes.map(c => c.especialidad).filter(Boolean))].sort(),
  [baseClientes]);

  // Clientes filtrados
  const filtered = useMemo(() => baseClientes.filter(c => {
    if (filterEsp    && c.especialidad !== filterEsp) return false;
    if (filterEstado && c.estado !== filterEstado)    return false;
    if (!matchEquipo(c, filterEquipo))                return false;
    return true;
  }), [baseClientes, filterEsp, filterEstado, filterEquipo]);

  // Clientes con coordenadas (para pintar en el mapa)
  const withCoords = useMemo(() => filtered.filter(c => c.lat && c.lng), [filtered]);

  // Geocodificar en lote los clientes sin coordenadas al montar
  useEffect(() => {
    const sinCoords = baseClientes.filter(c => !c.lat && !c.lng && (c.ciudad || c.direccion));
    if (sinCoords.length === 0) return;
    let cancelled = false;
    setGeocoding(true);
    (async () => {
      for (const c of sinCoords) {
        if (cancelled) break;
        const coords = await geocodificar(c.direccion, c.ciudad, c.provincia, c.cp);
        if (coords && !cancelled) {
          updateCliente(c.id, { lat: coords.lat, lng: coords.lng });
          setGeocodedCount(n => n + 1);
        }
        await new Promise(r => setTimeout(r, 250)); // Nominatim: máx 4 req/s
      }
      if (!cancelled) setGeocoding(false);
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onMapLoad = useCallback(map => { mapRef.current = map; }, []);

  // Calcular ruta óptima
  const calcularRuta = () => {
    if (routeIds.size < 2) return;
    const pts = [...routeIds]
      .map(id => baseClientes.find(c => c.id === id))
      .filter(c => c?.lat && c?.lng);
    if (pts.length < 2) return;

    const origin      = { lat: pts[0].lat,              lng: pts[0].lng };
    const destination = { lat: pts[pts.length - 1].lat, lng: pts[pts.length - 1].lng };
    const waypoints   = pts.slice(1, -1).map(c => ({ location: { lat: c.lat, lng: c.lng }, stopover: true }));

    setRouteLoading(true);
    const svc = new window.google.maps.DirectionsService();
    svc.route({
      origin, destination, waypoints,
      optimizeWaypoints: true,
      travelMode: window.google.maps.TravelMode.DRIVING,
    }, (result, status) => {
      setRouteLoading(false);
      if (status === 'OK') setDirections(result);
      else console.error('[Directions]', status);
    });
  };

  const toggleRouteClient = (id, e) => {
    e.stopPropagation();
    setRouteIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setDirections(null);
  };

  const clearRuta = () => { setRouteIds(new Set()); setDirections(null); };

  const activeCliente = activeId ? baseClientes.find(c => c.id === activeId) : null;

  const sel = 'px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none';

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <select className={sel} value={filterEsp} onChange={e => setFilterEsp(e.target.value)}>
            <option value="">Todas las especialidades</option>
            {especialidades.map(e => <option key={e}>{e}</option>)}
          </select>
          <select className={sel} value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="Activo">🟢 Contactado (Activo)</option>
            <option value="Inactivo">🔴 No contactado (Inactivo)</option>
            <option value="No disponible">🟡 No disponible</option>
          </select>
          <select className={sel} value={filterEquipo} onChange={e => setFilterEquipo(e.target.value)}>
            <option value="">Todos los equipos</option>
            {Object.keys(EQUIPO_KEYWORDS).map(k => <option key={k}>{k}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <MapPin className="w-4 h-4" />
          <span>{withCoords.length} / {filtered.length} clientes con ubicación</span>
          {geocoding && (
            <span className="flex items-center gap-1 text-blue-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              Geocodificando… (+{geocodedCount})
            </span>
          )}
        </div>
      </div>

      {/* Leyenda + Planificador */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4">
          {Object.entries(ESTADO_LABEL).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5 text-xs text-gray-600">
              <div className="w-3 h-3 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: MARKER_COLOR[k] }} />
              {v}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {routeIds.size > 0 && (
            <>
              <span className="text-xs text-gray-500">{routeIds.size} paradas seleccionadas</span>
              <button onClick={clearRuta} className="text-xs text-gray-400 hover:text-red-500 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={calcularRuta}
                disabled={routeIds.size < 2 || routeLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B4F8A] text-white text-xs font-medium rounded-lg
                  hover:bg-[#163d6b] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors">
                {routeLoading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Navigation className="w-3.5 h-3.5" />}
                Calcular ruta óptima
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mapa */}
      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 600 }}>
        {!isLoaded ? (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <Loader2 className="w-8 h-8 animate-spin text-[#1B4F8A]" />
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={CENTER_ES}
            zoom={6}
            onLoad={onMapLoad}
            options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true }}
          >
            {/* Ruta */}
            {directions && (
              <DirectionsRenderer
                directions={directions}
                options={{ suppressMarkers: false, polylineOptions: { strokeColor: '#1B4F8A', strokeWeight: 4 } }}
              />
            )}

            {/* Marcadores */}
            {withCoords.map(c => (
              <Marker
                key={c.id}
                position={{ lat: c.lat, lng: c.lng }}
                icon={markerIcon(c.estado, activeId === c.id || routeIds.has(c.id))}
                title={c.nombre}
                onClick={() => setActiveId(c.id)}
              />
            ))}

            {/* InfoWindow */}
            {activeCliente?.lat && activeCliente?.lng && (
              <InfoWindow
                position={{ lat: activeCliente.lat, lng: activeCliente.lng }}
                onCloseClick={() => setActiveId(null)}
              >
                <div className="min-w-[180px] max-w-[220px] text-sm font-sans">
                  <p className="font-bold text-gray-900 mb-1">{activeCliente.nombre}</p>
                  {activeCliente.ciudad && (
                    <p className="text-gray-500 text-xs mb-1">📍 {activeCliente.ciudad}{activeCliente.provincia ? `, ${activeCliente.provincia}` : ''}</p>
                  )}
                  {activeCliente.telefono && (
                    <p className="text-gray-600 text-xs mb-2">📞 {activeCliente.telefono}</p>
                  )}
                  <div className="flex items-center gap-1 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MARKER_COLOR[activeCliente.estado] || '#6B7280' }} />
                    <span className="text-xs text-gray-500">{ESTADO_LABEL[activeCliente.estado] || activeCliente.estado}</span>
                  </div>
                  <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => navigate(`/clientes/${activeCliente.id}`)}
                      className="flex-1 text-xs bg-[#1B4F8A] text-white px-2 py-1 rounded font-medium hover:bg-[#163d6b] cursor-pointer">
                      Ver ficha
                    </button>
                    <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={routeIds.has(activeCliente.id)}
                        onChange={e => toggleRouteClient(activeCliente.id, e)}
                        className="accent-[#1B4F8A]"
                      />
                      Ruta
                    </label>
                  </div>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        )}
      </div>

      {/* Info ruta calculada */}
      {directions && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1 flex items-center gap-2">
            <Route className="w-4 h-4" />
            Ruta óptima calculada — {routeIds.size} paradas
          </p>
          {directions.routes[0]?.legs?.map((leg, i) => (
            <p key={i} className="text-xs text-blue-600 mt-0.5">
              Tramo {i + 1}: {leg.start_address?.split(',')[0]} → {leg.end_address?.split(',')[0]}
              {' '}({leg.distance?.text}, {leg.duration?.text})
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
