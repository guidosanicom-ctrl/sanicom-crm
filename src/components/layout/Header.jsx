import { Menu, Bell, LogOut } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificacionesStore } from '../../store/notificacionesStore';
import { useAuthStore } from '../../store/authStore';
import UserAvatar from '../ui/UserAvatar';
import { formatDateTime } from '../../utils/formatters';

export default function Header({ onMenuClick, title }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { notificaciones, markRead, markAllRead, unreadCount } = useNotificacionesStore();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const ref = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShowNotifs(false);
      if (userRef.current && !userRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const count = unreadCount();
  const recent = notificaciones.slice(0, 8);

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 cursor-pointer">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Avatar con logout — solo móvil */}
        <div className="relative lg:hidden" ref={userRef}>
          <button onClick={() => setShowUserMenu(v => !v)} className="cursor-pointer">
            <UserAvatar user={user} size="sm" />
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-11 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 text-sm font-medium cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3" ref={ref}>
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <Bell className="w-5 h-5" />
            {count > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-gray-800 text-sm">Notificaciones</span>
                {count > 0 && (
                  <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline cursor-pointer">
                    Marcar todas leídas
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {recent.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Sin notificaciones</p>
                ) : recent.map(n => (
                  <div
                    key={n.id}
                    onClick={() => {
                      markRead(n.id);
                      setShowNotifs(false);
                      if (n.enlace) {
                        const url = n.registroId ? `${n.enlace}?openId=${n.registroId}` : n.enlace;
                        navigate(url);
                      }
                    }}
                    className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.leida ? 'bg-blue-50' : ''}`}
                  >
                    <p className={`text-xs ${!n.leida ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{n.mensaje}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(n.fechaHora)}</p>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-gray-100">
                <button
                  onClick={() => { setShowNotifs(false); navigate('/notificaciones'); }}
                  className="text-xs text-blue-600 hover:underline w-full text-center cursor-pointer"
                >
                  Ver todas
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </header>
  );
}
