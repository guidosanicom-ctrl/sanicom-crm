import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Loader2, Package, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import SearchBar from '../../components/shared/SearchBar';
import { useStelCatalogoStore, areasEfectivas, prefijoReferencia } from '../../store/stelCatalogoStore';
import { AREAS_CATALOGO } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';

const PER_PAGE = 50;

function AreaChips({ value = [], heredadas = [], onToggle }) {
  return (
    <div className="flex flex-wrap gap-1">
      {AREAS_CATALOGO.map(a => {
        const manual = value.includes(a.id);
        const heredada = !manual && heredadas.includes(a.id);
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onToggle(a.id)}
            title={heredada ? 'Asignada por su marca o categoría' : undefined}
            className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer
              ${manual ? 'bg-[#1B4F8A] text-white border-[#1B4F8A]'
                : heredada ? 'bg-blue-50 text-[#1B4F8A] border-blue-200'
                : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}
          >
            {a.label}
          </button>
        );
      })}
    </div>
  );
}

export default function CatalogoStel() {
  const { items, config, syncing, initialize, sincronizar, setItemAreas, setCategoriaAreas, setPrefijoAreas } = useStelCatalogoStore();
  const [buscaMarca, setBuscaMarca] = useState('');
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [page, setPage] = useState(1);
  const [areaMasiva, setAreaMasiva] = useState(AREAS_CATALOGO[0].id);

  useEffect(() => { initialize(); }, [initialize]);

  const catAreas = config.categoriaAreas || {};
  const prefAreas = config.prefijoAreas || {};

  // Marcas detectadas por el prefijo de la referencia, con nº de artículos y un ejemplo
  const marcas = useMemo(() => {
    const m = new Map();
    items.filter(i => !i.eliminado).forEach(i => {
      const p = prefijoReferencia(i.referencia);
      if (!p) return;
      const e = m.get(p) || { prefijo: p, total: 0, ejemplo: i.nombre };
      e.total++; m.set(p, e);
    });
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [items]);
  const marcasVisibles = marcas.filter(m => !buscaMarca || m.prefijo.toLowerCase().includes(buscaMarca.toLowerCase()) || m.ejemplo?.toLowerCase().includes(buscaMarca.toLowerCase()));

  const visibles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter(i => !i.eliminado)
      .filter(i => !tipo || i.tipo === tipo)
      .filter(i => {
        if (!filtroArea) return true;
        const ef = areasEfectivas(i, config);
        return filtroArea === '__sin' ? ef.length === 0 : ef.includes(filtroArea);
      })
      .filter(i => !q || [i.nombre, i.referencia, i.categoriaNombre].some(t => t?.toLowerCase().includes(q)))
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }, [items, tipo, filtroArea, search, config]);

  const paginados = visibles.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(visibles.length / PER_PAGE));
  const sinArea = items.filter(i => !i.eliminado && areasEfectivas(i, config).length === 0).length;

  const handleSync = async () => {
    const r = await sincronizar();
    if (!r.ok) { toast.error(`No se pudo sincronizar: ${r.error}`); return; }
    toast.success(`Catálogo actualizado: ${r.productos} productos y ${r.servicios} servicios.`);
  };

  // Asignación masiva: añade o quita un área a todos los artículos del filtro actual
  const aplicarMasivo = (quitar) => {
    let n = 0;
    visibles.forEach(i => {
      const tiene = (i.areas || []).includes(areaMasiva);
      if (quitar && tiene) { setItemAreas(i.id, i.areas.filter(a => a !== areaMasiva)); n++; }
      if (!quitar && !tiene) { setItemAreas(i.id, [...(i.areas || []), areaMasiva]); n++; }
    });
    const nombre = AREAS_CATALOGO.find(a => a.id === areaMasiva)?.label;
    toast.success(quitar ? `Quitado «${nombre}» de ${n} artículos.` : `Asignado «${nombre}» a ${n} artículos.`);
  };

  const toggle = (list, id) => list.includes(id) ? list.filter(x => x !== id) : [...list, id];

  const sel = 'px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white';

  return (
    <div className="space-y-4">
      <Card padding={false} className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-800">Catálogo de STEL Order</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-xl">
              Artículos y servicios de STEL que se pueden usar en los presupuestos del CRM.
              Asigna cada uno a un área: cada comercial solo verá los de su área. Administración ve todos.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {config.ultimaSync
                ? `Última sincronización: ${new Date(config.ultimaSync).toLocaleString('es-ES')}`
                : 'Todavía no se ha sincronizado.'}
              {items.length > 0 && ` · ${items.filter(i => !i.eliminado).length} artículos · ${sinArea} sin área`}
            </p>
          </div>
          <Button size="sm" onClick={handleSync} disabled={syncing}>
            {syncing ? <><Loader2 className="w-4 h-4 animate-spin" />Sincronizando…</> : <><RefreshCw className="w-4 h-4" />Sincronizar con STEL</>}
          </Button>
        </div>
      </Card>

      {marcas.length > 0 && (
        <Card padding={false} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-700">Áreas por marca</h4>
              <p className="text-xs text-gray-400 mt-0.5">
                La marca sale del inicio de la referencia (ROSS-04BP031 → ROSS). Asignar una marca a un área incluye
                todos sus artículos, también los que se den de alta en el futuro.
              </p>
            </div>
            <SearchBar value={buscaMarca} onChange={setBuscaMarca} placeholder="Buscar marca…" className="w-48" />
          </div>
          <div className="divide-y divide-gray-100 max-h-[420px] overflow-auto">
            {marcasVisibles.map(m => (
              <div key={m.prefijo} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700">{m.prefijo}<span className="text-xs font-normal text-gray-400 ml-2">{m.total} artículos</span></p>
                  <p className="text-xs text-gray-400 truncate max-w-md">Ej.: {m.ejemplo}</p>
                </div>
                <AreaChips value={prefAreas[m.prefijo] || []} onToggle={a => setPrefijoAreas(m.prefijo, toggle(prefAreas[m.prefijo] || [], a))} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {config.categorias?.length > 0 && (
        <Card padding={false} className="p-5">
          <h4 className="text-sm font-semibold text-gray-700">Áreas por categoría de STEL</h4>
          <p className="text-xs text-gray-400 mt-0.5 mb-3">
            Asignar una categoría a un área incluye todos sus productos, también los que se añadan en el futuro.
          </p>
          <div className="divide-y divide-gray-100">
            {config.categorias.map(c => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <p className="text-sm text-gray-700">
                  {c.nombre}
                  <span className="text-xs text-gray-400 ml-2">{items.filter(i => i.categoriaId === c.id && !i.eliminado).length} productos</span>
                </p>
                <AreaChips value={catAreas[c.id] || []} onToggle={a => setCategoriaAreas(c.id, toggle(catAreas[c.id] || [], a))} />
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card padding={false} className="p-5">
        <div className="flex flex-wrap gap-2 mb-3">
          <SearchBar value={search} onChange={s => { setSearch(s); setPage(1); }} placeholder="Buscar nombre, referencia…" className="w-56" />
          <select className={sel} value={tipo} onChange={e => { setTipo(e.target.value); setPage(1); }}>
            <option value="">Productos y servicios</option>
            <option value="product">Solo productos</option>
            <option value="service">Solo servicios</option>
          </select>
          <select className={sel} value={filtroArea} onChange={e => { setFiltroArea(e.target.value); setPage(1); }}>
            <option value="">Todas las áreas</option>
            <option value="__sin">Sin área asignada</option>
            {AREAS_CATALOGO.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </div>

        {visibles.length > 0 && (search || tipo || filtroArea) && (
          <div className="flex flex-wrap items-center gap-2 mb-3 p-2.5 bg-blue-50/60 border border-blue-100 rounded-lg text-sm">
            <span className="text-gray-600">Los <b>{visibles.length}</b> resultados:</span>
            <select className="px-2 py-1 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none" value={areaMasiva} onChange={e => setAreaMasiva(e.target.value)}>
              {AREAS_CATALOGO.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
            <Button size="sm" onClick={() => aplicarMasivo(false)}>Asignar a todos</Button>
            <Button size="sm" variant="outline" onClick={() => aplicarMasivo(true)}>Quitar a todos</Button>
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">Pulsa «Sincronizar con STEL» para traer el catálogo.</p>
        ) : visibles.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">No hay artículos con estos filtros.</p>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {paginados.map(i => {
                const heredadas = areasEfectivas({ ...i, areas: [] }, config);
                const Icon = i.tipo === 'service' ? Wrench : Package;
                return (
                  <div key={i.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5 ${i.inactivo ? 'opacity-50' : ''}`}>
                    <div className="flex items-start gap-2 min-w-0">
                      <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 truncate">{i.nombre}{i.inactivo && <span className="text-xs text-gray-400 ml-2">(inactivo en STEL)</span>}</p>
                        <p className="text-xs text-gray-400">
                          {i.referencia}{i.categoriaNombre && ` · ${i.categoriaNombre}`} · {formatCurrency(i.precio)} · IVA {i.ivaPct}%
                        </p>
                      </div>
                    </div>
                    <AreaChips value={i.areas || []} heredadas={heredadas} onToggle={a => setItemAreas(i.id, toggle(i.areas || [], a))} />
                  </div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 text-xs text-gray-500">
                <span>{visibles.length} artículos</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                  <span>{page} / {totalPages}</span>
                  <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
