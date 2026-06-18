import { ExternalLink, FolderOpen } from 'lucide-react';
import { useDriveStore } from '../../store/driveStore';

export default function DocumentosPage() {
  const driveUrl = useDriveStore(s => s.driveUrl);

  return (
    <div className="space-y-6">
      {/* Acceso directo a Google Drive */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 flex flex-col items-center text-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-[#1B4F8A]/10 flex items-center justify-center">
          <FolderOpen className="w-8 h-8 text-[#1B4F8A]" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-1">Acceso directo a Google Drive</h2>
          <p className="text-sm text-gray-500">Accede a la carpeta compartida de Sanicom con toda la documentación del equipo.</p>
        </div>

        {driveUrl ? (
          <a
            href={driveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#1B4F8A] hover:bg-[#163f6e] text-white text-base font-semibold rounded-xl transition-colors shadow-md hover:shadow-lg"
          >
            <ExternalLink className="w-5 h-5" />
            Abrir Google Drive de Sanicom
          </a>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              disabled
              className="inline-flex items-center gap-3 px-8 py-4 bg-gray-200 text-gray-400 text-base font-semibold rounded-xl cursor-not-allowed"
            >
              <ExternalLink className="w-5 h-5" />
              Abrir Google Drive de Sanicom
            </button>
            <p className="text-xs text-gray-400">
              El enlace aún no está configurado. Un administrador debe añadirlo en{' '}
              <span className="font-medium">Configuración → Enlace Google Drive</span>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
