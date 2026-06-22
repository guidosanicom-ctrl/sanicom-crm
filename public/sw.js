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

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una ventana del CRM abierta, navegar ahí
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Si no, abrir nueva ventana
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});
