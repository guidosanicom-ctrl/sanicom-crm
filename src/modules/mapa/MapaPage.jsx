import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientesStore } from '../../store/clientesStore';
import { useAuthStore } from '../../store/authStore';
import { geocodificar } from '../../utils/geocode';
import { MapPin, X, Loader2, Navigation } from 'lucide-react';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const CENTER_ES = { lat: 40.4168, lng: -3.7038 };

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
const matchEquipo = (c, filtro) => {
  if (!filtro) return true;
  const kws = EQUIPO_KEYWORDS[filtro] || [];
  const txt = (c.equiposInteres || [])
    .map(e => `${e.nombre||''} ${e.categoria||''} ${e.subcategoria||''} ${e.modeloMarca||''}`)
    .map(norm).join(' ');
  return kws.some(kw => txt.includes(norm(kw)));
};

function buildInfoContent(c, routeIds) {
  const color = MARKER_COLOR[c.estado] || '#6B7280';
  const label = ESTADO_LABEL[c.estado] || c.estado || '';
  const checked = routeIds.has(c.id) ? 'checked' : '';
  return `
    <div style="min-width:180px;max-width:220px;font-family:sans-serif;font-size:13px;line-height:1.4">
      <p style="font-weight:700;margin:0 0 4px;color:#111">${c.nombre || ''}</p>
      ${c.ciudad ? `<p style="color:#6b7280;font-size:11px;margin:0 0 2px">📍 ${c.ciudad}${c.provincia ? ', ' + c.provincia : ''}</p>` : ''}
      ${c.telefono ? `<p style="color:#6b7280;font-size:11px;margin:0 0 4px">📞 ${c.telefono}</p>` : ''}
      <div style="display:flex;align-items:center;gap:5px;margin-bottom:6px">
        <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${color}"></span>
        <span style="font-size:11px;color:#6b7280">${label}</span>
      </div>
      <div style="display:flex;gap:6px;padding-top:8px;border-top:1px solid #e5e7eb">
        <button
          onclick="window.__mapaNav('${c.id}')"
          style="flex:1;background:#1B4F8A;color:#fff;border:none;border-radius:4px;padding:5px 8px;font-size:11px;cursor:pointer;font-weight:600">
          Ver ficha
        </button>
        <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:#374151;cursor:pointer;user-select:none">
          <input
            type="checkbox"
            ${checked}
            onchange="window.__mapaToggleRoute('${c.id}')"
            style="accent-color:#1B4F8A;cursor:pointer"
          />
          Ruta
        </label>
      </div>
    </div>`;
}

