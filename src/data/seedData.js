export const USERS = [
  { id: 'u1', name: 'Julieta Govantes', email: 'administracion@sanicom.es', password: 'sanicom2024', role: 'Administración', active: true, avatar: '👩', avatarBg: '#7C3AED' },
  { id: 'u2', name: 'Javier Govantes', email: 'jgovantes@sanicom.es', password: 'sanicom2024', role: 'Administración', active: true, avatar: '🧔', avatarBg: '#1B4F8A' },
  { id: 'u3', name: 'Carlos Leal', email: 'carlosleal@sanicom.es', password: 'sanicom2024', role: 'Comercial Restringido', active: true, avatar: '👨‍🦲', avatarBg: '#0F766E' },
  { id: 'u4', name: 'Guido Rosso', email: 'guidorosso@sanicom.es', password: 'sanicom2024', role: 'Administración', active: true, avatar: '👱', avatarBg: '#B45309' },
];

export const SEED_CLIENTS = [
  {
    id: 'c1',
    nombre: 'Hospital Virgen del Rocío',
    tipo: 'Hospital público',
    especialidad: 'Urgencias',
    cif: 'Q4118002B',
    direccion: 'Av. Manuel Siurot, s/n',
    ciudad: 'Sevilla',
    provincia: 'Sevilla',
    cp: '41013',
    telefono: '955 01 20 00',
    email: 'info@huvr.es',
    website: 'www.hospitalvirgendelrocio.es',
    estado: 'Activo',
    notas: 'Hospital de referencia en Andalucía.',
    lat: 37.3606,
    lng: -5.9853,
    fechaAlta: '2023-01-15',
    contactos: [
      { id: 'ct1', nombre: 'Dr. Ramón García', cargo: 'Jefe de Urgencias', telefono: '955012001', email: 'rgarcia@huvr.es' }
    ]
  },
  {
    id: 'c2',
    nombre: 'Clínica Quirón Málaga',
    tipo: 'Clínica',
    especialidad: 'Cardiología',
    cif: 'A28599033',
    direccion: 'C/ Severo Ochoa, 10',
    ciudad: 'Málaga',
    provincia: 'Málaga',
    cp: '29045',
    telefono: '951 450 000',
    email: 'info@quironmalaga.es',
    website: 'www.quironsalud.es',
    estado: 'Activo',
    notas: 'Clínica privada de alto nivel.',
    lat: 36.7213,
    lng: -4.4214,
    fechaAlta: '2023-03-10',
    contactos: [
      { id: 'ct2', nombre: 'Dra. Laura Martín', cargo: 'Directora Médica', telefono: '951450001', email: 'lmartin@quironmalaga.es' }
    ]
  },
  {
    id: 'c3',
    nombre: 'Centro de Salud Sur',
    tipo: 'Consultorio médico',
    especialidad: 'Medicina general',
    cif: 'Q1400104A',
    direccion: 'C/ Ronda de Tejares, 22',
    ciudad: 'Córdoba',
    provincia: 'Córdoba',
    cp: '14001',
    telefono: '957 01 44 00',
    email: 'cssur@juntadeandalucia.es',
    website: '',
    estado: 'Activo',
    notas: 'Centro de atención primaria.',
    lat: 37.8882,
    lng: -4.7794,
    fechaAlta: '2023-05-20',
    contactos: []
  },
  {
    id: 'c4',
    nombre: 'Consultoría Médica Granada',
    tipo: 'Clínica',
    especialidad: 'Neurología',
    cif: 'B18456789',
    direccion: 'C/ Gran Vía de Colón, 48',
    ciudad: 'Granada',
    provincia: 'Granada',
    cp: '18001',
    telefono: '958 22 11 00',
    email: 'info@cmgranada.es',
    website: 'www.cmgranada.es',
    estado: 'Activo',
    notas: '',
    lat: 37.1773,
    lng: -3.5986,
    fechaAlta: '2023-07-08',
    contactos: []
  },
  {
    id: 'c5',
    nombre: 'Residencia El Pinar',
    tipo: 'Residencia',
    especialidad: 'Geriatría',
    cif: 'B21098765',
    direccion: 'Av. de Andalucía, 55',
    ciudad: 'Huelva',
    provincia: 'Huelva',
    cp: '21004',
    telefono: '959 25 10 00',
    email: 'residencia@elpinar.es',
    website: '',
    estado: 'Activo',
    notas: 'Residencia de mayores con necesidades especiales de equipamiento.',
    lat: 37.2614,
    lng: -6.9447,
    fechaAlta: '2023-09-01',
    contactos: []
  },
];

