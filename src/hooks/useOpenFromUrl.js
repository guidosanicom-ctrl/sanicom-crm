import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Abre automáticamente el detalle de un registro cuando la URL contiene ?openId=<id>.
 * Espera a que `items` esté cargado antes de intentar encontrar el registro.
 *
 * @param {Array}    items   Array de registros del store (oportunidades, demos, etc.)
 * @param {Function} onOpen  (item) => void — abre el detalle del registro
 */
export function useOpenFromUrl(items, onOpen) {
  const [searchParams, setSearchParams] = useSearchParams();
  const openId = searchParams.get('openId');
  const openedIdRef = useRef(null); // guarda el id que ya fue abierto para evitar doble apertura
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!openId) return;
    if (openedIdRef.current === openId) return; // ya abierto este id
    if (!items || items.length === 0) return;    // esperar a que carguen los datos

    const item = items.find((i) => String(i.id) === String(openId));
    if (!item) return;

    openedIdRef.current = openId;
    onOpenRef.current(item);

    // Limpiar ?openId= de la URL sin añadir entrada al historial
    setSearchParams((prev) => { prev.delete('openId'); return prev; }, { replace: true });
  }, [openId, items, setSearchParams]);
}
