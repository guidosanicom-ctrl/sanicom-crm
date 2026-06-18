import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export default function ClienteSearchInput({
  value,
  onChange,
  clientes = [],
  error = false,
  placeholder = 'Buscar cliente...',
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selectedCliente = clientes.find(c => c.id === value);

  useEffect(() => {
    setQuery(selectedCliente ? selectedCliente.nombre : '');
  }, [value, selectedCliente?.nombre]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.length >= 2
    ? clientes.filter(c => c.nombre.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
    : [];

  const handleChange = (e) => {
    setQuery(e.target.value);
    setOpen(true);
    if (value) onChange('');
  };

  const handleSelect = (cliente) => {
    onChange(cliente.id);
    setQuery(cliente.nombre);
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full pl-8 ${value ? 'pr-8' : 'pr-3'} py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${error ? 'border-red-400' : 'border-gray-200'}`}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-gray-400 italic">No se encontraron clientes</p>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                type="button"
                onMouseDown={() => handleSelect(c)}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#1B4F8A] transition-colors"
              >
                {c.nombre}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
