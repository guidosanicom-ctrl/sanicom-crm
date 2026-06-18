import { useRef, useState } from 'react';
import { FileText, Upload, Trash2, ExternalLink, Download, Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import ConfirmDialog from './ConfirmDialog';
import { useAuthStore } from '../../store/authStore';
import { uploadPresupuesto, deletePresupuesto } from '../../utils/presupuestosUpload';
import toast from 'react-hot-toast';

function formatFecha(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PresupuestosSection({ presupuestos = [], onUpdate, origen, origenId }) {
  const { user } = useAuthStore();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [delTarget, setDelTarget] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploading(true);
    const result = await uploadPresupuesto({ file, origen, origenId, user });
    setUploading(false);

    if (!result.ok) { toast.error(result.error); return; }
    onUpdate([...presupuestos, result.presupuesto]);
    toast.success('Presupuesto subido correctamente.');
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    await deletePresupuesto(delTarget.path);
    onUpdate(presupuestos.filter(p => p.id !== delTarget.id));
    toast.success('Presupuesto eliminado.');
    setDelTarget(null);
  };

  return (
    <div className="mt-6 pt-6 border-t border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Presupuestos</h3>
          <p className="text-xs text-gray-400 mt-0.5">PDFs enviados al cliente · máx. 10 MB por archivo</p>
        </div>
        <div>
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Subiendo…</>
              : <><Upload className="w-4 h-4" />Subir PDF</>
            }
          </Button>
        </div>
      </div>

      {presupuestos.length === 0 ? (
        <div className="py-8 text-center">
          <FileText className="w-7 h-7 mx-auto mb-2 text-gray-200" />
          <p className="text-sm text-gray-400">Sin presupuestos subidos</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {presupuestos.map(p => (
            <div key={p.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-red-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.nombre}</p>
                  <p className="text-xs text-gray-400">{formatFecha(p.fecha)} · Subido por {p.subidoPorNombre}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer inline-flex"
                  title="Abrir"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a
                  href={p.url}
                  download={p.nombre}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer inline-flex"
                  title="Descargar"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setDelTarget(p)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar presupuesto"
        message={`¿Eliminar "${delTarget?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
      />
    </div>
  );
}
