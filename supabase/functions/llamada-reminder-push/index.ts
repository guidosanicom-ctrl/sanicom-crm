import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RECORDATORIOS = 5;
const MIN_INTERVALO_HORAS = 1;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const now = new Date();

    // Llamadas sin confirmar cuya fecha_hora ya pasó
    const { data: llamadas, error } = await supabase
      .from('llamadas_pendientes')
      .select('*')
      .eq('confirmada', false)
      .lte('fecha_hora', now.toISOString());

    if (error) throw error;
    if (!llamadas?.length) {
      console.log('[llamada-reminder-push] Sin llamadas pendientes');
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let enviados = 0;

    for (const llamada of llamadas) {
      // Máximo 5 recordatorios
      if (llamada.recordatorios_enviados >= MAX_RECORDATORIOS) continue;

      // Respetar intervalo mínimo de 1 hora entre recordatorios
      if (llamada.ultimo_recordatorio_at) {
        const ultimo = new Date(llamada.ultimo_recordatorio_at);
        const diffHoras = (now.getTime() - ultimo.getTime()) / 3_600_000;
        if (diffHoras < MIN_INTERVALO_HORAS) continue;
      }

      // Enviar push via send-push
      const esSegundo = llamada.recordatorios_enviados > 0;
      const title = esSegundo ? '📞 Recordatorio: llamada pendiente' : '📞 Hora de llamar';
      const body = llamada.nota
        ? `${llamada.oportunidad_nombre} — ${llamada.nota}`
        : llamada.oportunidad_nombre;

      const pushRes = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          targetUserId: llamada.usuario_id,
          title,
          body,
          url: '/pipeline',
        }),
      });

      if (!pushRes.ok) {
        console.error('[llamada-reminder-push] send-push falló:', await pushRes.text());
        continue;
      }

      // Actualizar contadores
      await supabase
        .from('llamadas_pendientes')
        .update({
          recordatorios_enviados: llamada.recordatorios_enviados + 1,
          ultimo_recordatorio_at: now.toISOString(),
        })
        .eq('id', llamada.id);

      enviados++;
    }

    console.log(`[llamada-reminder-push] Enviados: ${enviados}`);
    return new Response(JSON.stringify({ processed: llamadas.length, enviados }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[llamada-reminder-push]', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
