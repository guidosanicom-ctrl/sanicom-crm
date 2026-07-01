import { useCatalogoEquiposStore } from '../../store/catalogoEquiposStore';

/**
 * Cascading selector: Categoría → Subcategoría (if the category has subcategories).
 *
 * Props:
 *   categoria, subcategoria — controlled values
 *   onCategoriaChange(value)
 *   onSubcategoriaChange(value)
 *   className — extra classes for the wrapper div
 */
export default function CatalogoEquipoSelect({ categoria = '', subcategoria = '', onCategoriaChange, onSubcategoriaChange, className = '' }) {
  const { categorias, subcategorias } = useCatalogoEquiposStore();

  const cats = categorias();
  const subs = categoria ? subcategorias(categoria) : [];

  const handleCatChange = (e) => {
    const val = e.target.value;
    onCategoriaChange(val);
    onSubcategoriaChange('');
  };

  const selCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white';

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <select className={selCls} value={categoria} onChange={handleCatChange}>
        <option value="">Sin especificar</option>
        {cats.map(c => <option key={c} value={c}>{c}</option>)}
        <option value="Otro">Otro</option>
      </select>
      {subs.length > 0 && (
        <select className={selCls} value={subcategoria} onChange={e => onSubcategoriaChange(e.target.value)}>
          <option value="">Subcategoría (opcional)</option>
          {subs.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
    </div>
  );
}
