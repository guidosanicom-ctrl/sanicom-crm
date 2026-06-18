/**
 * Geocodifica una dirección usando Nominatim (OpenStreetMap) — API gratuita, sin clave.
 * Devuelve { lat, lng } o null si no se encontró resultado.
 * Espera al menos 1 segundo entre llamadas para respetar el rate limit de Nominatim.
 */
export async function geocodificar(direccion, ciudad, provincia = '') {
  const partes = [direccion, ciudad, provincia, 'España'].filter(Boolean).join(', ');
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(partes)}&format=json&limit=1&countrycodes=es`;
  try {
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'es', 'User-Agent': 'SanicomCRM/1.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    // sin conexión o error de red — devolvemos null en silencio
  }
  return null;
}
