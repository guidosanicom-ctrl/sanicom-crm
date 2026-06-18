import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuthStore } from '../../store/authStore';
import { useNotificacionesStore } from '../../store/notificacionesStore';

const TITLES = {
  '/dashboard': 'Dashboard',
  '/clientes': 'Clientes',
  '/agenda': 'Agenda / Calendario',
  '/pipeline': 'Pipeline de Oportunidades',
  '/demostraciones': 'Demostraciones',
  '/servicio-tecnico': 'Servicio Técnico',
  '/equipos': 'Equipos',
  '/configuracion': 'Configuración',
  '/notificaciones': 'Notificaciones',
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const user = useAuthStore(s => s.user);
  const initNotificaciones = useNotificacionesStore(s => s.init);

  useEffect(() => {
    if (user?.id) initNotificaciones(user.id);
  }, [user?.id]);
  const base = '/' + location.pathname.split('/')[1];
  const title = TITLES[base] || 'Sanicom CRM';

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
