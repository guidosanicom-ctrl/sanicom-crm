import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Lee el parámetro ?open=<id> de la URL, llama a onOpen(id) si existe,
 * y limpia el parámetro de la URL sin añadir entrada al historial.
 */
export function useOpenFromUrl(onOpen) {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const id = searchParams.get('open');
    if (!id) return;
    onOpen(id);
    // Limpiar el param sin añadir entrada al historial
    setSearchParams((prev) => {
      prev.delete('open');
      return prev;
    }, { replace: true });
  // Solo ejecutar al montar o cuando cambie el param
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('open')]);
}
