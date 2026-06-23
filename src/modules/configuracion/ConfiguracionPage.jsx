import { useState, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useEspecialidadesStore } from '../../store/especialidadesStore';
import { useSubespecialidadesStore } from '../../store/subespecialidadesStore';
import { usePipelineStore } from '../../store/pipelineStore';
import { useCategoriasStore } from '../../store/categoriasStore';
import { useTiposClienteStore } from '../../store/tiposClienteStore';
import { useServiciosHospitalStore } from '../../store/serviciosHospitalStore';
import { useDriveStore } from '../../store/driveStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import toast from 'react-hot-toast';
import { ROLES } from '../../utils/constants';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import CopiaSeguridad from './CopiaSeguridad';

const TABS_BASE = ['Usuarios', 'Mi perfil', 'Empresa', 'Pipeline', 'Servicios', 'Especialidades', 'Categorías equipos', 'Tipos de cliente', 'Servicios hospitalarios', 'Enlace Google Drive'];
const EMAILS_BACKUP = ['administracion@sanicom.es', 'jgovantes@sanicom.es', 'guidorosso@sanicom.es'];

const EMPRESA_INIT = { nombre: 'Sanicom S.L.', cif: 'B12345678', direccion: 'C/ Ejemplo, 1, Sevilla', telefono: '954 000 000' };

