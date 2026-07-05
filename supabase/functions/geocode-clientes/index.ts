import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')!;
const DELAY_MS = 25; // 40 req/s — bien por debajo del límite de 50/s de Google

async function geocodeAddress(parts: (string | undefined)[]): Promise<{ lat: number; lng: number } | null> {
  const address = parts.filter(Boolean).join(', ');
  if (!address.trim()) return null;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  if (data.status !== 'OK' || !data.results?.length) return null;

  const loc = data.results[0].geometry.location;
  return { lat: loc.lat, lng: loc.lng };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit) || 200, 500);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Clientes sin coordenadas que tienen al menos ciudad o dirección
    const { data: rows, error } = await supabase
      .from('clientes')
      .select('id, data')
      .is('data->>lat', null)
      .limit(limit);

    if (error) throw error;

    // Filtrar los que tienen al menos un campo de dirección útil
    const pendientes = (rows ?? []).filter(r =>
      r.data?.ciudad || r.data?.direccion
    );

    const total_pending_approx = pendientes.length;
    console.log(`[geocode-clientes] ${total_pending_approx} clientes para geocodificar (lote de ${limit})`);

    let processed = 0;
    let errors    = 0;
    let skipped   = 0;

    for (const row of pendientes) {
      const d = row.data ?? {};

      // Intento 1: dirección completa
      let coords = await geocodeAddress([d.direccion, d.cp, d.ciudad, d.provincia, d.pais || 'España']);

      // Intento 2: solo ciudad + provincia si el primero falló
      if (!coords && (d.ciudad || d.provincia)) {
        coords = await geocodeAddress([d.ciudad, d.provincia, d.pais || 'España']);
      }

      if (coords) {
        const { error: updateErr } = await supabase
          .from('clientes')
          .update({ data: { ...d, lat: coords.lat, lng: coords.lng } })
          .eq('id', row.id);

        if (updateErr) {
          console.error(`[geocode-clientes] Error actualizando ${row.id}:`, updateErr.message);
          errors++;
        } else {
          processed++;
        }
      } else {
        skipped++;
      }

      await new Promise(r => setTimeout(r, DELAY_MS));
    }

    console.log(`[geocode-clientes] processed=${processed} skipped=${skipped} errors=${errors}`);
    return new Response(
      JSON.stringify({ processed, skipped, errors, total_in_batch: pendientes.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[geocode-clientes]', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
