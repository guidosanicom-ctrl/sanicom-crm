import { useState, useRef, useEffect } from 'react';
import { Download, Upload, Clock, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useClientesStore } from '../../store/clientesStore';
import { useOportunidadesStore } from '../../store/oportunidadesStore';
import { useDemosStore } from '../../store/demosStore';
import { useServicioStore } from '../../store/servicioStore';
import { useVisitasStore } from '../../store/visitasStore';
import { useEquiposStore } from '../../store/equiposStore';
import { useAgendaStore } from '../../store/agendaStore';
import { useNotificacionesStore } from '../../store/notificacionesStore';
import { useActividadStore } from '../../store/actividadStore';
import { supabase } from '../../lib/supabase';

const HISTORY_KEY = 'sanicom_backup_history';
const REMINDER_KEY = 'sanicom_backup_reminder';
const REMINDER_LAST_KEY = 'sanicom_backup_reminder_last';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Emails autorizados para restaurar
const EMAILS_RESTAURAR = ['administracion@sanicom.es', 'jgovantes@sanicom.es', 'guidorosso@sanicom.es'];

// Tabla → clave en el backup JSON
const TABLAS = [
  { table: 'clientes',           key: 'clientes' },
  { table: 'oportunidades',      key: 'oportunidades' },
  { table: 'demostraciones',     key: 'demos' },
  { table: 'ordenes_servicio',   key: 'servicio' },
  { table: 'visitas',            key: 'visitas' },
  { table: 'equipos',            key: 'equipos' },
  { table: 'eventos_agenda',     key: 'agenda' },
  { table: 'notificaciones',     key: 'notificaciones' },
  { table: 'actividad',          key: 'actividad' },
];

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
}

