import { useEffect, useRef } from 'react';

/**
 * Refresco global: cuando la app vuelve a primer plano (visibilitychange),
 * refetchea TODOS los stores de la aplicación, sin importar qué página esté
 * abierta en ese momento.
 *
 * A diferencia de useAutoRefresh (que solo refresca el store de la página
 * activa, vía polling de 30s + visibilitychange), este hook cubre el caso
 * real reportado en iOS: la app vuelve de background con datos obsoletos
 * en TODO el árbol de stores, no solo en el de la pantalla visible — por
 * ejemplo el Dashboard usa datos de clientes/oportunidades/servicios/demos
 * a la vez, y cualquier pantalla puede navegar a otra sin recargar.
 *
 * Solo dispara en la transición oculto→visible (sin polling adicional) para
 * no multiplicar las llamadas a Supabase: el polling de 30s específico de
 * cada página sigue cubriendo el refresco mientras la app permanece abierta.
 */
export function useGlobalRefresh(refreshFns) {
  const fnsRef = useRef(refreshFns);
  fnsRef.current = refreshFns;
  const lastRunRef = useRef(0);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      // Evita refrescos duplicados si visibilitychange dispara varias veces seguidas
      const now = Date.now();
      if (now - lastRunRef.current < 2000) return;
      lastRunRef.current = now;
      Promise.all(fnsRef.current.map((fn) => fn())).catch((e) =>
        console.error('[useGlobalRefresh]', e)
      );
    };
    document.addEventListener('visibilitychange', onVisibility);
    // iOS Safari a veces no dispara visibilitychange de forma fiable al volver
    // de background; pageshow con persisted=true cubre el caso de bfcache.
    const onPageShow = (e) => { if (e.persisted) onVisibility(); };
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);
}
