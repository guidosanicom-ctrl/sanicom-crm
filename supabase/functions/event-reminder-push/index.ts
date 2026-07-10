import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Hora española UTC+2 (verano). Mismo criterio que daily-agenda-push.
    const nowUtc  = new Date();
    const offsetMs = 2 * 60 * 60 * 1000;
    const nowEs   = new Date(nowUtc.getTime() + offsetMs);
    const in10Es  = new Date(nowEs.getTime() + 10 * 60 * 1000);

    // "YYYY-MM-DDTHH:MM" — los eventos guardan inicio sin segundos ni zona
    const nowStr  = nowEs.toISOString().slice(0, 16);
    const in10Str = in10Es.toISOString().slice(0, 16);

    console.log(`[event-reminder-push] Ventana: ${nowStr} → ${in10Str}`);

    // Eventos cuyo inicio cae en la ventana (comparación lexicográfica sobre texto ISO)
    const { data: rows, error } = await supabase
      .from('eventos_agenda')
      .select('id, data')
      .gte('data->>inicio', nowStr)
      .lte('data->>inicio', in10Str);

    if (error) throw error;

    // Filtrar los que ya recibieron la notificación puntual
    const pendientes = (rows ?? []).filter(r => !r.data?.notificacion_enviada);

    if (!pendientes.length) {
      console.log('[event-reminder-push] Sin eventos pendientes de notificar');
      return new Response(JSON.stringify({ enviados: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sendPushUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    let enviados = 0;

    for (const row of pendientes) {
      const ev = row.data as {
        titulo?: string;
        inicio?: string;
        responsable?: string;
        clienteNombre?: string;
        [key: string]: unknown;
      };

      if (!ev.responsable) {
        console.warn(`[event-reminder-push] Evento sin responsable: ${row.id}`);
        continue;
      }

      const hora  = ev.inicio ? ev.inicio.slice(11, 16) : '';
      const title = `📅 En 10 min: ${ev.titulo || 'Evento'}`;
      const body  = [hora, ev.clienteNombre].filter(Boolean).join(' · ') || hora;

      // Notificar al responsable + todos los usuarios con los que está compartido
      const compartidoCon = Array.isArray(ev.compartidoCon) ? ev.compartidoCon : [];
      const destinatarios = [...new Set([ev.responsable, ...compartidoCon].filter(Boolean))];

      for (const userId of destinatarios) {
        const res = await fetch(sendPushUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({ targetUserId: userId, title, body, url: '/agenda' }),
        });
        const result = await res.json().catch(() => ({}));
        console.log(`[event-reminder-push] userId=${userId} titulo="${ev.titulo}" sent=${result.sent ?? '?'}`);
        if (res.ok) enviados++;
      }

      // Marcar como notificado aunque el push falle (evitar spam si el dispositivo está offline)
      await supabase
        .from('eventos_agenda')
        .update({ data: { ...ev, notificacion_enviada: true } })
        .eq('id', row.id);
    }

    return new Response(JSON.stringify({ enviados, total: pendientes.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[event-reminder-push]', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
