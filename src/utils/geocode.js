/**
 * Geocodifica una dirección usando Nominatim (OpenStreetMap) — API gratuita, sin clave.
 * Estrategia de dos intentos:
 *   1. Dirección completa: calle + ciudad + provincia + CP + España
 *   2. Fallback: solo ciudad + provincia + España
 * Devuelve { lat, lng, fallback: bool } o null si ambos intentos fallan.
 */

async function nominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=es`;
  try {
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'es', 'User-Agent': 'SanicomCRM/1.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

export async function geocodificar(direccion, ciudad, provincia = '', cp = '') {
  // Intento 1: dirección completa
  const completa = [direccion, ciudad, provincia, cp, 'España'].filter(Boolean).join(', ');
  const resultado = await nominatim(completa);
  if (resultado) return { ...resultado, fallback: false };

  // Intento 2: solo ciudad + provincia
  if (ciudad || provincia) {
    const basica = [ciudad, provincia, 'España'].filter(Boolean).join(', ');
    const fallback = await nominatim(basica);
    if (fallback) return { ...fallback, fallback: true };
  }

  return null;
}