function saveHistory(entry) {
  const prev = getHistory();
  const next = [entry, ...prev].slice(0, 5);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

function getReminderDay() {
  try { return JSON.parse(localStorage.getItem(REMINDER_KEY))?.day ?? 1; } catch { return 1; }
}

export default function CopiaSeguridad() {
  const { user, users } = useAuthStore();
  const { clientes }       = useClientesStore();
  const { oportunidades }  = useOportunidadesStore();
  const { demos }          = useDemosStore();
  const { servicios }      = useServicioStore();
  const { visitas }        = useVisitasStore();
  const { equipos }        = useEquiposStore();
  const { eventos }        = useAgendaStore();
  const { notificaciones } = useNotificacionesStore();
  const { actividad }      = useActividadStore();
  const { pushNotificacion } = useNotificacionesStore();

  const [history, setHistory] = useState(getHistory);
  const [reminderDay, setReminderDay] = useState(getReminderDay);
  const [exporting, setExporting] = useState(false);

  // Restaurar
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreData, setRestoreData] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [restoring, setRestoring] = useState(false);
  const fileRef = useRef();

  const canRestore = EMAILS_RESTAURAR.includes(user?.email);

  // ── Recordatorio semanal ────────────────────────────────────────────────────
  useEffect(() => {
    const today = new Date().getDay(); // 0=Dom … 6=Sab
    const configured = getReminderDay();
    if (today !== configured) return;

    // Comprobar si ya se envió esta semana (mismo año+semana)
    const now = new Date();
    const weekKey = `${now.getFullYear()}-W${getWeekNumber(now)}`;
    const lastSent = localStorage.getItem(REMINDER_LAST_KEY);
    if (lastSent === weekKey) return;

    // Enviar notificación a Julieta y Javier
    const destinatarios = users.filter(u => EMAILS_RESTAURAR.includes(u.email));
    destinatarios.forEach(dest => {
      pushNotificacion(dest.id, {
        tipo: 'recordatorio',
        titulo: 'Recordatorio: copia de seguridad',
        mensaje: 'Es día de realizar la copia de seguridad del CRM. Ve a Configuración → Copia de seguridad.',
        icono: 'shield',
      });
    });
    localStorage.setItem(REMINDER_LAST_KEY, weekKey);
  }, []);

  // ── Exportar ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const backup = {
        version: 1,
        exportadoEn: new Date().toISOString(),
        exportadoPor: user?.name,
        clientes,
        oportunidades,
        demos,
        servicio: servicios,
        visitas,
        equipos,
        agenda: eventos,
        notificaciones,
        actividad,
      };

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const fecha = new Date().toISOString().split('T')[0];
      const filename = `sanicom-backup-${fecha}.json`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      const entry = {
        fecha: new Date().toISOString(),
        filename,
        registros: {
          clientes: clientes.length,
          oportunidades: oportunidades.length,
          demos: demos.length,
          servicio: servicios?.length ?? 0,
          visitas: visitas.length,
          equipos: equipos.length,
          agenda: eventos.length,
        },
      };
      saveHistory(entry);
      setHistory(getHistory());
      toast.success(`Copia exportada: ${filename}`);
    } catch (err) {
      console.error('[backup export]', err);
      toast.error('Error al exportar la copia de seguridad.');
    } finally {
      setExporting(false);
    }
  };

  // ── Guardar día de recordatorio ─────────────────────────────────────────────
  const handleSaveReminder = () => {
    localStorage.setItem(REMINDER_KEY, JSON.stringify({ day: reminderDay }));
    localStorage.removeItem(REMINDER_LAST_KEY); // resetear para que se envíe de nuevo si hoy es el día
    toast.success(`Recordatorio configurado: cada ${DIAS[reminderDay]}`);
  };

  // ── Restaurar ───────────────────────────────────────────────────────────────
  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.json')) { toast.error('Solo se admiten archivos .json'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.version || !data.clientes) throw new Error('Formato no válido');
        setRestoreData(data);
        setRestoreFile(file.name);
        setConfirmText('');
      } catch {
        toast.error('El archivo no es una copia de seguridad válida de Sanicom CRM.');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleRestore = async () => {
    if (confirmText !== 'CONFIRMAR') return;
    if (!restoreData) return;
    setRestoring(true);
    try {
      for (const { table, key } of TABLAS) {
        const records = restoreData[key];
        if (!Array.isArray(records)) continue;

        // Eliminar todos los registros actuales
        const { error: delErr } = await supabase.from(table).delete().neq('id', '');
        if (delErr) console.error(`[restore] delete ${table}:`, delErr);

        // Insertar registros del backup en lotes de 100
        const BATCH = 100;
        for (let i = 0; i < records.length; i += BATCH) {
          const batch = records.slice(i, i + BATCH).map(r => {
            // La tabla notificaciones tiene columna user_id adicional
            if (table === 'notificaciones') return { id: r.id, user_id: r.userId, data: r };
            return { id: r.id, data: r };
          });
          const { error: insErr } = await supabase.from(table).insert(batch);
          if (insErr) console.error(`[restore] insert ${table} lote ${i}:`, insErr);
        }
      }

      toast.success('Copia de seguridad restaurada. La página se recargará.');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error('[restore]', err);
      toast.error('Error durante la restauración. Revisa la consola (F12).');
      setRestoring(false);
    }
  };

  const inp = `w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20`;

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Exportar ─────────────────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Exportar copia de seguridad</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Descarga un archivo JSON con todos los datos del sistema: clientes, oportunidades, demostraciones,
              órdenes de servicio, visitas, equipos, agenda, notificaciones y actividad.
            </p>
          </div>
        </div>

        <Button onClick={handleExport} disabled={exporting} className="mb-6">
          <Download className="w-4 h-4" />
          {exporting ? 'Exportando…' : 'Exportar copia de seguridad ahora'}
        </Button>

        {/* Historial */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            <Clock className="w-3.5 h-3.5 inline mr-1.5" />Últimas exportaciones
          </p>
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 py-3 text-center">Aún no se ha realizado ninguna exportación.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{h.filename}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(h.fecha).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {h.registros && ` · ${h.registros.clientes} clientes`}
                    </p>
                  </div>
                  {i === 0 && (
                    <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">Última</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* ── Recordatorio semanal ─────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Recordatorio semanal</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              El día seleccionado, Julieta, Javier y Guido recibirán una notificación recordando realizar la copia de seguridad.
            </p>
          </div>
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Día de la semana</label>
            <select
              value={reminderDay}
              onChange={e => setReminderDay(Number(e.target.value))}
              className={inp}
            >
              {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <Button onClick={handleSaveReminder}>Guardar</Button>
        </div>

        <p className="text-xs text-gray-400 mt-3">
          Actualmente configurado: <strong>{DIAS[reminderDay]}</strong>. La notificación se envía una vez por semana al abrir el CRM ese día.
        </p>
      </Card>

      {/* ── Restaurar ────────────────────────────────────────────────────────── */}
      {canRestore && (
        <Card>
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Upload className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Restaurar copia de seguridad</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Reemplaza todos los datos actuales del sistema con los del archivo de copia de seguridad.
              </p>
            </div>
          </div>

          {/* Zona de subida */}
          {!restoreData ? (
            <div>
              <div
                onClick={() => fileRef.current.click()}
                className="border-2 border-dashed border-red-200 rounded-xl p-8 text-center cursor-pointer hover:border-red-300 hover:bg-red-50/40 transition-colors"
              >
                <Upload className="w-8 h-8 text-red-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">Seleccionar archivo de copia de seguridad</p>
                <p className="text-xs text-gray-400 mt-1">Solo archivos .json exportados desde este CRM</p>
                <input ref={fileRef} type="file" accept=".json" className="hidden"
                  onChange={e => handleFileSelect(e.target.files[0])} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Info del archivo seleccionado */}
              <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-800">{restoreFile}</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    Exportado el {new Date(restoreData.exportadoEn).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {restoreData.exportadoPor ? ` por ${restoreData.exportadoPor}` : ''}
                    {' · '}{restoreData.clientes?.length ?? 0} clientes
                  </p>
                </div>
                <button onClick={() => { setRestoreData(null); setRestoreFile(null); setConfirmText(''); }}
                  className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">Cambiar</button>
              </div>

              {/* Aviso en rojo */}
              <div className="bg-red-50 border border-red-300 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  ATENCIÓN
                </div>
                <p className="text-sm text-red-700">
                  Esta acción <strong>reemplazará TODOS los datos actuales del sistema</strong>: clientes, oportunidades,
                  demostraciones, órdenes de servicio, visitas, equipos, agenda, notificaciones y actividad.
                </p>
                <p className="text-sm text-red-700 font-semibold">Esta acción no se puede deshacer.</p>
              </div>

              {/* Campo de confirmación */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Escribe <strong>CONFIRMAR</strong> para proceder
                </label>
                <input
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder="CONFIRMAR"
                  className={`${inp} font-mono ${confirmText && confirmText !== 'CONFIRMAR' ? 'border-red-400 focus:ring-red-500/20' : ''}`}
                />
              </div>

              <Button
                variant="danger"
                onClick={handleRestore}
                disabled={confirmText !== 'CONFIRMAR' || restoring}
                className="w-full justify-center"
              >
                <Upload className="w-4 h-4" />
                {restoring ? 'Restaurando… por favor espera' : 'Restaurar copia de seguridad'}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Escudo de acceso restringido para la restauración si el user no puede */}
      {!canRestore && (
        <Card>
          <div className="flex items-center gap-3 py-2 text-gray-400">
            <Shield className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">La función de restauración solo está disponible para administradores autorizados.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

// Número de semana ISO del año
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