export const SEED_EQUIPOS = [
  { id: 'e1', nombre: 'Ecógrafo Portátil', marca: 'SonoSite', modelo: 'M-Turbo', categoria: 'Diagnóstico por imagen', descripcion: 'Ecógrafo portátil de alta resolución para uso en urgencias y UCI.', precioVenta: 18500, precioCoste: 11000, estado: 'Activo', especialidades: ['Urgencias', 'UCI'] },
  { id: 'e2', nombre: 'Monitor Multiparamétrico', marca: 'Philips', modelo: 'IntelliVue MX40', categoria: 'Monitorización', descripcion: 'Monitor de paciente ambulatorio con telemetría.', precioVenta: 12800, precioCoste: 7500, estado: 'Activo', especialidades: ['Cardiología', 'UCI'] },
  { id: 'e3', nombre: 'Electrocardiógrafo 12 derivaciones', marca: 'Schiller', modelo: 'AT-102', categoria: 'Electromedicina', descripcion: 'ECG de 12 canales con interpretación automática.', precioVenta: 4200, precioCoste: 2400, estado: 'Activo', especialidades: ['Cardiología', 'Medicina general'] },
  { id: 'e4', nombre: 'Desfibrilador Semiautomático', marca: 'ZOLL', modelo: 'AED Plus', categoria: 'Electromedicina', descripcion: 'DEA con guía de RCP en tiempo real.', precioVenta: 2800, precioCoste: 1600, estado: 'Activo', especialidades: ['Urgencias'] },
  { id: 'e5', nombre: 'Autoclave de Vapor', marca: 'Tuttnauer', modelo: '3870 EAP', categoria: 'Esterilización', descripcion: 'Autoclave de gran capacidad con impresora integrada.', precioVenta: 9500, precioCoste: 5800, estado: 'Activo', especialidades: ['Cirugía', 'Laboratorio'] },
  { id: 'e6', nombre: 'Pulsioxímetro de Mesa', marca: 'Nonin', modelo: '9560 Onyx', categoria: 'Monitorización', descripcion: 'Pulsioxímetro de sobremesa con alarmas configurables.', precioVenta: 850, precioCoste: 450, estado: 'Activo', especialidades: ['Medicina general', 'Pediatría'] },
  { id: 'e7', nombre: 'Lámpara de Exploración LED', marca: 'Derungs', modelo: 'MINOR 1', categoria: 'Mobiliario clínico', descripcion: 'Lámpara LED de exploración con intensidad variable.', precioVenta: 1200, precioCoste: 700, estado: 'Activo', especialidades: ['Medicina general', 'Cirugía'] },
  { id: 'e8', nombre: 'Camilla Eléctrica Articulada', marca: 'Actualway', modelo: 'HY-8081', categoria: 'Mobiliario clínico', descripcion: 'Camilla eléctrica de 3 secciones con mando inalámbrico.', precioVenta: 3800, precioCoste: 2200, estado: 'Activo', especialidades: ['Rehabilitación', 'Medicina general'] },
];

