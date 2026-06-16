import { Clock, PlusCircle } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';
import { FIELD_LABELS } from '../../utils/auditLog';

function resolveVal(campo, value, clientes, equipos, users) {
  if (value === null || value === undefined || value === '') return '(vacío)';
  if (campo === 'clienteId') return clientes.find(c => c.id === value)?.nombre || value;
  if (campo === 'equipoId') return equipos.find(e => e.id === value)?.nombre || value;
  if (campo === 'responsable' || campo === 'tecnico')
    return users.find(u => u.id === value)?.name || value;
  if (campo === 'confirmacionCliente' || campo === 'generarOportunidad')
    return value ? 'Sí' : 'No';
  if (campo === 'equipos' && Array.isArray(value)) {
    if (value.length === 0) return '(ninguno)';
    return value.map(id => equipos.find(e => e.id === id)?.nombre || id).join(', ');
  }
  return String(value);
}

export default function HistorialTimeline({ historial = [], clientes = [], equipos = [], users = [] }) {
  if (historial.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic py-2">Sin cambios registrados todavía.</p>
    );
  }

  const sorted = [...historial].sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora));

  return (
    <div className="relative pl-1">
      {/* vertical line */}
      <div className="absolute left-3.5 top-3 bottom-3 w-px bg-gray-100" />

      <div className="space-y-5">
        {sorted.map((entry) => {
          const isCreated = entry.campo === '_accion';
          const label = FIELD_LABELS[entry.campo] || entry.campo;
          const prev = resolveVal(entry.campo, entry.valorAnterior, clientes, equipos, users);
          const next = resolveVal(entry.campo, entry.valorNuevo, clientes, equipos, users);

          return (
            <div key={entry.id} className="flex gap-3 relative">
              {/* dot */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 ${isCreated ? 'bg-[#1B4F8A] border-[#1B4F8A]' : 'bg-white border-[#3ABDD5]'}`}>
                {isCreated
                  ? <PlusCircle className="w-3.5 h-3.5 text-white" />
                  : <Clock className="w-3 h-3 text-[#3ABDD5]" />
                }
              </div>

              <div className="flex-1 min-w-0">
                {isCreated ? (
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">{entry.userName}</span>
                    {' '}{entry.valorNuevo}
                  </p>
                ) : (
                  <p className="text-sm text-gray-700 flex flex-wrap items-center gap-x-1 gap-y-1">
                    <span className="font-semibold text-gray-900">{entry.userName}</span>
                    <span>cambió</span>
                    <span className="font-medium text-gray-800">{label}</span>
                    <span>de</span>
                    <span className="inline-flex px-1.5 py-0.5 rounded text-xs bg-red-50 text-red-700 font-medium line-through">{prev}</span>
                    <span>a</span>
                    <span className="inline-flex px-1.5 py-0.5 rounded text-xs bg-green-50 text-green-700 font-medium">{next}</span>
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(entry.fechaHora)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
