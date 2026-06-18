import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { useNotificacionesStore } from './store/notificacionesStore';
import { useClientesStore } from './store/clientesStore';
import { useEquiposStore } from './store/equiposStore';
import { useOportunidadesStore } from './store/oportunidadesStore';
import { useDemosStore } from './store/demosStore';
import { useServicioStore } from './store/servicioStore';
import { useAgendaStore } from './store/agendaStore';
import { useActividadStore } from './store/actividadStore';
import { useEspecialidadesStore } from './store/especialidadesStore';
import { useSubespecialidadesStore } from './store/subespecialidadesStore';
import { useCategoriasStore } from './store/categoriasStore';
import { useTiposClienteStore } from './store/tiposClienteStore';
import { useServiciosHospitalStore } from './store/serviciosHospitalStore';
import { usePipelineStore } from './store/pipelineStore';
import Layout from './components/layout/Layout';
import LoginPage from './modules/auth/LoginPage';
import NoAccess from './modules/auth/NoAccess';
import DashboardPage from './modules/dashboard/DashboardPage';
import ClientesPage from './modules/clientes/ClientesPage';
import ClienteDetail from './modules/clientes/ClienteDetail';
import AgendaPage from './modules/agenda/AgendaPage';
import PipelinePage from './modules/pipeline/PipelinePage';
import DemostracionesPage from './modules/demostraciones/DemostracionesPage';
import ServicioTecnicoPage from './modules/servicio-tecnico/ServicioTecnicoPage';
import EquiposPage from './modules/equipos/EquiposPage';
import ConfiguracionPage from './modules/configuracion/ConfiguracionPage';
import NotificacionesPage from './modules/notificaciones/NotificacionesPage';

function ProtectedRoute({ children, module }) {
  const { user, canAccess } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (module && !canAccess(module)) return <NoAccess />;
  return children;
}

function AppInit() {
  const { user } = useAuthStore();
  const initNotificaciones = useNotificacionesStore(s => s.init);
  const initClientes      = useClientesStore(s => s.initialize);
  const initEquipos       = useEquiposStore(s => s.initialize);
  const initOportunidades = useOportunidadesStore(s => s.initialize);
  const initDemos         = useDemosStore(s => s.initialize);
  const initServicios     = useServicioStore(s => s.initialize);
  const initAgenda        = useAgendaStore(s => s.initialize);
  const initActividad     = useActividadStore(s => s.initialize);
  const initEspecialidades = useEspecialidadesStore(s => s.initialize);
  const initSubespecialidades = useSubespecialidadesStore(s => s.initialize);
  const initCategorias    = useCategoriasStore(s => s.initialize);
  const initTiposCliente  = useTiposClienteStore(s => s.initialize);
  const initServiciosHospital = useServiciosHospitalStore(s => s.initialize);
  const initPipeline      = usePipelineStore(s => s.initialize);

  useEffect(() => {
    if (!user?.id) return;
    initNotificaciones(user.id);
    Promise.all([
      initClientes(), initEquipos(), initOportunidades(), initDemos(),
      initServicios(), initAgenda(), initActividad(),
      initEspecialidades(), initSubespecialidades(), initCategorias(), initTiposCliente(), initServiciosHospital(), initPipeline(),
    ]).catch(e => console.error('[AppInit]', e));
  }, [user?.id]);

  return null;
}

export default function App() {
  const { user } = useAuthStore();

  return (
    <BrowserRouter>
      <AppInit />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: '10px', fontFamily: 'Inter, sans-serif', fontSize: '14px' },
          success: { iconTheme: { primary: '#22C55E', secondary: '#fff' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/clientes" element={<ProtectedRoute module="clientes"><ClientesPage /></ProtectedRoute>} />
          <Route path="/clientes/:id" element={<ProtectedRoute module="clientes"><ClienteDetail /></ProtectedRoute>} />
          <Route path="/agenda" element={<ProtectedRoute module="agenda"><AgendaPage /></ProtectedRoute>} />
          <Route path="/pipeline" element={<ProtectedRoute module="pipeline"><PipelinePage /></ProtectedRoute>} />
          <Route path="/demostraciones" element={<ProtectedRoute module="demostraciones"><DemostracionesPage /></ProtectedRoute>} />
          <Route path="/servicio-tecnico" element={<ProtectedRoute module="servicio-tecnico"><ServicioTecnicoPage /></ProtectedRoute>} />
          <Route path="/equipos" element={<ProtectedRoute module="equipos"><EquiposPage /></ProtectedRoute>} />
          <Route path="/configuracion" element={<ProtectedRoute module="configuracion"><ConfiguracionPage /></ProtectedRoute>} />
          <Route path="/notificaciones" element={<NotificacionesPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