export const SEED_OPORTUNIDADES = [
  { id: 'op1', nombre: 'Renovación ecógrafos UCI', clienteId: 'c1', equipos: ['e1'], valor: 37000, probabilidad: 70, etapa: 'Propuesta enviada', fechaCierre: '2024-03-31', responsable: 'u2', origen: 'Visita comercial', descripcion: 'Renovación de 2 ecógrafos portátiles para la UCI.', fechaCreacion: '2024-01-10', fechaUltimaActualizacion: '2024-02-01' },
  { id: 'op2', nombre: 'Monitores cardiología', clienteId: 'c2', equipos: ['e2'], valor: 25600, probabilidad: 85, etapa: 'Negociación', fechaCierre: '2024-02-28', responsable: 'u3', origen: 'Referido', descripcion: 'Adquisición de 2 monitores multiparamétricos.', fechaCreacion: '2024-01-20', fechaUltimaActualizacion: '2024-02-05' },
  { id: 'op3', nombre: 'ECG y pulsioxímetros', clienteId: 'c3', equipos: ['e3', 'e6'], valor: 6750, probabilidad: 50, etapa: 'Interesado', fechaCierre: '2024-04-15', responsable: 'u3', origen: 'Web', descripcion: '1 ECG y 3 pulsioxímetros para el centro de salud.', fechaCreacion: '2024-02-01', fechaUltimaActualizacion: '2024-02-10' },
  { id: 'op4', nombre: 'Equipo completo neurología', clienteId: 'c4', equipos: ['e2', 'e3'], valor: 17000, probabilidad: 30, etapa: 'Prospecto', fechaCierre: '2024-06-30', responsable: 'u2', origen: 'Llamada entrante', descripcion: 'Equipamiento inicial para nueva unidad de neurología.', fechaCreacion: '2024-02-10', fechaUltimaActualizacion: '2024-02-10' },
  { id: 'op5', nombre: 'Autoclave residencia', clienteId: 'c5', equipos: ['e5'], valor: 9500, probabilidad: 90, etapa: 'Ganado', fechaCierre: '2024-01-31', responsable: 'u3', origen: 'Feria', descripcion: 'Autoclave para sala de curas.', fechaCreacion: '2023-12-01', fechaUltimaActualizacion: '2024-01-31' },
  { id: 'op6', nombre: 'Desfibriladores urgencias', clienteId: 'c1', equipos: ['e4'], valor: 8400, probabilidad: 0, etapa: 'Perdido', fechaCierre: '2024-01-15', responsable: 'u2', origen: 'Visita comercial', descripcion: 'No se llegó a acuerdo de precio.', fechaCreacion: '2023-11-15', fechaUltimaActualizacion: '2024-01-15' },
];

const today = new Date();
const todayStr = today.toISOString().split('T')[0];
const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0];
const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
const nextWeekStr = nextWeek.toISOString().split('T')[0];

export const SEED_EVENTOS = [
  { id: 'ev1', titulo: 'Visita Hospital Virgen del Rocío', tipo: 'Visita comercial', inicio: `${todayStr}T10:00`, fin: `${todayStr}T11:30`, clienteId: 'c1', responsable: 'u2', descripcion: 'Revisión propuesta ecógrafos UCI.' },
  { id: 'ev2', titulo: 'Demo monitor Quirón', tipo: 'Demo de equipo', inicio: `${tomorrowStr}T09:00`, fin: `${tomorrowStr}T10:30`, clienteId: 'c2', responsable: 'u3', descripcion: 'Demostración monitor IntelliVue.', equipoId: 'e2' },
  { id: 'ev3', titulo: 'Seguimiento Centro de Salud Sur', tipo: 'Llamada/Seguimiento', inicio: `${nextWeekStr}T11:00`, fin: `${nextWeekStr}T11:30`, clienteId: 'c3', responsable: 'u3', descripcion: '' },
  { id: 'ev4', titulo: 'Mantenimiento preventivo Residencia El Pinar', tipo: 'Mantenimiento preventivo', inicio: `${nextWeekStr}T14:00`, fin: `${nextWeekStr}T17:00`, clienteId: 'c5', responsable: 'u4', descripcion: 'Revisión anual autoclave.' },
];

