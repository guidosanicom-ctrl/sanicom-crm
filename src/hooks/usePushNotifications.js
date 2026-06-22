import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { registerPushSubscription } from '../lib/pushSubscription';

export function usePushNotifications() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user?.id || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(() => registerPushSubscription(user.id))
      .catch((e) => console.warn('[push]', e));
  }, [user?.id]);
}
