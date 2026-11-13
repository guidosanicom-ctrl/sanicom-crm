import { useEffect, useMemo, useRef, useState } from 'react';
import { Package, Wrench, Link2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

/**
 * Campo "Concepto" de una línea de presupuesto con buscador del catálogo STEL.
 * Al elegir un artículo se rellenan referencia, precio e IVA; si se escribe a mano
 * la línea queda como texto libre (sin vínculo a STEL).
 */
export default function ArticuloSearchInput({ linea, articulos = [], onSelect, onTextChange, onUnlink, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const query = linea.concepto || '';

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const resultados = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Si la línea ya tiene artículo, al abrir se muestran todos (para poder cambiarlo)
    const base = linea.stelItemId || !q
      ? articulos
      : articulos.filter(a => a.nombre?.toLowerCase().includes(q) || a.referencia?.toLowerCase().includes(q));
    return [...base].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')).slice(0, 30);
  }, [articulos, query, linea.stelItemId]);

  return (
    <div ref={ref} className="relative">
      <input
        className={`${className} ${linea.stelItemId ? 'pr-7' : ''}`}
        placeholder={articulos.length ? 'Buscar artículo del catálogo o escribir concepto…' : 'Concepto (ej: Mantenimiento anual)'}
        value={query}
        autoComplete="off"
        onFocus={() => articulos.length && setOpen(true)}
        onChange={e => { onTextChange(e.target.value); if (articulos.length && !linea.stelItemId) setOpen(true); }}
      />
      {linea.stelItemId && (
        <button
          type="button"
          onClick={onUnlink}
          title={`Vinculado a STEL (${linea.referencia || ''}). Pulsa para quitar el vínculo`}
          className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
        >
          <Link2 className="w-3.5 h-3.5 text-[#1B4F8A] hover:text-red-500" />
        </button>
      )}
      {open && resultados.length > 0 && (
        <div className="absolute z-50 w-full min-w-[280px] mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
          {resultados.map(a => {
            const Icon = a.tipo === 'service' ? Wrench : Package;
            return (
              <button
                key={a.id}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onSelect(a); setOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-start gap-2 cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-gray-800 truncate">{a.nombre}</span>
                  <span className="block text-xs text-gray-400">{a.referencia} · {formatCurrency(a.precio)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
