import PresupuestosTab from '../servicio-tecnico/PresupuestosTab';

// Presupuestos del CRM para todos los usuarios. Cada comercial ve los suyos y
// solo puede elegir artículos de STEL de su área (ver stelCatalogoStore).
export default function PresupuestosPage() {
  return <PresupuestosTab />;
}
