import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_EMAIL   = Deno.env.get('VAPID_EMAIL') ?? 'mailto:admin@sanicom.com';

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { targetUserId, title, body, url } = await req.json();
    if (!targetUserId) return new Response('targetUserId requerido', { status: 400 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', targetUserId);

    if (error) throw error;
    if (!subs?.length) {
      // Sin fila en push_subscriptions: el usuario nunca completó el registro
      // (permiso nunca concedido, o se guardó y luego se borró/expiró sin re-registrar).
      console.warn(`[send-push] userId=${targetUserId} no tiene ninguna suscripción registrada — no se puede enviar push`);
      return new Response(JSON.stringify({ sent: 0, reason: 'no_subscriptions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.stringify({ title, body, url, icon: '/minilogo.png' });

    const results = await Promise.allSettled(
      subs.map(({ subscription }) => {
        const endpointTail = subscription?.endpoint?.slice(-24) ?? '?';
        return webpush.sendNotification(subscription, payload)
          .then(() => {
            console.log(`[send-push] OK userId=${targetUserId} endpoint=...${endpointTail}`);
          })
          .catch(async (err) => {
            console.error(
              `[send-push] FALLO userId=${targetUserId} endpoint=...${endpointTail} ` +
              `statusCode=${err.statusCode} body=${err.body ?? err.message ?? err}`
            );
            // 404/410: suscripción ya no existe en el servicio push (dispositivo
            // desinstaló la app, token expirado). 403: VAPID/clave rechazada —
            // también indica una suscripción muerta que conviene limpiar.
            if ([404, 410, 403].includes(err.statusCode)) {
              const { error: delErr } = await supabase
                .from('push_subscriptions')
                .delete()
                .eq('subscription->>endpoint', subscription.endpoint);
              if (delErr) {
                console.error(`[send-push] error eliminando suscripción muerta de userId=${targetUserId}:`, delErr);
              } else {
                console.log(`[send-push] suscripción muerta eliminada (userId=${targetUserId}, statusCode=${err.statusCode})`);
              }
            }
            throw err;
          });
      })
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - sent;
    console.log(`[send-push] userId=${targetUserId} resultado: ${sent}/${subs.length} enviados, ${failed} fallidos`);

    return new Response(JSON.stringify({ sent, total: subs.length, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-push]', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
