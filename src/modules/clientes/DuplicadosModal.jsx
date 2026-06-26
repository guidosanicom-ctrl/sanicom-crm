import { useMemo, useState, useEffect } from 'react';
import { Copy, Trash2, Phone, Building2, CheckCircle2 } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { formatDate } from '../../utils/formatters';

// ── Detección de grupos duplicados ────────────────────────────────────────────

function detectarGrupos(clientes) {
  const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

  // Mapas auxiliares: valor normalizado → ids
  const porNombre = {};
  const porTelefono = {};
  clientes.forEach(c => {
    const n = norm(c.nombre);
    if (n) { if (!porNombre[n]) porNombre[n] = []; porNombre[n].push(c.id); }
    const t = norm(c.telefono).replace(/[\s\-().]/g, '');
    if (t.length >= 7) { if (!porTelefono[t]) porTelefono[t] = []; porTelefono[t].push(c.id); }
  });

  // Union-Find para fusionar grupos que comparten miembros
  const parent = {};
  const find = (x) => { if (parent[x] === undefined) parent[x] = x; return parent[x] === x ? x : (parent[x] = find(parent[x])); };
  const union = (a, b) => { parent[find(a)] = find(b); };

  const agregarGrupo = (ids) => { for (let i = 1; i < ids.length; i++) union(ids[0], ids[i]); };

  Object.values(porNombre).filter(g => g.length > 1).forEach(agregarGrupo);
  Object.values(porTelefono).filter(g => g.length > 1).forEach(agregarGrupo);

  // Agrupar ids por raíz
  const grupos = {};
  clientes.forEach(c => {
    if (parent[c.id] === undefined) return; // no está en ningún par
    const raiz = find(c.id);
    if (!grupos[raiz]) grupos[raiz] = [];
    grupos[raiz].push(c);
  });

  // Solo grupos con ≥ 2 miembros
  return Object.values(grupos)
    .filter(g => g.length >= 2)
    .map(g => {
      // Determinar motivo del grupo
      const nombres = [...new Set(g.map(c => norm(c.nombre)))];
      const tels    = [...new Set(g.map(c => norm(c.telefono).replace(/[\s\-().]/g, '')).filter(t => t.length >= 7))];
      const motivo  = nombres.length === 1 ? 'nombre' : tels.length === 1 ? 'teléfono' : 'nombre y teléfono';
      return { miembros: g, motivo };
    })
    .sort((a, b) => b.miembros.length - a.miembros.length);
}

// ── Componente ─────────────────────────────────────────────────────────────────

export default function DuplicadosModal({ open, onClose, clientes, onEliminar }) {
  // Ids marcados manualmente para eliminar — ninguno por defecto, decisión 100% del usuario
  const [marcados, setMarcados] = useState(new Set());
  const [confirmando, setConfirmando] = useState(false);

  const grupos = useMemo(() => detectarGrupos(clientes), [clientes]);

  // Resetear selección cada vez que se abre el modal o cambian los grupos detectados
  useEffect(() => {
    if (open) { setMarcados(new Set()); setConfirmando(false); }
  }, [open, grupos.length]);

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

  const MOTIVO_COLOR = { nombre: 'blue', teléfono: 'orange', 'nombre y teléfono': 'red' };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Gestionar duplicados"
      size="lg"
      footer={
        grupos.length > 0 ? (
          confirmando ? (
            <>
              <span className="text-sm text-red-600 font-medium mr-auto">
                ¿Eliminar {idsAEliminar.length} cliente{idsAEliminar.length !== 1 ? 's' : ''} duplicado{idsAEliminar.length !== 1 ? 's' : ''}? Esta acción no se puede deshacer.
              </span>
              <Button variant="outline" onClick={() => setConfirmando(false)}>Cancelar</Button>
              <Button variant="danger" onClick={handleEliminar}>
                <Trash2 className="w-4 h-4" />Confirmar eliminación
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm text-gray-500 mr-auto">
                {idsAEliminar.length} registro{idsAEliminar.length !== 1 ? 's' : ''} seleccionado{idsAEliminar.length !== 1 ? 's' : ''} para eliminar
              </span>
              <Button variant="outline" onClick={onClose}>Cerrar</Button>
              <Button variant="danger" onClick={() => setConfirmando(true)} disabled={idsAEliminar.length === 0}>
                <Trash2 className="w-4 h-4" />Eliminar duplicados
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
          <p className="text-lg font-semibold text-gray-800">No se encontraron duplicados</p>
          <p className="text-sm text-gray-400">Todos los clientes tienen nombre y teléfono únicos.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Resumen */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <Copy className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              Se detectaron <strong>{grupos.length} grupo{grupos.length !== 1 ? 's' : ''}</strong> de duplicados
              ({idsAEliminar.length} registro{idsAEliminar.length !== 1 ? 's' : ''} marcado{idsAEliminar.length !== 1 ? 's' : ''} para eliminar).
              Marca con el checkbox los que quieras eliminar — nada se borra automáticamente.
            </div>
          </div>

          {/* Grupos */}
          {grupos.map((g, gi) => (
            <div key={gi} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Cabecera del grupo */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Grupo {gi + 1} · {g.miembros.length} registros
                </span>
                <Badge color={MOTIVO_COLOR[g.motivo] || 'gray'}>
                  Duplicado por {g.motivo}
                </Badge>
              </div>

              {/* Filas de clientes */}
              <div className="divide-y divide-gray-100">
                {g.miembros.map(c => {
                  const marcado = marcados.has(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors
                        ${marcado ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => toggle(c.id)}
                        className="mt-1 accent-red-600 cursor-pointer w-4 h-4"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${marcado ? 'text-red-700' : 'text-gray-800'}`}>
                            {c.nombre}
                          </span>
                          {marcado && (
                            <span className="text-xs text-red-500 font-medium bg-red-100 px-1.5 py-0.5 rounded">
                              Marcado para eliminar
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5 text-xs text-gray-500">
                          {c.tipo && <span><Building2 className="w-3 h-3 inline mr-0.5" />{c.tipo}</span>}
                          {c.telefono && <span><Phone className="w-3 h-3 inline mr-0.5" />{c.telefono}</span>}
                          {c.ciudad && <span>{c.ciudad}</span>}
                          {c.fechaAlta && <span>Alta: {formatDate(c.fechaAlta)}</span>}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
