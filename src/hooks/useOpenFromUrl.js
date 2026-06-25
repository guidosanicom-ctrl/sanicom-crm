import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Lee el parámetro ?id=<registroId> de la URL y llama a onOpen(registro)
 * cuando el item esté disponible en `items`.
 *
 * Reintenta cada vez que `items` cambia (por si los datos aún no habían cargado
 * en el primer render). Limpia el parámetro de la URL sin añadir historial.
 *
 * @param {Array}    items   Array de registros del store (oportunidades, demos, etc.)
 * @param {Function} onOpen  (item) => void — abre el detalle del registro
 */
export function useOpenFromUrl(items, onOpen) {
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get('id');
  const openedRef = useRef(false); // evitar doble apertura si items re-renderiza

  useEffect(() => {
    // Resetear cuando cambia el id de la URL
    openedRef.current = false;
  }, [id]);

  useEffect(() => {
    if (!id || openedRef.current) return;
    if (!items || items.length === 0) return; // datos aún no cargados, esperar

    const item = items.find((i) => i.id === id);
    if (!item) return; // id no encontrado en este store

    openedRef.current = true;
    onOpen(item);

    // Limpiar ?id= de la URL sin añadir entrada al historial
    setSearchParams(
      (prev) => { prev.delete('id'); return prev; },
      { replace: true }
    );
  // Se re-ejecuta cuando llegan los datos del store o cambia el id
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, items]);
}
