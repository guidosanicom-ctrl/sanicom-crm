import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';
import { ROLES } from '../../utils/constants';

const TABS = ['Usuarios', 'Mi perfil', 'Empresa', 'Pipeline', 'Servicios'];

const EMPRESA_INIT = { nombre: 'Sanicom S.L.', cif: 'B12345678', direccion: 'C/ Ejemplo, 1, Sevilla', telefono: '954 000 000' };

export default function ConfiguracionPage() {
  const { user, users } = useAuthStore();
  const [activeTab, setActiveTab] = useState(0);
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
            <button key={i} onClick={() => setActiveTab(i)}
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
          <h3 className="font-semibold text-gray-800 mb-4">Etapas del pipeline</h3>
          <div className="space-y-2">
            {['Prospecto', 'Cualificado', 'Propuesta enviada', 'Negociación', 'Ganado', 'Perdido'].map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="w-6 h-6 rounded-full bg-white border border-gray-200 text-xs flex items-center justify-center text-gray-500 font-medium">{i + 1}</span>
                <input defaultValue={s} className="flex-1 bg-transparent text-sm focus:outline-none" />
              </div>
            ))}
          </div>
          <Button className="mt-4" onClick={() => toast.success('Etapas guardadas (demo).')}>Guardar etapas</Button>
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
    </div>
  );
}
