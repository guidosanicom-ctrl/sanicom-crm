// Service Worker — Sanicom CRM
// Maneja notificaciones push y navegación al tocar la notificación

self.addEventListener('push', (event) => {
  if (!event.data) return;
  const { title, body, url, icon, badgeCount } = event.data.json();

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title || 'Sanicom CRM', {
        body: body || '',
        icon: icon || '/minilogo.png',
        badge: '/minilogo.png',
        data: { url: url || '/' },
        vibrate: [200, 100, 200],
      });

      // Actualiza el badge del icono de la app directamente desde el SW, incluso
      // con la app cerrada. Soportado en Chrome/Edge/Android; Safari/iOS aún no
      // implementa la Badging API dentro del Service Worker (solo en foreground,
      // cubierto por useAppBadge.js al reabrir la app).
      if (typeof badgeCount === 'number' && self.navigator && 'setAppBadge' in self.navigator) {
        try {
          if (badgeCount > 0) await self.navigator.setAppBadge(badgeCount);
          else await self.navigator.clearAppBadge();
        } catch (_) { /* no soportado en este navegador, ignorar */ }
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  console.log('[SW] notificationclick — targetUrl:', targetUrl);

  // Al hacer clic, limpiar el badge del SW (la app lo recalculará al activarse)
  if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const scope = self.registration.scope;
        console.log('[SW] clientes abiertos:', clientList.map(c => c.url));
        const existing = clientList.find(
          (c) => c.url.startsWith(scope) && 'navigate' in c
        );
        if (existing) {
          console.log('[SW] navegando cliente existente a:', targetUrl);
          existing.navigate(targetUrl);
          return existing.focus();
        }
        console.log('[SW] abriendo nueva ventana:', targetUrl);
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});

// Al activar el nuevo SW, limpiar el badge para evitar estado obsoleto
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      if ('clearAppBadge' in navigator) await navigator.clearAppBadge().catch(() => {});
      // La app recalculará el badge real al cargarse con useAppBadge
    })()
  );
});
