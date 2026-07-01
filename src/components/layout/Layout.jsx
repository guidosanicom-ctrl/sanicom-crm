import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useLlamadaScheduler } from '../../hooks/useLlamadaScheduler';

const TITLES = {
  '/dashboard': 'Panel de control',
  '/clientes': 'Clientes',
  '/agenda': 'Agenda / Calendario',
  '/pipeline': 'Pipeline de Oportunidades',
  '/demostraciones': 'Demostraciones',
  '/servicio-tecnico': 'Servicio Técnico',
  '/equipos': 'Equipos en stock',
  '/cursos': 'Cursos Formativos',
  '/documentos': 'Documentos',
  '/configuracion': 'Configuración',
  '/notificaciones': 'Notificaciones',
};

function NotifPermissionBanner() {
  const { notifPermission, isJavier } = useLlamadaScheduler();
  const [dismissed, setDismissed] = useState(false);

  if (!isJavier || dismissed || notifPermission === 'granted' || notifPermission === 'unsupported') return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <span className="text-amber-800">
        {notifPermission === 'denied'
          ? '🔕 Las notificaciones del navegador están bloqueadas. Actívalas en la configuración del navegador para recibir avisos de llamadas.'
          : '🔔 Activa las notificaciones del navegador para recibir avisos de llamadas a la hora exacta.'}
      </span>
      {notifPermission !== 'denied' && (
        <button
          onClick={() => Notification.requestPermission()}
          className="flex-shrink-0 text-xs font-medium px-3 py-1 rounded-lg bg-amber-200 text-amber-900 hover:bg-amber-300 transition-colors cursor-pointer"
        >
          Activar
        </button>
      )}
      <button onClick={() => setDismissed(true)} className="flex-shrink-0 text-amber-500 hover:text-amber-700 text-lg leading-none cursor-pointer">×</button>
    </div>
  );
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const base = '/' + location.pathname.split('/')[1];
  const title = TITLES[base] || 'Sanicom CRM';

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} title={title} />
        <NotifPermissionBanner />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