export const SEED_SERVICIOS = [
  { id: 'st1', numero: 'OT-0001', clienteId: 'c1', equipoId: 'e1', tipo: 'Mantenimiento preventivo', prioridad: 'Normal', tecnico: 'u4', fechaCreacion: '2024-01-15', fechaProgramada: tomorrowStr, estado: 'Programada', descripcion: 'Mantenimiento anual ecógrafo UCI.', nSerie: 'SNS-2021-001', acciones: [], materiales: [], resultado: '', confirmacionCliente: false },
  { id: 'st2', numero: 'OT-0002', clienteId: 'c2', equipoId: 'e2', tipo: 'Reparación correctiva', prioridad: 'Alta', tecnico: 'u4', fechaCreacion: '2024-01-20', fechaProgramada: todayStr, estado: 'En curso', descripcion: 'Fallo en sensor SpO2.', nSerie: 'PHI-2022-045', acciones: [{ fecha: todayStr, nota: 'Revisión inicial, sensor dañado.', tecnico: 'u4' }], materiales: ['Sensor SpO2 compatible'], resultado: '', confirmacionCliente: false },
  { id: 'st3', numero: 'OT-0003', clienteId: 'c3', equipoId: 'e3', tipo: 'Calibración/Verificación', prioridad: 'Baja', tecnico: 'u4', fechaCreacion: '2024-01-25', fechaProgramada: nextWeekStr, estado: 'Pendiente', descripcion: 'Calibración anual reglamentaria.', nSerie: 'SCH-2020-012', acciones: [], materiales: [], resultado: '', confirmacionCliente: false },
  { id: 'st4', numero: 'OT-0004', clienteId: 'c5', equipoId: 'e5', tipo: 'Instalación', prioridad: 'Normal', tecnico: 'u4', fechaCreacion: '2024-01-28', fechaProgramada: '2024-02-01', estado: 'Completada', descripcion: 'Instalación y puesta en marcha autoclave.', nSerie: 'TUT-2024-001', acciones: [{ fecha: '2024-02-01', nota: 'Instalación completada sin incidencias.', tecnico: 'u4' }], materiales: [], resultado: 'Instalado y funcionando correctamente.', confirmacionCliente: true },
  { id: 'st5', numero: 'OT-0005', clienteId: 'c4', equipoId: 'e2', tipo: 'Asesoramiento técnico', prioridad: 'Urgente', tecnico: 'u4', fechaCreacion: '2024-02-05', fechaProgramada: todayStr, estado: 'Pendiente', descripcion: 'Consulta urgente sobre compatibilidad de equipos.', nSerie: '', acciones: [], materiales: [], resultado: '', confirmacionCliente: false },
];

export const SEED_DEMOS = [
  { id: 'd1', numero: 'DM-0001', clienteId: 'c2', contactoId: 'ct2', equipoId: 'e2', responsable: 'u3', fecha: tomorrowStr, hora: '09:00', lugar: 'Cliente', direccion: '', objetivo: 'Mostrar funcionalidades monitor.', estado: 'Confirmada', resultado: '', observaciones: '', generarOportunidad: false, oportunidadId: 'op2', adjuntos: [] },
  { id: 'd2', numero: 'DM-0002', clienteId: 'c4', contactoId: null, equipoId: 'e3', responsable: 'u3', fecha: nextWeekStr, hora: '11:00', lugar: 'Sala Sanicom', direccion: '', objetivo: 'Demo ECG nueva unidad neurología.', estado: 'Pendiente', resultado: '', observaciones: '', generarOportunidad: false, oportunidadId: null, adjuntos: [] },
  { id: 'd3', numero: 'DM-0003', clienteId: 'c1', contactoId: 'ct1', equipoId: 'e1', responsable: 'u2', fecha: '2024-01-10', hora: '10:00', lugar: 'Cliente', direccion: '', objetivo: 'Demostración ecógrafo para UCI.', estado: 'Realizada', resultado: 'Muy interesado', observaciones: 'El jefe de urgencias quedó muy satisfecho. Solicitaron presupuesto.', generarOportunidad: true, oportunidadId: 'op1', adjuntos: [] },
];
