import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fecha de hoy en hora española (UTC+2)
    const nowEs = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const todayEs = nowEs.toISOString().slice(0, 10);

    // Buscar oportunidades en pausa cuyo recordatorio es hoy o pasado y aún no notificadas hoy
    const { data: rows, error } = await supabase
      .from('oportunidades')
      .select('data')
      .eq('data->>enPausa', 'true')
      .lte('data->>pausaRecordatorio', todayEs)
      .neq('data->>pausaUltimoRecordatorio', todayEs); // evitar doble envío

    if (error) throw error;
    if (!rows?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sendPushUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    let sent = 0;

    for (const row of rows) {
      const opp = row.data as {
        id: string;
        nombre?: string;
        responsable?: string;
        pausaMotivo?: string;
        pausaRecordatorio?: string;
      };
      if (!opp.responsable) continue;

      const body = `⏸️ La oportunidad "${opp.nombre || 'Sin nombre'}" en pausa debe revisarse hoy.${opp.pausaMotivo ? ` Motivo: ${opp.pausaMotivo}` : ''}`;

      const res = await fetch(sendPushUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify({
          targetUserId: opp.responsable,
          title: '⏸️ Recordatorio de pausa',
          body,
          url: `/pipeline?open=${opp.id}`,
        }),
      });
      const result = await res.json();
      console.log(`[pausa-reminders] opp=${opp.id} sent=${result.sent}`);
      sent += result.sent ?? 0;

      // Marcar como notificada hoy para no reenviar
      await supabase
        .from('oportunidades')
        .update({ data: { ...opp, pausaUltimoRecordatorio: todayEs } })
        .eq('id', opp.id);
    }

    return new Response(JSON.stringify({ sent, total: rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[daily-pausa-reminders]', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
