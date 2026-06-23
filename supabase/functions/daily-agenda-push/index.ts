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

    // Hora española: UTC+2 (verano) / UTC+1 (invierno)
    // pg_cron dispara a las 5:30 UTC (= 7:30 UTC+2)
    // Calculamos "hoy" en hora española
    const nowUtc = new Date();
    const offsetMs = 2 * 60 * 60 * 1000; // UTC+2 (ajustar a +1 en invierno si es necesario)
    const nowEs = new Date(nowUtc.getTime() + offsetMs);
    const todayEs = nowEs.toISOString().slice(0, 10); // "YYYY-MM-DD"

    // Buscar todos los eventos cuyo campo data->>'inicio' empieza por la fecha de hoy (hora española)
    const { data: rows, error } = await supabase
      .from('eventos_agenda')
      .select('data')
      .gte('data->>inicio', `${todayEs}T00:00:00`)
      .lt('data->>inicio', `${todayEs}T23:59:59`);

    if (error) throw error;
    if (!rows?.length) {
      console.log('[daily-agenda-push] No hay eventos hoy:', todayEs);
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Agrupar eventos por responsable
    const byUser: Record<string, { titulo: string; inicio: string; clienteNombre?: string }[]> = {};
    for (const row of rows) {
      const ev = row.data as {
        titulo?: string;
        inicio?: string;
        responsable?: string;
        clienteNombre?: string;
        clienteId?: string;
      };
      if (!ev.responsable) continue;
      if (!byUser[ev.responsable]) byUser[ev.responsable] = [];
      byUser[ev.responsable].push({
        titulo: ev.titulo || 'Sin título',
        inicio: ev.inicio || '',
        clienteNombre: ev.clienteNombre,
      });
    }

    // Enviar push a cada usuario
    const userIds = Object.keys(byUser);
    const sendPushUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    let totalSent = 0;
    for (const userId of userIds) {
      const eventos = byUser[userId].sort((a, b) => a.inicio.localeCompare(b.inicio));
      const count = eventos.length;

      const lista = eventos
        .map((e) => {
          const hora = e.inicio ? e.inicio.slice(11, 16) : '';
          const cliente = e.clienteNombre ? ` · ${e.clienteNombre}` : '';
          return `${hora} ${e.titulo}${cliente}`;
        })
        .join(', ');

      const body = `Hoy tienes ${count} evento${count !== 1 ? 's' : ''}: ${lista}`;

      const res = await fetch(sendPushUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify({
          targetUserId: userId,
          title: '¡Buenos días! ☀️',
          body,
          url: '/agenda',
        }),
      });

      const result = await res.json();
      console.log(`[daily-agenda-push] userId=${userId} eventos=${count} sent=${result.sent}`);
      totalSent += result.sent ?? 0;
    }

    return new Response(JSON.stringify({ sent: totalSent, users: userIds.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[daily-agenda-push]', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
