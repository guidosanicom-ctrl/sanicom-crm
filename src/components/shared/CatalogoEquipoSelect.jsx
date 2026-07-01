import { useCatalogoEquiposStore, SUBCATEGORIA_LIBRE } from '../../store/catalogoEquiposStore';

/**
 * Cascading selector: Categoría → Subcategoría/Modelo.
 * - categoria='Otro' → free-text input via otroTexto
 * - subcategoria=SUBCATEGORIA_LIBRE → free-text input via otroTexto
 *
 * Props (all controlled):
 *   categoria, subcategoria, otroTexto
 *   onCategoriaChange(value)
 *   onSubcategoriaChange(value)
 *   onOtroTextoChange(value)
 *   className
 */
export default function CatalogoEquipoSelect({
  categoria = '',
  subcategoria = '',
  otroTexto = '',
  onCategoriaChange,
  onSubcategoriaChange,
  onOtroTextoChange,
  className = '',
}) {
  const { categorias, subcategorias } = useCatalogoEquiposStore();

  const cats = categorias();
  const subs = categoria && categoria !== 'Otro' ? subcategorias(categoria) : [];
  const subcatIsLibre = subcategoria === SUBCATEGORIA_LIBRE;

  const selCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white';
  const inpCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400';

  const handleCatChange = (e) => {
    const val = e.target.value;
    onCategoriaChange(val);
    onSubcategoriaChange('');
    onOtroTextoChange?.('');
  };

  const handleSubChange = (e) => {
    onSubcategoriaChange(e.target.value);
    onOtroTextoChange?.('');
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Categoría */}
      <select className={selCls} value={categoria} onChange={handleCatChange}>
        <option value="">Sin especificar</option>
        {cats.map(c => <option key={c} value={c}>{c}</option>)}
        <option value="Otro">Otro</option>
      </select>

      {/* Texto libre cuando categoria = 'Otro' */}
      {categoria === 'Otro' && (
        <input
          className={inpCls}
          value={otroTexto}
          onChange={e => onOtroTextoChange?.(e.target.value)}
          placeholder="Especifica el equipo..."
          autoFocus
        />
      )}

      {/* Subcategoría/modelo */}
      {subs.length > 0 && (
        <select className={selCls} value={subcategoria} onChange={handleSubChange}>
          <option value="">Modelo / subcategoría (opcional)</option>
          {subs.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      )}

      {/* Texto libre cuando subcategoria = 'Ocasión / Otra marca' */}
      {subcatIsLibre && (
        <input
          className={inpCls}
          value={otroTexto}
          onChange={e => onOtroTextoChange?.(e.target.value)}
          placeholder="Marca y modelo..."
          autoFocus
        />
      )}
    </div>
  );
}
