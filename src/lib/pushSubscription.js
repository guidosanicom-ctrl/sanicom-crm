import { supabase } from './supabase';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function registerPushSubscription(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.warn('[push] VITE_VAPID_PUBLIC_KEY no configurada');
    return;
  }

  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const subJson = subscription.toJSON();
  const id = `${userId}_${btoa(subJson.endpoint).slice(-20).replace(/[^a-zA-Z0-9]/g, '')}`;

  const { error: upsertError } = await supabase.from('push_subscriptions').upsert({ id, user_id: userId, subscription: subJson });
  if (upsertError) console.error('[push] error guardando suscripción:', upsertError);
  else console.log('[push] suscripción guardada OK, id:', id, 'userId:', userId);
}

export async function unregisterPushSubscription(userId) {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration('/');
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await sub.unsubscribe();
  const endpoint = sub.endpoint;
  await supabase.from('push_subscriptions').delete().eq('user_id', userId).like('subscription->>endpoint', endpoint);
}
