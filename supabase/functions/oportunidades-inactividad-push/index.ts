import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INACTIVIDAD_DIAS = 7;
const DEDUP_HORAS = 24;

function generateId(): string {
  return crypto.randomUUID();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const nowUtc = new Date();
    const nowEs = new Date(nowUtc.getTime() + 2 * 60 * 60 * 1000); // UTC+2

    // Umbral: hace 7 días en hora española
    const umbralInactividad = new Date(nowEs.getTime() - INACTIVIDAD_DIAS * 24 * 60 * 60 * 1000);
    const umbralDedup = new Date(nowEs.getTime() - DEDUP_HORAS * 60 * 60 * 1000);

    console.log(`[inactividad-push] umbral inactividad: ${umbralInactividad.toISOString()}`);

    // Oportunidades con fechaUltimaActualizacion <= hace 7 días
    // Excluir Ganado, Perdido y En pausa (enPausa=true)
    const { data: rows, error } = await supabase
      .from('oportunidades')
      .select('id, data')
      .lte('data->>fechaUltimaActualizacion', umbralInactividad.toISOString())
      .neq('data->>etapa', 'Ganado')
      .neq('data->>etapa', 'Perdido')
      .neq('data->>enPausa', 'true');

    if (error) throw error;

    const pendientes = (rows ?? []).filter(r => {
      const opp = r.data as { responsable?: string; ultimoRecordatorioInactividad?: string };
      if (!opp.responsable) return false;
      // Deduplicación: no reenviar si ya se notificó en las últimas 24h
      if (opp.ultimoRecordatorioInactividad) {
        const ultimoEnvio = new Date(opp.ultimoRecordatorioInactividad);
        if (ultimoEnvio >= umbralDedup) return false;
      }
      return true;
    });

    console.log(`[inactividad-push] ${rows?.length ?? 0} sin actividad, ${pendientes.length} a notificar`);

    if (!pendientes.length) {
      return new Response(JSON.stringify({ enviados: 0, total_inactivas: rows?.length ?? 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sendPushUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    let enviados = 0;

    for (const row of pendientes) {
      const opp = row.data as {
        id: string;
        nombre?: string;
        responsable?: string;
        etapa?: string;
        fechaUltimaActualizacion?: string;
        [key: string]: unknown;
      };

      const mensaje = `⚠️ La oportunidad "${opp.nombre || 'Sin nombre'}" lleva ${INACTIVIDAD_DIAS} días sin actividad`;
      const enlace = '/pipeline';
      const ahora = nowEs.toISOString();

      // 1. Notificación interna (campanita)
      const notifId = generateId();
      const notifData = {
        id: notifId,
        fechaHora: ahora,
        leida: false,
        userId: opp.responsable,
        mensaje,
        tipo: 'oportunidad-inactividad',
        modulo: 'pipeline',
        enlace,
        registroId: opp.id,
      };
      const { error: notifErr } = await supabase
        .from('notificaciones')
        .insert({ id: notifId, user_id: opp.responsable, data: notifData });
      if (notifErr) console.error(`[inactividad-push] notif insert error opp=${opp.id}:`, notifErr);

      // 2. Push nativa al dispositivo
      const res = await fetch(sendPushUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify({
          targetUserId: opp.responsable,
          title: '⚠️ Oportunidad sin actividad',
          body: mensaje,
          url: `/pipeline?openId=${opp.id}`,
        }),
      });
      const result = await res.json().catch(() => ({}));
      console.log(`[inactividad-push] opp="${opp.nombre}" responsable=${opp.responsable} sent=${result.sent ?? '?'}`);
      if (res.ok) enviados++;

      // 3. Marcar timestamp de último recordatorio para evitar reenvíos en 24h
      await supabase
        .from('oportunidades')
        .update({ data: { ...opp, ultimoRecordatorioInactividad: ahora } })
        .eq('id', row.id);
    }

    return new Response(JSON.stringify({ enviados, total_inactivas: rows?.length ?? 0, notificadas: pendientes.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[inactividad-push]', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
