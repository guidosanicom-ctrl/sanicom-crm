import { generateId } from './formatters';

const SKIP = new Set([
  'id', 'historial', 'fechaCreacion', 'fechaUltimaActualizacion',
  'acciones', 'adjuntos', 'numero',
]);

export const FIELD_LABELS = {
  // Común
  estado: 'Estado',
  clienteId: 'Cliente',
  equipoId: 'Equipo',
  responsable: 'Responsable',
  descripcion: 'Descripción',
  // Oportunidades
  nombre: 'Nombre',
  valor: 'Valor (€)',
  probabilidad: 'Probabilidad (%)',
  etapa: 'Etapa',
  fechaCierre: 'Fecha de cierre',
  origen: 'Origen',
  equipos: 'Equipos de interés',
  // Servicio Técnico
  tipo: 'Tipo de servicio',
  prioridad: 'Prioridad',
  fechaProgramada: 'Fecha programada',
  tecnico: 'Técnico',
  nSerie: 'Nº de serie',
  resultado: 'Resultado',
  confirmacionCliente: 'Confirmación cliente',
  materiales: 'Materiales/repuestos',
  // Seguimiento comercial (Oportunidades)
  estadoCliente: 'Estado del cliente',
  financiacion: 'Financiación',
  temperatura: 'Temperatura',
  notaSeguimiento: 'Nota de seguimiento',
  // Demos
  contactoId: 'Contacto',
  fecha: 'Fecha',
  hora: 'Hora',
  lugar: 'Lugar',
  direccion: 'Dirección/Link',
  objetivo: 'Objetivo',
  observaciones: 'Observaciones',
  generarOportunidad: 'Generar oportunidad',
};

function toStr(campo, value) {
  if (value === null || value === undefined || value === '') return '';
  if (Array.isArray(value)) return value.join('|');
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

export function buildAuditEntries(before, after, user) {
  const entries = [];
  const now = new Date().toISOString();
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if (SKIP.has(key)) continue;
    if (toStr(key, before[key]) === toStr(key, after[key])) continue;
    entries.push({
      id: generateId(),
      userId: user.id,
      userName: user.name,
      campo: key,
      valorAnterior: before[key] ?? null,
      valorNuevo: after[key] ?? null,
      fechaHora: now,
    });
  }
  return entries;
}

export function createEntry(action, user) {
  return {
    id: generateId(),
    userId: user.id,
    userName: user.name,
    campo: '_accion',
    valorAnterior: null,
    valorNuevo: action,
    fechaHora: new Date().toISOString(),
  };
}
