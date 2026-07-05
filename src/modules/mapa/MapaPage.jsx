import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientesStore } from '../../store/clientesStore';
import { useAuthStore } from '../../store/authStore';
import { MapPin, X, Loader2, Navigation, AlertTriangle } from 'lucide-react';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const CENTER_ES = { lat: 40.4168, lng: -3.7038 };

async function geocodeGoogle(direccion, ciudad, provincia) {
  const parts = [direccion, ciudad, provincia, 'España'].filter(Boolean);
  const address = parts.join(', ');
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`
  );
  const data = await res.json();
  const loc = data.results[0]?.geometry?.location;
  return loc ? { lat: loc.lat, lng: loc.lng } : null;
}

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
  const color   = MARKER_COLOR[c.estado] || '#6B7280';
  const label   = ESTADO_LABEL[c.estado] || c.estado || '';
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
        <button onclick="window.__mapaNav('${c.id}')"
          style="flex:1;background:#1B4F8A;color:#fff;border:none;border-radius:4px;padding:5px 8px;font-size:11px;cursor:pointer;font-weight:600">
          Ver ficha
        </button>
        <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:#374151;cursor:pointer;user-select:none">
          <input type="checkbox" ${checked} onchange="window.__mapaToggleRoute('${c.id}')"
            style="accent-color:#1B4F8A;cursor:pointer" />
          Ruta
        </label>
      </div>
    </div>`;
}

// ── Carga del script de Google Maps (singleton a nivel de módulo) ────────────
const GM_CALLBACKS = new Set();
const GM_ERROR_CALLBACKS = new Set();
let gmReady = false;
let gmError = null;

