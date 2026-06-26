import { useMemo, useState, useEffect } from 'react';
import { Copy, Trash2, CheckCircle2 } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const tieneCompleto = (c) => !!(c.grupo_rm && c.campo_rm);

function detectarGrupos(clientes) {
  const swift = clientes.filter(c => c.especialidad === 'SwiftMR');
  const porNombre = {};
  swift.forEach(c => {
    const n = norm(c.nombre);
    if (!n) return;
    if (!porNombre[n]) porNombre[n] = [];
    porNombre[n].push(c);
  });
  return Object.values(porNombre).filter(g => g.length > 1);
}

export default function SwiftMRDuplicadosModal({ open, onClose, clientes, onEliminar }) {
  const grupos = useMemo(() => detectarGrupos(clientes), [clientes]);

  // ids marcados con checkbox para eliminar (decisión manual, sin preselección automática)
  const [marcados, setMarcados] = useState(new Set());
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => { if (open) { setMarcados(new Set()); setConfirmando(false); } }, [open]);

  const toggle = (id) => setMarcados(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const idsAEliminar = [...marcados];

  const handleEliminar = () => {
    onEliminar(idsAEliminar);
    setConfirmando(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Duplicados SwiftMR"
      size="lg"
      footer={
        grupos.length > 0 ? (
          confirmando ? (
            <>
              <span className="text-sm text-red-600 font-medium mr-auto">
                ¿Eliminar {idsAEliminar.length} cliente{idsAEliminar.length !== 1 ? 's' : ''} marcado{idsAEliminar.length !== 1 ? 's' : ''}? Esta acción no se puede deshacer.
              </span>
              <Button variant="outline" onClick={() => setConfirmando(false)}>Cancelar</Button>
              <Button variant="danger" onClick={handleEliminar}>
                <Trash2 className="w-4 h-4" />Confirmar eliminación
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm text-gray-500 mr-auto">
                {idsAEliminar.length} registro{idsAEliminar.length !== 1 ? 's' : ''} marcado{idsAEliminar.length !== 1 ? 's' : ''} para eliminar
              </span>
              <Button variant="outline" onClick={onClose}>Cerrar</Button>
              <Button variant="danger" onClick={() => setConfirmando(true)} disabled={idsAEliminar.length === 0}>
                <Trash2 className="w-4 h-4" />Eliminar seleccionados
              </Button>
            </>
          )
        ) : (
          <Button onClick={onClose}>Cerrar</Button>
        )
      }
    >
      {grupos.length === 0 ? (
        <div className="py-14 text-center space-y-3">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-lg font-semibold text-gray-800">No se encontraron duplicados SwiftMR</p>
          <p className="text-sm text-gray-400">Todos los clientes con especialidad SwiftMR tienen nombre único.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <Copy className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              Se detectaron <strong>{grupos.length} nombre{grupos.length !== 1 ? 's' : ''}</strong> con registros duplicados.
              Marca con el checkbox los que quieras eliminar — nada se borra automáticamente.
            </div>
          </div>

          {grupos.map((miembros, gi) => (
            <div key={gi} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <span className="text-sm font-semibold text-gray-700">{miembros[0].nombre}</span>
                <Badge color="orange">{miembros.length} registros</Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-10"></th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Ciudad</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Dirección</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Grupo RM</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Campo RM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {miembros.map(c => {
                      const marcado = marcados.has(c.id);
                      const completo = tieneCompleto(c);
                      return (
                        <tr key={c.id} className={marcado ? 'bg-red-50' : completo ? 'bg-green-50/40' : ''}>
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={marcado}
                              onChange={() => toggle(c.id)}
                              className="accent-red-600 cursor-pointer w-4 h-4"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-gray-700">{c.ciudad || '-'}</td>
                          <td className="px-3 py-2.5 text-gray-700 max-w-[220px] truncate">{c.direccion || '-'}</td>
                          <td className="px-3 py-2.5">
                            {c.grupo_rm
                              ? <span className="font-medium text-gray-800">{c.grupo_rm}</span>
                              : <span className="text-gray-300 italic">vacío</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            {c.campo_rm
                              ? <span className="font-medium text-gray-800">{c.campo_rm}</span>
                              : <span className="text-gray-300 italic">vacío</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
