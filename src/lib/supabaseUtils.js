import { supabase } from './supabase';

const PAGE_SIZE = 1000;

/**
 * Trae TODOS los registros de una tabla superando el límite de 1000 filas
 * de Supabase. Hace peticiones sucesivas de PAGE_SIZE hasta agotar resultados.
 * Asume que la tabla tiene columna `data` (JSONB) y columna `id`.
 */
export async function fetchAll(table) {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('data')
      .range(from, from + PAGE_SIZE - 1);

    if (error) return { data: null, error };

    rows.push(...data);

    if (data.length < PAGE_SIZE) break;   // última página
    from += PAGE_SIZE;
  }

  return { data: rows, error: null };
}
