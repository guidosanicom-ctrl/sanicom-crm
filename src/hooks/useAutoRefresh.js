import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Auto-refresh hook: recarga datos al volver a la app (visibilitychange)
 * y cada `intervalMs` milisegundos mientras la app está visible.
 *
 * @param {Array<() => Promise<any>>} refreshFns  Funciones de recarga (estables o no, da igual)
 * @param {number} intervalMs  Intervalo en ms (default 30000)
 * @returns {{ refreshing: boolean }}
 */
export function useAutoRefresh(refreshFns, intervalMs = 30_000) {
  const [refreshing, setRefreshing] = useState(false);
  // Ref para siempre tener las últimas funciones sin re-crear el efecto
  const fnsRef = useRef(refreshFns);
  fnsRef.current = refreshFns;

  const doRefresh = useCallback(async () => {
    if (document.hidden) return;
    setRefreshing(true);
    try {
      await Promise.all(fnsRef.current.map((fn) => fn()));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) doRefresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    const timer = setInterval(doRefresh, intervalMs);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(timer);
    };
  }, [doRefresh, intervalMs]);

  return { refreshing };
}

/**
 * Helper: resetea el flag `initialized` de un store de Zustand y llama a su `initialize()`.
 * Devuelve una función estable (para usar como elemento de refreshFns).
 */
export function makeRefresher(useStore) {
  return () => {
    useStore.setState({ initialized: false });
    return useStore.getState().initialize();
  };
}
