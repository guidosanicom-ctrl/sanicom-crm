import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')!;
const BATCH_SIZE     = 50;   // peticiones en paralelo por lote
const BATCH_DELAY_MS = 1000; // 1 segundo entre lotes

async function geocodeOne(parts: (string | undefined)[]): Promise<{ lat: number; lng: number } | null> {
  const address = parts.filter(Boolean).join(', ');
  if (!address.trim()) return null;
  try {
    const res  = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`
    );
    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.length) return null;
    const loc  = data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng };
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Obtener clientes sin coordenadas (ordenados por id para reproducibilidad)
    const { data: rows, error } = await supabase
      .from('clientes')
      .select('id, data')
      .is('data->>lat', null)
      .order('id')
      .limit(2000); // máximo por llamada

    if (error) throw error;

    const pendientes = (rows ?? []).filter(r => r.data?.ciudad || r.data?.direccion);

    if (!pendientes.length) {
      console.log('[geocode-clientes] Todos los clientes están geocodificados ✓');
      return new Response(
        JSON.stringify({ processed: 0, skipped: 0, errors: 0, total_pending: 0, done: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[geocode-clientes] ${pendientes.length} pendientes — procesando en lotes de ${BATCH_SIZE}`);

    let processed = 0;
    let skipped   = 0;
    let errors    = 0;

    // Procesar en lotes paralelos con 1 segundo entre lotes
    for (let i = 0; i < pendientes.length; i += BATCH_SIZE) {
      const lote = pendientes.slice(i, i + BATCH_SIZE);

      await Promise.all(lote.map(async (row) => {
        const d = row.data ?? {};

        // Intento 1: dirección completa
        let coords = await geocodeOne([d.direccion, d.cp, d.ciudad, d.provincia, d.pais || 'España']);

        // Intento 2: solo ciudad + provincia
        if (!coords && (d.ciudad || d.provincia)) {
          coords = await geocodeOne([d.ciudad, d.provincia, d.pais || 'España']);
        }

        if (coords) {
          const { error: upErr } = await supabase
            .from('clientes')
            .update({ data: { ...d, lat: coords.lat, lng: coords.lng } })
            .eq('id', row.id);

          upErr ? errors++ : processed++;
        } else {
          skipped++;
        }
      }));

      const done  = Math.min(i + BATCH_SIZE, pendientes.length);
      console.log(`[geocode-clientes] Lote ${Math.ceil(done / BATCH_SIZE)}/${Math.ceil(pendientes.length / BATCH_SIZE)} — ${done}/${pendientes.length}`);

      // Pausa entre lotes (excepto el último)
      if (i + BATCH_SIZE < pendientes.length) {
        await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    const remaining = pendientes.length - processed - skipped - errors;
    console.log(`[geocode-clientes] ✓ processed=${processed} skipped=${skipped} errors=${errors}`);

    return new Response(
      JSON.stringify({ processed, skipped, errors, total_pending: pendientes.length, done: remaining <= 0 }),
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