export default function ConfiguracionPage() {
  const { user, users } = useAuthStore();
  const { especialidades, addEspecialidad, updateEspecialidad, deleteEspecialidad } = useEspecialidadesStore();
  const { subespecialidades, addSubespecialidad, updateSubespecialidad, deleteSubespecialidad } = useSubespecialidadesStore();
  const { etapas, setEtapas } = usePipelineStore();
  const { categorias, addCategoria, updateCategoria, deleteCategoria } = useCategoriasStore();
  const { tipos: tiposCliente, addTipo, updateTipo, deleteTipo } = useTiposClienteStore();
  const { servicios: serviciosHospital, addServicio, updateServicio, deleteServicio } = useServiciosHospitalStore();
  const { driveUrl, saveDriveUrl } = useDriveStore();
  const canBackup = EMAILS_BACKUP.includes(user?.email);
  const TABS = canBackup ? [...TABS_BASE, 'Copia de seguridad'] : TABS_BASE;
  const [activeTab, setActiveTab] = useState(0);

  // Pipeline state — copia local editable, se guarda al pulsar "Guardar"
  const [etapasLocal, setEtapasLocal] = useState(etapas);

  // ── Especialidades CRUD state ──────────────────────────────────────────────
  const [editingEsp, setEditingEsp] = useState(null);
  const [editingEspValue, setEditingEspValue] = useState('');
  const [newEspValue, setNewEspValue] = useState('');
  const [addingEsp, setAddingEsp] = useState(false);
  const [delEsp, setDelEsp] = useState(null);
  const newEspRef = useRef(null);

  const startEdit = (nombre) => { setEditingEsp(nombre); setEditingEspValue(nombre); setAddingEsp(false); };
  const cancelEdit = () => { setEditingEsp(null); setEditingEspValue(''); };
  const confirmEdit = () => {
    const result = updateEspecialidad(editingEsp, editingEspValue);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success('Especialidad actualizada.');
    cancelEdit();
  };
  const startAdd = () => { setAddingEsp(true); setEditingEsp(null); setNewEspValue(''); setTimeout(() => newEspRef.current?.focus(), 50); };
  const confirmAdd = () => {
    const result = addEspecialidad(newEspValue);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success('Especialidad añadida.');
    setAddingEsp(false); setNewEspValue('');
  };
  const confirmDelete = () => { deleteEspecialidad(delEsp); toast.success(`"${delEsp}" eliminada.`); setDelEsp(null); };

  // ── Subespecialidades Fisioterapia CRUD state ─────────────────────────────
  const [editingSubesp, setEditingSubesp] = useState(null);
  const [editingSubespValue, setEditingSubespValue] = useState('');
  const [newSubespValue, setNewSubespValue] = useState('');
  const [addingSubesp, setAddingSubesp] = useState(false);
  const [delSubesp, setDelSubesp] = useState(null);
  const newSubespRef = useRef(null);

  const startEditSubesp = (n) => { setEditingSubesp(n); setEditingSubespValue(n); setAddingSubesp(false); };
  const cancelEditSubesp = () => { setEditingSubesp(null); setEditingSubespValue(''); };
  const confirmEditSubesp = () => {
    const result = updateSubespecialidad(editingSubesp, editingSubespValue);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success('Subespecialidad actualizada.');
    cancelEditSubesp();
  };
  const startAddSubesp = () => { setAddingSubesp(true); setEditingSubesp(null); setNewSubespValue(''); setTimeout(() => newSubespRef.current?.focus(), 50); };
  const confirmAddSubesp = () => {
    const result = addSubespecialidad(newSubespValue);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success('Subespecialidad añadida.');
    setAddingSubesp(false); setNewSubespValue('');
  };
  const confirmDeleteSubesp = () => { deleteSubespecialidad(delSubesp); toast.success(`"${delSubesp}" eliminada.`); setDelSubesp(null); };

  // ── Categorías de equipos CRUD state ──────────────────────────────────────
  const [editingCat, setEditingCat] = useState(null);
  const [editingCatValue, setEditingCatValue] = useState('');
  const [newCatValue, setNewCatValue] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [delCat, setDelCat] = useState(null);
  const newCatRef = useRef(null);

  const startEditCat = (nombre) => { setEditingCat(nombre); setEditingCatValue(nombre); setAddingCat(false); };
  const cancelEditCat = () => { setEditingCat(null); setEditingCatValue(''); };
  const confirmEditCat = () => {
    const result = updateCategoria(editingCat, editingCatValue);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success('Categoría actualizada.');
    cancelEditCat();
  };
  const startAddCat = () => { setAddingCat(true); setEditingCat(null); setNewCatValue(''); setTimeout(() => newCatRef.current?.focus(), 50); };
  const confirmAddCat = () => {
    const result = addCategoria(newCatValue);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success('Categoría añadida.');
    setAddingCat(false); setNewCatValue('');
  };
  const confirmDeleteCat = () => { deleteCategoria(delCat); toast.success(`"${delCat}" eliminada.`); setDelCat(null); };

  // ── Tipos de cliente CRUD state ───────────────────────────────────────────
  const [editingTipo, setEditingTipo] = useState(null);
  const [editingTipoValue, setEditingTipoValue] = useState('');
  const [newTipoValue, setNewTipoValue] = useState('');
  const [addingTipo, setAddingTipo] = useState(false);
  const [delTipo, setDelTipo] = useState(null);
  const newTipoRef = useRef(null);

  const startEditTipo = (n) => { setEditingTipo(n); setEditingTipoValue(n); setAddingTipo(false); };
  const cancelEditTipo = () => { setEditingTipo(null); setEditingTipoValue(''); };
  const confirmEditTipo = () => {
    const result = updateTipo(editingTipo, editingTipoValue);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success('Tipo actualizado.');
    cancelEditTipo();
  };
  const startAddTipo = () => { setAddingTipo(true); setEditingTipo(null); setNewTipoValue(''); setTimeout(() => newTipoRef.current?.focus(), 50); };
  const confirmAddTipo = () => {
    const result = addTipo(newTipoValue);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success('Tipo añadido.');
    setAddingTipo(false); setNewTipoValue('');
  };
  const confirmDeleteTipo = () => { deleteTipo(delTipo); toast.success(`"${delTipo}" eliminado.`); setDelTipo(null); };

  // ── Servicios hospitalarios CRUD state ────────────────────────────────────
  const [editingServ, setEditingServ] = useState(null);
  const [editingServValue, setEditingServValue] = useState('');
  const [newServValue, setNewServValue] = useState('');
  const [addingServ, setAddingServ] = useState(false);
  const [delServ, setDelServ] = useState(null);
  const newServRef = useRef(null);

  const startEditServ = (n) => { setEditingServ(n); setEditingServValue(n); setAddingServ(false); };
  const cancelEditServ = () => { setEditingServ(null); setEditingServValue(''); };
  const confirmEditServ = () => {
    const result = updateServicio(editingServ, editingServValue);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success('Servicio actualizado.');
    cancelEditServ();
  };
  const startAddServ = () => { setAddingServ(true); setEditingServ(null); setNewServValue(''); setTimeout(() => newServRef.current?.focus(), 50); };
  const confirmAddServ = () => {
    const result = addServicio(newServValue);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success('Servicio añadido.');
    setAddingServ(false); setNewServValue('');
  };
  const confirmDeleteServ = () => { deleteServicio(delServ); toast.success(`"${delServ}" eliminado.`); setDelServ(null); };

  const [driveInput, setDriveInput] = useState(driveUrl);

  const handleSaveDrive = async () => {
    await saveDriveUrl(driveInput);
    toast.success('Enlace de Google Drive guardado.');
  };

  const [empresa, setEmpresa] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sanicom_empresa')) || EMPRESA_INIT; } catch { return EMPRESA_INIT; }
  });
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '', currentPass: '', newPass: '' });
  const [usersState, setUsersState] = useState(users);

  const saveEmpresa = () => {
    localStorage.setItem('sanicom_empresa', JSON.stringify(empresa));
    toast.success('Datos de empresa guardados.');
  };

  const saveProfile = () => toast.success('Perfil actualizado (demo).');

  const toggleUser = (id) => {
    setUsersState(u => u.map(usr => usr.id === id ? { ...usr, active: !usr.active } : usr));
    toast.success('Estado actualizado.');
  };

  const changeRole = (id, role) => {
    setUsersState(u => u.map(usr => usr.id === id ? { ...usr, role } : usr));
    toast.success('Rol actualizado.');
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t, i) => (
            <button key={i} onClick={() => { setActiveTab(i); if (i === 3) setEtapasLocal(etapas); }}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap cursor-pointer border-b-2 -mb-px transition-colors
                ${activeTab === i ? 'border-[#1B4F8A] text-[#1B4F8A]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 0 && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4">Usuarios del sistema</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Nombre', 'Email', 'Rol', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usersState.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      {user?.role === 'Administración' ? (
                        <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                          className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none">
                          {ROLES.map(r => <option key={r}>{r}</option>)}
                        </select>
                      ) : <span className="text-xs">{u.role}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={u.active ? 'green' : 'gray'}>{u.active ? 'Activo' : 'Inactivo'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleUser(u.id)} className="text-xs text-blue-600 hover:underline cursor-pointer mr-2">
                        {u.active ? 'Desactivar' : 'Activar'}
                      </button>
                      <button onClick={() => toast.success('Contraseña reseteada (demo).')} className="text-xs text-gray-500 hover:underline cursor-pointer">
                        Reset pass
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 1 && (
        <Card className="max-w-lg">
          <h3 className="font-semibold text-gray-800 mb-4">Mi perfil</h3>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-[#3ABDD5] flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{user?.name?.charAt(0)}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-800">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.role}</p>
              <button className="text-xs text-blue-600 mt-1 cursor-pointer hover:underline">Cambiar foto</button>
            </div>
          </div>
          <div className="space-y-4">
            {[['Nombre', 'name'], ['Email', 'email']].map(([label, key]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input value={profileForm[key]} onChange={e => setProfileForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña actual</label>
              <input type="password" value={profileForm.currentPass} onChange={e => setProfileForm(f => ({ ...f, currentPass: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nueva contraseña</label>
              <input type="password" value={profileForm.newPass} onChange={e => setProfileForm(f => ({ ...f, newPass: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
            </div>
            <Button onClick={saveProfile}>Guardar perfil</Button>
          </div>
        </Card>
      )}

      {activeTab === 2 && (
        <Card className="max-w-lg">
          <h3 className="font-semibold text-gray-800 mb-4">Datos de empresa</h3>
          <div className="space-y-4">
            {[['Nombre empresa', 'nombre'], ['CIF', 'cif'], ['Dirección', 'direccion'], ['Teléfono', 'telefono']].map(([label, key]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input value={empresa[key] || ''} onChange={e => setEmpresa(emp => ({ ...emp, [key]: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
              </div>
            ))}
            <Button onClick={saveEmpresa}>Guardar datos</Button>
          </div>
        </Card>
      )}

      {activeTab === 3 && (
        <Card className="max-w-lg">
          <h3 className="font-semibold text-gray-800 mb-1">Etapas del pipeline</h3>
          <p className="text-xs text-gray-400 mb-4">Los cambios se reflejan en el Kanban, formularios y filtros al guardar.</p>
          <div className="space-y-2">
            {etapasLocal.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="w-6 h-6 rounded-full bg-white border border-gray-200 text-xs flex items-center justify-center text-gray-500 font-medium flex-shrink-0">{i + 1}</span>
                <input
                  value={s}
                  onChange={e => setEtapasLocal(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                />
              </div>
            ))}
          </div>
          <Button className="mt-4" onClick={() => { setEtapas(etapasLocal); toast.success('Etapas guardadas correctamente.'); }}>
            Guardar etapas
          </Button>
        </Card>
      )}

      {activeTab === 4 && (
        <Card className="max-w-lg">
          <h3 className="font-semibold text-gray-800 mb-4">Tipos de servicio técnico</h3>
          <div className="space-y-2">
            {['Mantenimiento preventivo', 'Reparación correctiva', 'Instalación', 'Calibración/Verificación', 'Garantía', 'Asesoramiento técnico'].map((t, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input defaultValue={t} className="flex-1 bg-transparent text-sm focus:outline-none" />
              </div>
            ))}
          </div>
          <Button className="mt-4" onClick={() => toast.success('Tipos guardados (demo).')}>Guardar tipos</Button>
        </Card>
      )}

      {activeTab === 5 && (
        <>
        <Card className="max-w-xl">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-800">Especialidades médicas</h3>
              <p className="text-xs text-gray-400 mt-0.5">{especialidades.length} especialidades · Se sincronizan con el formulario de clientes</p>
            </div>
            <Button size="sm" onClick={startAdd} disabled={addingEsp}>
              <Plus className="w-4 h-4" />Nueva especialidad
            </Button>
          </div>

          <div className="space-y-1">
            {especialidades.map((esp) => (
              <div key={esp} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg group transition-colors ${editingEsp === esp ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}>
                {editingEsp === esp ? (
                  <>
                    <input
                      autoFocus
                      value={editingEspValue}
                      onChange={e => setEditingEspValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') cancelEdit(); }}
                      className="flex-1 text-sm px-2 py-1 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button onClick={confirmEdit} className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer" title="Guardar">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={cancelEdit} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 cursor-pointer" title="Cancelar">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-gray-700">{esp}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(esp)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer" title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDelEsp(esp)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {addingEsp && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-50 border border-green-200 mt-1">
                <input
                  ref={newEspRef}
                  value={newEspValue}
                  onChange={e => setNewEspValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmAdd(); if (e.key === 'Escape') { setAddingEsp(false); setNewEspValue(''); } }}
                  placeholder="Nombre de la especialidad..."
                  className="flex-1 text-sm px-2 py-1 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 bg-white"
                />
                <button onClick={confirmAdd} className="p-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 cursor-pointer" title="Añadir">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setAddingEsp(false); setNewEspValue(''); }} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 cursor-pointer" title="Cancelar">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {especialidades.length === 0 && !addingEsp && (
              <p className="text-sm text-gray-400 text-center py-6">No hay especialidades. Añade la primera.</p>
            )}
          </div>

          {/* Subespecialidades de Fisioterapia */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-700">Subespecialidades de Fisioterapia</h4>
                <p className="text-xs text-gray-400 mt-0.5">{subespecialidades.length} opciones · Aparecen en el formulario de clientes al seleccionar Fisioterapia</p>
              </div>
              <Button size="sm" variant="outline" onClick={startAddSubesp} disabled={addingSubesp}>
                <Plus className="w-4 h-4" />Añadir
              </Button>
            </div>

            <div className="space-y-1">
              {subespecialidades.map((s) => (
                <div key={s} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg group transition-colors ${editingSubesp === s ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}>
                  {editingSubesp === s ? (
                    <>
                      <input
                        autoFocus
                        value={editingSubespValue}
                        onChange={e => setEditingSubespValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') confirmEditSubesp(); if (e.key === 'Escape') cancelEditSubesp(); }}
                        className="flex-1 text-sm px-2 py-1 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <button onClick={confirmEditSubesp} className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer" title="Guardar"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={cancelEditSubesp} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 cursor-pointer" title="Cancelar"><X className="w-3.5 h-3.5" /></button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-gray-700">{s}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEditSubesp(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDelSubesp(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {addingSubesp && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-50 border border-green-200 mt-1">
                  <input
                    ref={newSubespRef}
                    value={newSubespValue}
                    onChange={e => setNewSubespValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') confirmAddSubesp(); if (e.key === 'Escape') { setAddingSubesp(false); setNewSubespValue(''); } }}
                    placeholder="Nombre de la subespecialidad..."
                    className="flex-1 text-sm px-2 py-1 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 bg-white"
                  />
                  <button onClick={confirmAddSubesp} className="p-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 cursor-pointer" title="Añadir"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { setAddingSubesp(false); setNewSubespValue(''); }} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 cursor-pointer" title="Cancelar"><X className="w-3.5 h-3.5" /></button>
                </div>
              )}

              {subespecialidades.length === 0 && !addingSubesp && (
                <p className="text-sm text-gray-400 text-center py-4">No hay subespecialidades. Añade la primera.</p>
              )}
            </div>
          </div>
        </Card>

        <ConfirmDialog
          open={!!delSubesp}
          onClose={() => setDelSubesp(null)}
          onConfirm={confirmDeleteSubesp}
          title="Eliminar subespecialidad"
          message={`¿Eliminar "${delSubesp}"? Los clientes que la tengan asignada no se verán afectados.`}
          confirmText="Eliminar"
        />
        </>
      )}

      {activeTab === 6 && (
        <Card className="max-w-xl">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-800">Categorías de equipos</h3>
              <p className="text-xs text-gray-400 mt-0.5">{categorias.length} categorías · Se sincronizan con el formulario de equipos</p>
            </div>
            <Button size="sm" onClick={startAddCat} disabled={addingCat}>
              <Plus className="w-4 h-4" />Nueva categoría
            </Button>
          </div>

          <div className="space-y-1">
            {categorias.map((cat) => (
              <div key={cat} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg group transition-colors ${editingCat === cat ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}>
                {editingCat === cat ? (
                  <>
                    <input
                      autoFocus
                      value={editingCatValue}
                      onChange={e => setEditingCatValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') confirmEditCat(); if (e.key === 'Escape') cancelEditCat(); }}
                      className="flex-1 text-sm px-2 py-1 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button onClick={confirmEditCat} className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer" title="Guardar">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={cancelEditCat} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 cursor-pointer" title="Cancelar">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-gray-700">{cat}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEditCat(cat)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer" title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDelCat(cat)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {addingCat && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-50 border border-green-200 mt-1">
                <input
                  ref={newCatRef}
                  value={newCatValue}
                  onChange={e => setNewCatValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmAddCat(); if (e.key === 'Escape') { setAddingCat(false); setNewCatValue(''); } }}
                  placeholder="Nombre de la categoría..."
                  className="flex-1 text-sm px-2 py-1 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 bg-white"
                />
                <button onClick={confirmAddCat} className="p-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 cursor-pointer" title="Añadir">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setAddingCat(false); setNewCatValue(''); }} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 cursor-pointer" title="Cancelar">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {categorias.length === 0 && !addingCat && (
              <p className="text-sm text-gray-400 text-center py-6">No hay categorías. Añade la primera.</p>
            )}
          </div>
        </Card>
      )}

      {activeTab === 7 && (
        <>
        <Card className="max-w-xl">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-800">Tipos de cliente</h3>
              <p className="text-xs text-gray-400 mt-0.5">{tiposCliente.length} tipos · Se sincronizan con el formulario de clientes</p>
            </div>
            <Button size="sm" onClick={startAddTipo} disabled={addingTipo}>
              <Plus className="w-4 h-4" />Nuevo tipo
            </Button>
          </div>

          <div className="space-y-1">
            {tiposCliente.map((tipo) => (
              <div key={tipo} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg group transition-colors ${editingTipo === tipo ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}>
                {editingTipo === tipo ? (
                  <>
                    <input
                      autoFocus
                      value={editingTipoValue}
                      onChange={e => setEditingTipoValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') confirmEditTipo(); if (e.key === 'Escape') cancelEditTipo(); }}
                      className="flex-1 text-sm px-2 py-1 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button onClick={confirmEditTipo} className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer" title="Guardar">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={cancelEditTipo} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 cursor-pointer" title="Cancelar">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-gray-700">{tipo}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEditTipo(tipo)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer" title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDelTipo(tipo)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {addingTipo && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-50 border border-green-200 mt-1">
                <input
                  ref={newTipoRef}
                  value={newTipoValue}
                  onChange={e => setNewTipoValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmAddTipo(); if (e.key === 'Escape') { setAddingTipo(false); setNewTipoValue(''); } }}
                  placeholder="Nombre del tipo..."
                  className="flex-1 text-sm px-2 py-1 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 bg-white"
                />
                <button onClick={confirmAddTipo} className="p-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 cursor-pointer" title="Añadir">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setAddingTipo(false); setNewTipoValue(''); }} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 cursor-pointer" title="Cancelar">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {tiposCliente.length === 0 && !addingTipo && (
              <p className="text-sm text-gray-400 text-center py-6">No hay tipos. Añade el primero.</p>
            )}
          </div>
        </Card>

        <ConfirmDialog
          open={!!delTipo}
          onClose={() => setDelTipo(null)}
          onConfirm={confirmDeleteTipo}
          title="Eliminar tipo de cliente"
          message={`¿Eliminar "${delTipo}"? Los clientes que ya tengan este tipo asignado no se verán afectados, pero no podrá seleccionarse en nuevos registros.`}
          confirmText="Eliminar"
        />
        </>
      )}

      {activeTab === 8 && (
        <>
        <Card className="max-w-xl">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-800">Servicios hospitalarios</h3>
              <p className="text-xs text-gray-400 mt-0.5">{serviciosHospital.length} servicios · Se sincronizan con el formulario de clientes tipo Hospital público</p>
            </div>
            <Button size="sm" onClick={startAddServ} disabled={addingServ}>
              <Plus className="w-4 h-4" />Nuevo servicio
            </Button>
          </div>

          <div className="space-y-1">
            {serviciosHospital.map((serv) => (
              <div key={serv} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg group transition-colors ${editingServ === serv ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}>
                {editingServ === serv ? (
                  <>
                    <input
                      autoFocus
                      value={editingServValue}
                      onChange={e => setEditingServValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') confirmEditServ(); if (e.key === 'Escape') cancelEditServ(); }}
                      className="flex-1 text-sm px-2 py-1 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button onClick={confirmEditServ} className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer" title="Guardar">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={cancelEditServ} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 cursor-pointer" title="Cancelar">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-gray-700">{serv}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEditServ(serv)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer" title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDelServ(serv)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {addingServ && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-50 border border-green-200 mt-1">
                <input
                  ref={newServRef}
                  value={newServValue}
                  onChange={e => setNewServValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmAddServ(); if (e.key === 'Escape') { setAddingServ(false); setNewServValue(''); } }}
                  placeholder="Nombre del servicio..."
                  className="flex-1 text-sm px-2 py-1 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 bg-white"
                />
                <button onClick={confirmAddServ} className="p-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 cursor-pointer" title="Añadir">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setAddingServ(false); setNewServValue(''); }} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 cursor-pointer" title="Cancelar">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {serviciosHospital.length === 0 && !addingServ && (
              <p className="text-sm text-gray-400 text-center py-6">No hay servicios. Añade el primero.</p>
            )}
          </div>
        </Card>

        <ConfirmDialog
          open={!!delServ}
          onClose={() => setDelServ(null)}
          onConfirm={confirmDeleteServ}
          title="Eliminar servicio hospitalario"
          message={`¿Eliminar "${delServ}"? Los clientes que ya tengan este servicio asignado no se verán afectados, pero no podrá seleccionarse en nuevos registros.`}
          confirmText="Eliminar"
        />
        </>
      )}

      <ConfirmDialog
        open={!!delEsp}
        onClose={() => setDelEsp(null)}
        onConfirm={confirmDelete}
        title="Eliminar especialidad"
        message={`¿Eliminar "${delEsp}"? Los clientes que ya tengan esta especialidad asignada no se verán afectados, pero no podrá seleccionarse en nuevos registros.`}
        confirmText="Eliminar"
      />
      <ConfirmDialog
        open={!!delCat}
        onClose={() => setDelCat(null)}
        onConfirm={confirmDeleteCat}
        title="Eliminar categoría"
        message={`¿Eliminar "${delCat}"? Los equipos que ya tengan esta categoría asignada no se verán afectados, pero no podrá seleccionarse en nuevos registros.`}
        confirmText="Eliminar"
      />

      {activeTab === 9 && (
        <Card className="max-w-lg">
          <h3 className="font-semibold text-gray-800 mb-1">Enlace Google Drive</h3>
          <p className="text-xs text-gray-400 mb-5">Este enlace aparece en el módulo Documentos como botón de acceso directo para todos los usuarios.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">URL de Google Drive</label>
              <input
                value={driveInput}
                onChange={e => setDriveInput(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>
            <Button onClick={handleSaveDrive}>Guardar enlace</Button>
          </div>
        </Card>
      )}

      {activeTab === TABS.indexOf('Copia de seguridad') && canBackup && <CopiaSeguridad />}
    </div>
  );
}
