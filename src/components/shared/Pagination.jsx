import { ChevronLeft, ChevronRight } from 'lucide-react';

function getPageNumbers(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page]);
  if (page > 1) pages.add(page - 1);
  if (page < totalPages) pages.add(page + 1);
  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) result.push('…');
    result.push(p);
    prev = p;
  }
  return result;
}

export default function Pagination({ page, total, perPage = 10, onChange, onPerPageChange, perPageOptions }) {
  const totalPages = Math.ceil(total / perPage);
  const from = total === 0 ? 0 : Math.min((page - 1) * perPage + 1, total);
  const to = Math.min(page * perPage, total);

  if (totalPages <= 1 && !onPerPageChange) return null;

  const btnBase = 'h-8 min-w-[2rem] px-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer';
  const btnPage = `${btnBase} border border-gray-200 text-gray-600 hover:bg-gray-50`;
  const btnActive = `${btnBase} bg-[#1B4F8A] text-white`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-100">
      {/* Texto + selector de registros por página */}
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span>Mostrando {from}–{to} de {total}</span>
        {onPerPageChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">Filas:</span>
            <select
              value={perPage}
              onChange={e => { onPerPageChange(Number(e.target.value)); onChange(1); }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              {(perPageOptions || [25, 50, 100]).map(n => (
                <option key={n} value={n}>{n} / pág.</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Botones de navegación */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onChange(page - 1)}
            disabled={page === 1}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {getPageNumbers(page, totalPages).map((p, i) =>
            p === '…'
              ? <span key={`ellipsis-${i}`} className="h-8 flex items-end pb-1 px-1 text-gray-400 text-sm select-none">…</span>
              : (
                <button
                  key={p}
                  onClick={() => onChange(p)}
                  className={p === page ? btnActive : btnPage}
                >
                  {p}
                </button>
              )
          )}

          <button
            onClick={() => onChange(page + 1)}
            disabled={page === totalPages}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
