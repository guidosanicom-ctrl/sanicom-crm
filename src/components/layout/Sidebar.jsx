import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard, Users, Calendar, TrendingUp, PlaySquare,
  Wrench, Package, FolderOpen, Settings, LogOut, X
} from 'lucide-react';
import logo from '../../assets/sanicom_logo.png';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Panel de control', icon: LayoutDashboard, module: 'dashboard' },
  { path: '/clientes', label: 'Clientes', icon: Users, module: 'clientes' },
  { path: '/agenda', label: 'Agenda', icon: Calendar, module: 'agenda' },
  { path: '/pipeline', label: 'Oportunidades', icon: TrendingUp, module: 'pipeline' },
  { path: '/demostraciones', label: 'Demostraciones', icon: PlaySquare, module: 'demostraciones' },
  { path: '/servicio-tecnico', label: 'Servicio Técnico', icon: Wrench, module: 'servicio-tecnico' },
  { path: '/equipos', label: 'Equipos en stock', icon: Package, module: 'equipos' },
  { path: '/documentos', label: 'Documentos', icon: FolderOpen, module: null },
  { path: '/configuracion', label: 'Configuración', icon: Settings, module: 'configuracion' },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout, canAccess } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />}

      <aside className={`fixed top-0 left-0 h-screen w-64 bg-[#1B4F8A] flex flex-col z-40 transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="flex items-center">
            <img src={logo} alt="Sanicom Medical Systems" className="h-10 w-auto brightness-0 invert" />
          </div>
          <button onClick={onClose} className="lg:hidden text-white/70 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider px-3 mb-2">Menú principal</p>
          {NAV_ITEMS.map(({ path, label, icon: Icon, module }) => {
            const accessible = canAccess(module);
            return (
              <NavLink
                key={path}
                to={accessible ? path : '#'}
                onClick={e => { if (!accessible) e.preventDefault(); else onClose?.(); }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-all
                  ${!accessible ? 'opacity-40 cursor-not-allowed text-white/60' :
                    isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {label}
              </NavLink>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#3ABDD5] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{user?.name?.charAt(0)}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-white/50 text-xs truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
