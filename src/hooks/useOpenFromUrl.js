import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Abre automáticamente el detalle de un registro cuando la URL contiene ?id=<id>.
 * Espera a que `items` esté cargado antes de intentar encontrar el registro.
 *
 * @param {Array}    items   Array de registros del store (oportunidades, demos, etc.)
 * @param {Function} onOpen  (item) => void — abre el detalle del registro
 */
export function useOpenFromUrl(items, onOpen) {
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get('id');
  const openedIdRef = useRef(null); // guarda el id que ya fue abierto
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen; // siempre ref más reciente para evitar stale closure

  useEffect(() => {
    if (!id) return;
    if (openedIdRef.current === id) return; // ya abierto este id
    if (!items || items.length === 0) return; // esperar a que carguen los datos

    // Comparar como string por si el id viene de URL (string) vs store (uuid string)
    const item = items.find((i) => String(i.id) === String(id));
    if (!item) return;

    openedIdRef.current = id;
    onOpenRef.current(item);

    setSearchParams((prev) => { prev.delete('id'); return prev; }, { replace: true });
  }, [id, items, setSearchParams]);
}