function ensureGoogleMapsScript() {
  if (gmReady || gmError) return;
  if (window.google?.maps) {
    gmReady = true;
    GM_CALLBACKS.forEach(fn => fn());
    GM_CALLBACKS.clear();
    return;
  }
  if (document.getElementById('gm-script')) return;

  // Google Maps llama a este callback cuando la API key es inválida o el
  // dominio no está autorizado — es la única forma de capturar ese error.
  window.gm_authFailure = () => {
    gmError = 'API key inválida o dominio no autorizado en Google Cloud Console. ' +
              'Ve a console.cloud.google.com → APIs → Maps JavaScript API → Credenciales ' +
              'y añade este dominio a las restricciones HTTP, o elimina las restricciones temporalmente.';
    console.error('[MapaPage] gm_authFailure:', gmError);
    GM_ERROR_CALLBACKS.forEach(fn => fn(gmError));
    GM_ERROR_CALLBACKS.clear();
  };

  window.__gmInit = () => {
    gmReady = true;
    GM_CALLBACKS.forEach(fn => fn());
    GM_CALLBACKS.clear();
    delete window.__gmInit;
  };

  const script = document.createElement('script');
  script.id    = 'gm-script';
  script.async = true;
  script.src   = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&callback=__gmInit`;
  script.onerror = () => {
    const msg = 'No se pudo cargar el script de Google Maps (error de red o URL inválida).';
    gmError = msg;
    console.error('[MapaPage]', msg);
    GM_ERROR_CALLBACKS.forEach(fn => fn(msg));
    GM_ERROR_CALLBACKS.clear();
  };
  document.head.appendChild(script);
}

function onGoogleMapsReady(onLoad, onErr) {
  if (gmReady)  { onLoad(); return () => {}; }
  if (gmError)  { onErr(gmError); return () => {}; }
  GM_CALLBACKS.add(onLoad);
  GM_ERROR_CALLBACKS.add(onErr);
  ensureGoogleMapsScript();
  return () => { GM_CALLBACKS.delete(onLoad); GM_ERROR_CALLBACKS.delete(onErr); };
}
// ────────────────────────────────────────────────────────────────────────────

export default function MapaPage() {
  const { clientes, updateCliente } = useClientesStore();
  const { user, CARLOS_ESPECIALIDADES } = useAuthStore();
  const navigate = useNavigate();

  const isCarlos = user?.email === 'carlosleal@sanicom.es';

  const [gmLoaded, setGmLoaded]     = useState(gmReady);
  const [gmErr, setGmErr]           = useState(gmError);
  // Carlos arranca con 'mis-especialidades' preseleccionado
  const [filterEsp, setFilterEsp]   = useState(isCarlos ? 'mis-especialidades' : '');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterEquipo, setFilterEquipo] = useState('');
  const [routeIds, setRouteIds]     = useState(() => new Set());
  const [directions, setDirections] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [geocoding, setGeocoding]   = useState(false);
  const [geocodedCount, setGeocodedCount] = useState(0);

  const mapContainerRef = useRef(null);
  const mapRef          = useRef(null);
  const markersRef      = useRef(new Map());
  const infoWindowRef   = useRef(null);
  const directionsRendererRef = useRef(null);
  const activeClienteRef = useRef(null);
  const routeIdsRef     = useRef(new Set());

  // En el Mapa, todos los usuarios ven todos los clientes.
  // Carlos tiene su vista restringida en el resto del CRM, pero aquí el mapa
  // sirve también para exploración de territorio — el filtro hace el control.
  const baseClientes = clientes;

  const especialidades = useMemo(() =>
    [...new Set(baseClientes.map(c => c.especialidad).filter(Boolean))].sort(),
  [baseClientes]);

  const filtered = useMemo(() => baseClientes.filter(c => {
    if (filterEsp === 'mis-especialidades') {
      if (!CARLOS_ESPECIALIDADES.includes(c.especialidad)) return false;
    } else if (filterEsp) {
      if (c.especialidad !== filterEsp) return false;
    }
    if (filterEstado && c.estado !== filterEstado) return false;
    if (!matchEquipo(c, filterEquipo))             return false;
    return true;
  }), [baseClientes, filterEsp, filterEstado, filterEquipo, CARLOS_ESPECIALIDADES]);

  const withCoords      = useMemo(() => filtered.filter(c => c.lat && c.lng), [filtered]);
  const totalWithCoords = useMemo(() => baseClientes.filter(c => c.lat && c.lng).length, [baseClientes]);
  const sinCoordsTotales = useMemo(() => baseClientes.filter(c => !c.lat && !c.lng).length, [baseClientes]);

  // ── 1. Suscribirse a la carga del script ────────────────────────────────
  useEffect(() => {
    return onGoogleMapsReady(
      () => setGmLoaded(true),
      (msg) => setGmErr(msg),
    );
  }, []);

  // ── 2. Inicializar el mapa (el div siempre está en el DOM con altura real) ─
  useEffect(() => {
    if (!gmLoaded || !mapContainerRef.current || mapRef.current) return;

    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: CENTER_ES,
      zoom:   6,
      streetViewControl: false,
      mapTypeControl:    false,
      fullscreenControl: true,
    });
    mapRef.current = map;

    // Forzar refresco de tiles por si el contenedor tenía dimensiones 0 antes
    window.google.maps.event.trigger(map, 'resize');
    map.setCenter(CENTER_ES);

    infoWindowRef.current = new window.google.maps.InfoWindow();
    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      map,
      suppressMarkers: false,
      polylineOptions: { strokeColor: '#1B4F8A', strokeWeight: 4 },
    });

    map.addListener('click', () => infoWindowRef.current.close());
  }, [gmLoaded]);

  // ── 3. Callbacks globales para el HTML del InfoWindow ───────────────────
  useEffect(() => {
    window.__mapaNav = (id) => navigate(`/clientes/${id}`);
    window.__mapaToggleRoute = (id) => {
      const next = new Set(routeIdsRef.current);
      next.has(id) ? next.delete(id) : next.add(id);
      routeIdsRef.current = next;
      setRouteIds(new Set(next));
      setDirections(null);
      directionsRendererRef.current?.setDirections(null);
      const ac = activeClienteRef.current;
      if (ac) infoWindowRef.current?.setContent(buildInfoContent(ac, next));
    };
    return () => { delete window.__mapaNav; delete window.__mapaToggleRoute; };
  }, [navigate]);

  // ── 4. Añadir/actualizar marcadores cuando cambian clientes con coords ──
  useEffect(() => {
    if (!gmLoaded || !mapRef.current) return;
    const filteredIds = new Set(filtered.map(c => c.id));
    const allWithCoords = baseClientes.filter(c => c.lat && c.lng);

    allWithCoords.forEach(c => {
      if (markersRef.current.has(c.id)) {
        markersRef.current.get(c.id).setVisible(filteredIds.has(c.id));
        return;
      }
      const color  = MARKER_COLOR[c.estado] || '#6B7280';
      const marker = new window.google.maps.Marker({
        position: { lat: c.lat, lng: c.lng },
        map:      mapRef.current,
        title:    c.nombre,
        visible:  filteredIds.has(c.id),
        icon: {
          path:          window.google.maps.SymbolPath.CIRCLE,
          scale:         10,
          fillColor:     color,
          fillOpacity:   1,
          strokeColor:   '#ffffff',
          strokeWeight:  2,
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

  // ── 5. Visibilidad de marcadores al cambiar filtros ─────────────────────
  useEffect(() => {
    if (!gmLoaded) return;
    const filteredIds = new Set(filtered.map(c => c.id));
    markersRef.current.forEach((marker, id) => marker.setVisible(filteredIds.has(id)));
  }, [filtered, gmLoaded]);


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
    new window.google.maps.DirectionsService().route({
      origin, destination, waypoints,
      optimizeWaypoints: true,
      travelMode: window.google.maps.TravelMode.DRIVING,
    }, (result, status) => {
      setRouteLoading(false);
      if (status === 'OK') {
        setDirections(result);
        directionsRendererRef.current?.setDirections(result);
      } else {
        console.error('[MapaPage] Directions error:', status);
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

  // Aviso si falta la API key (ayuda a depurar en Vercel)
  if (!API_KEY) {
    return (
      <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <span>Falta la variable de entorno <code className="font-mono bg-yellow-100 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code>. Añádela en Vercel → Settings → Environment Variables.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <select className={sel} value={filterEsp} onChange={e => setFilterEsp(e.target.value)}>
            <option value="">Todas las especialidades</option>
            {isCarlos && <option value="mis-especialidades">⭐ Mis especialidades</option>}
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
          <span>{withCoords.length} visibles · {totalWithCoords}/{baseClientes.length} geocodificados</span>
          {sinCoordsTotales > 0 && (
            <span className="text-amber-600">· {sinCoordsTotales} pendientes (geocodificación en background)</span>
          )}
          {geocoding && (
            <span className="flex items-center gap-1 text-blue-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              Actualizando…
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

      {/* Contenedor del mapa — SIEMPRE en el DOM con altura real.
          El loader es un overlay posicionado encima, no oculta el div del mapa. */}
      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm"
        style={{ height: 600, position: 'relative' }}>

        {/* Div del mapa: siempre renderizado, siempre con dimensiones */}
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* Overlay: error de API key / dominio */}
        {gmErr && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#fef2f2', padding: '24px',
          }}>
            <div className="flex flex-col items-center gap-3 text-center max-w-md">
              <AlertTriangle className="w-10 h-10 text-red-500" />
              <p className="text-sm font-semibold text-red-700">Error al cargar Google Maps</p>
              <p className="text-xs text-red-600">{gmErr}</p>
              <p className="text-xs text-gray-500 mt-1">
                API key usada: <code className="bg-gray-100 px-1 rounded font-mono">{API_KEY ? `${API_KEY.slice(0,8)}…` : '(no definida)'}</code>
              </p>
            </div>
          </div>
        )}

        {/* Overlay de carga encima del mapa */}
        {!gmLoaded && !gmErr && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#f9fafb', zIndex: 10,
          }}>
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#1B4F8A]" />
              <span className="text-sm">Cargando Google Maps…</span>
            </div>
          </div>
        )}
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
