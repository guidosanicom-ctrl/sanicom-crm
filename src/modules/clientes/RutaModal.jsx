import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { MapPin, AlertTriangle, ExternalLink, Navigation } from 'lucide-react';

function tieneUbicacion(c) {
  return !!(c.ciudad || c.direccion);
}

function buildAddress(c) {
  return [c.direccion, c.ciudad, c.provincia].filter(Boolean).join(', ');
}

export default function RutaModal({ open, onClose, clientes }) {
  if (!open) return null;

  const stops = clientes.map((c, i) => ({
    ...c,
    num: i + 1,
    address: buildAddress(c),
    valid: tieneUbicacion(c),
  }));

  const validStops = stops.filter(s => s.valid);
  const missingCount = stops.length - validStops.length;

  const openMaps = () => {
    if (validStops.length === 0) return;

    const segments = validStops.map(s => encodeURIComponent(s.address));

    // En iOS/Android, comgooglemaps:// abre Google Maps directamente.
    // Si no está instalada, el fallback https:// la abre en el navegador.
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    if (isIOS) {
      // Intentar abrir app nativa; si falla, redirige a web
      const appUrl = `comgooglemaps://?waypoints=${segments.join('|')}&directionsmode=driving`;
      const webUrl = `https://www.google.com/maps/dir//${segments.join('/')}`;
      const start = Date.now();
      window.location.href = appUrl;
      // Si la app no está, el location.href no funciona y el timeout redirige a web
      setTimeout(() => { if (Date.now() - start < 1500) window.open(webUrl, '_blank'); }, 1000);
    } else if (isAndroid) {
      const url = `google.navigation:q=${encodeURIComponent(validStops[validStops.length - 1].address)}&waypoints=${segments.slice(0, -1).join('|')}`;
      const webUrl = `https://www.google.com/maps/dir//${segments.join('/')}`;
      window.location.href = `intent://maps/dir//${segments.join('/')}#Intent;scheme=https;package=com.google.android.apps.maps;end`;
      setTimeout(() => window.open(webUrl, '_blank'), 1200);
    } else {
      window.open(`https://www.google.com/maps/dir//${segments.join('/')}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Resumen de ruta"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full gap-3">
          <span className="text-xs text-gray-400">
            {validStops.length} parada{validStops.length !== 1 ? 's' : ''} con ubicación
            {missingCount > 0 && ` · ${missingCount} sin dirección`}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
            <Button
              onClick={openMaps}
              disabled={validStops.length === 0}
              className="flex items-center gap-2"
            >
              <Navigation className="w-4 h-4" />
              Abrir en Google Maps
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Aviso si hay paradas sin dirección */}
        {missingCount > 0 && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              {missingCount} cliente{missingCount > 1 ? 's' : ''} sin dirección completa no
              {missingCount > 1 ? ' se incluirán' : ' se incluirá'} en la ruta de Google Maps.
            </p>
          </div>
        )}

        {/* Lista de paradas */}
        <div className="space-y-2">
          {stops.map(stop => (
            <div
              key={stop.id}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                stop.valid
                  ? 'border-gray-100 bg-white hover:bg-gray-50'
                  : 'border-amber-100 bg-amber-50/60'
              }`}
            >
              {/* Número de parada */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                stop.valid ? 'bg-[#1B4F8A] text-white' : 'bg-amber-200 text-amber-700'
              }`}>
                {stop.valid ? stop.num : '!'}
              </div>

              {/* Info del cliente */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{stop.nombre}</p>
                {stop.valid ? (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {stop.address}
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5 font-medium">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    Sin dirección — no se incluirá en la ruta
                  </p>
                )}
                {stop.tipo && (
                  <p className="text-xs text-gray-400 mt-0.5">{stop.tipo}{stop.especialidad ? ` · ${stop.especialidad}` : ''}</p>
                )}
              </div>

              {/* Indicador de orden (solo válidos) */}
              {stop.valid && (
                <span className="text-[10px] text-gray-300 font-medium flex-shrink-0 self-center">
                  Parada {stop.num}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Info sobre Google Maps */}
        <p className="text-[11px] text-gray-400 text-center pt-1">
          La ruta parte desde tu ubicación actual · En móvil abre directamente la app de Google Maps
        </p>
      </div>
    </Modal>
  );
}
