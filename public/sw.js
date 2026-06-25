// Service Worker — Sanicom CRM
// Maneja notificaciones push y navegación al tocar la notificación

self.addEventListener('push', (event) => {
  if (!event.data) return;
  const { title, body, url, icon } = event.data.json();
  event.waitUntil(
    self.registration.showNotification(title || 'Sanicom CRM', {
      body: body || '',
      icon: icon || '/minilogo.png',
      badge: '/minilogo.png',
      data: { url: url || '/' },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  // Al hacer clic, limpiar el badge del SW (la app lo recalculará al activarse)
  if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Buscar una ventana del CRM ya abierta (mismo origen)
        const scope = self.registration.scope;
        const existing = clientList.find(
          (c) => c.url.startsWith(scope) && 'navigate' in c
        );
        if (existing) {
          existing.navigate(targetUrl);
          return existing.focus();
        }
        // Si no hay ventana abierta, abrir una nueva
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