export default function MapaPage() {
  const { clientes, updateCliente } = useClientesStore();
  const { user, CARLOS_ESPECIALIDADES } = useAuthStore();
  const navigate = useNavigate();

  const [gmLoaded, setGmLoaded] = useState(false);
  const [filterEsp, setFilterEsp]     = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterEquipo, setFilterEquipo] = useState('');
  const [routeIds, setRouteIds]   = useState(() => new Set());
  const [directions, setDirections] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [geocoding, setGeocoding]   = useState(false);
  const [geocodedCount, setGeocodedCount] = useState(0);

  const mapContainerRef = useRef(null);
  const mapRef          = useRef(null);
  const markersRef      = useRef(new Map());   // id → google.maps.Marker
  const infoWindowRef   = useRef(null);
  const directionsRendererRef = useRef(null);
  const activeClienteRef = useRef(null);
  const routeIdsRef     = useRef(new Set());

  // Carlos ve solo sus especialidades
  const isCarlos = user?.email === 'carlosleal@sanicom.es';
  const baseClientes = useMemo(() =>
    isCarlos ? clientes.filter(c => CARLOS_ESPECIALIDADES.includes(c.especialidad)) : clientes,
  [clientes, isCarlos, CARLOS_ESPECIALIDADES]);

  const especialidades = useMemo(() =>
    [...new Set(baseClientes.map(c => c.especialidad).filter(Boolean))].sort(),
  [baseClientes]);

  const filtered = useMemo(() => baseClientes.filter(c => {
    if (filterEsp    && c.especialidad !== filterEsp) return false;
    if (filterEstado && c.estado !== filterEstado)    return false;
    if (!matchEquipo(c, filterEquipo))                return false;
    return true;
  }), [baseClientes, filterEsp, filterEstado, filterEquipo]);

  const withCoords = useMemo(() => filtered.filter(c => c.lat && c.lng), [filtered]);
  const totalWithCoords = useMemo(() => baseClientes.filter(c => c.lat && c.lng).length, [baseClientes]);

  // ── 1. Cargar el script de Google Maps ──────────────────────────────────
  useEffect(() => {
    if (window.google?.maps) { setGmLoaded(true); return; }
    const existing = document.getElementById('gm-script');
    if (existing) {
      // Script ya inyectado, esperar callback
      window.__gmInit = () => setGmLoaded(true);
      return;
    }
    window.__gmInit = () => setGmLoaded(true);
    const script = document.createElement('script');
    script.id  = 'gm-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&callback=__gmInit`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    return () => {
      // No eliminamos el script al desmontar para no romper instancias en caché
      delete window.__gmInit;
    };
  }, []);

  // ── 2. Inicializar el mapa una vez cargado el script ────────────────────
  useEffect(() => {
    if (!gmLoaded || !mapContainerRef.current || mapRef.current) return;

    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: CENTER_ES,
      zoom: 6,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
    });
    mapRef.current = map;

    infoWindowRef.current = new window.google.maps.InfoWindow();
    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      map,
      suppressMarkers: false,
      polylineOptions: { strokeColor: '#1B4F8A', strokeWeight: 4 },
    });

    // Cerrar infoWindow al clickar en el mapa
    map.addListener('click', () => infoWindowRef.current.close());
  }, [gmLoaded]);

  // ── 3. Registrar callbacks globales para el HTML de InfoWindow ──────────
  useEffect(() => {
    window.__mapaNav = (id) => navigate(`/clientes/${id}`);
    window.__mapaToggleRoute = (id) => {
      const next = new Set(routeIdsRef.current);
      next.has(id) ? next.delete(id) : next.add(id);
      routeIdsRef.current = next;
      setRouteIds(new Set(next));
      setDirections(null);
      directionsRendererRef.current?.setDirections(null);
      // Refrescar contenido del InfoWindow si sigue abierto
      if (activeClienteRef.current?.id === id || true) {
        const ac = activeClienteRef.current;
        if (ac) infoWindowRef.current?.setContent(buildInfoContent(ac, next));
      }
    };
    return () => { delete window.__mapaNav; delete window.__mapaToggleRoute; };
  }, [navigate]);

  // ── 4. Añadir/actualizar marcadores cuando cambian los clientes con coords
  useEffect(() => {
    if (!gmLoaded || !mapRef.current) return;

    const allWithCoords = baseClientes.filter(c => c.lat && c.lng);
    const filteredIds = new Set(filtered.map(c => c.id));

    allWithCoords.forEach(c => {
      if (markersRef.current.has(c.id)) {
        // Actualizar visibilidad
        markersRef.current.get(c.id).setVisible(filteredIds.has(c.id));
        return;
      }
      const color = MARKER_COLOR[c.estado] || '#6B7280';
      const marker = new window.google.maps.Marker({
        position: { lat: c.lat, lng: c.lng },
        map: mapRef.current,
        title: c.nombre,
        visible: filteredIds.has(c.id),
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
      marker.addListener('click', () => {
        activeClienteRef.current = c;
        infoWindowRef.current.setContent(buildInfoContent(c, routeIdsRef.current));
        infoWindowRef.current.open(mapRef.current, marker);
      });
      markersRef.current.set(c.id, marker);
    });
  }, [gmLoaded, baseClientes, filtered]);

  // ── 5. Actualizar visibilidad de marcadores al cambiar filtros ──────────
  useEffect(() => {
    if (!gmLoaded) return;
    const filteredIds = new Set(filtered.map(c => c.id));
    markersRef.current.forEach((marker, id) => marker.setVisible(filteredIds.has(id)));
  }, [filtered, gmLoaded]);

  // ── 6. Geocodificar clientes sin coords al montar ───────────────────────
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
        await new Promise(r => setTimeout(r, 250));
      }
      if (!cancelled) setGeocoding(false);
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 7. Calcular ruta óptima ─────────────────────────────────────────────
  const calcularRuta = useCallback(() => {
    if (routeIds.size < 2 || !window.google?.maps) return;
    const pts = [...routeIds]
      .map(id => baseClientes.find(c => c.id === id))
      .filter(c => c?.lat && c?.lng);
    if (pts.length < 2) return;

    const origin      = { lat: pts[0].lat, lng: pts[0].lng };
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
      if (status === 'OK') {
        setDirections(result);
        directionsRendererRef.current?.setDirections(result);
      } else {
        console.error('[Directions]', status);
      }
    });
  }, [routeIds, baseClientes]);

  const clearRuta = () => {
    routeIdsRef.current = new Set();
    setRouteIds(new Set());
    setDirections(null);
    directionsRendererRef.current?.setDirections(null);
  };

  const sel = 'px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none';

  return (
    <div className="space-y-4">
      {/* Toolbar – filtros */}
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
          <span>{withCoords.length} visibles · {totalWithCoords} con ubicación · {filtered.length} total filtrado</span>
          {geocoding && (
            <span className="flex items-center gap-1 text-blue-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              Geocodificando… (+{geocodedCount})
            </span>
          )}
        </div>
      </div>

      {/* Leyenda + botón de ruta */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4">
          {Object.entries(ESTADO_LABEL).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5 text-xs text-gray-600">
              <div className="w-3 h-3 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: MARKER_COLOR[k] }} />
              {v}
            </div>
          ))}
        </div>
        {routeIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{routeIds.size} paradas</span>
            <button onClick={clearRuta} className="text-gray-400 hover:text-red-500 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={calcularRuta}
              disabled={routeIds.size < 2 || routeLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B4F8A] text-white text-xs font-medium
                rounded-lg hover:bg-[#163d6b] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors">
              {routeLoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Navigation className="w-3.5 h-3.5" />}
              Calcular ruta óptima
            </button>
          </div>
        )}
      </div>

      {/* Contenedor del mapa */}
      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 600 }}>
        {!gmLoaded && (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <Loader2 className="w-8 h-8 animate-spin text-[#1B4F8A]" />
          </div>
        )}
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', display: gmLoaded ? 'block' : 'none' }} />
      </div>

      {/* Resumen de ruta calculada */}
      {directions && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">🗺️ Ruta óptima — {routeIds.size} paradas</p>
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
