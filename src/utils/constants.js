export const TIPOS_CLIENTE = ['Hospital público', 'Hospital privado', 'Clínica', 'Consultorio médico', 'Residencia', 'Distribuidor', 'Fisioterapia', 'Podología', 'Veterinaria', 'Otro'];
export const TIPOS_CLIENTE_DEFAULT = ['Hospital público', 'Hospital privado', 'Clínica', 'Consultorio médico', 'Residencia', 'Distribuidor', 'Fisioterapia', 'Podología', 'Veterinaria', 'Otro'];
export const ESPECIALIDADES = ['Cardiología', 'Radiología', 'Urgencias', 'Pediatría', 'Cirugía', 'Traumatología', 'Oftalmología', 'Laboratorio / Análisis clínicos', 'Medicina general', 'UCI / Cuidados intensivos', 'Oncología', 'Neurología', 'Ginecología', 'Dermatología', 'Fisioterapia', 'Podología', 'Veterinaria', 'Fisioterapia & Podología', 'Otra'];
export const ESTADOS_CLIENTE = ['Activo', 'Inactivo'];
export const CATEGORIAS_EQUIPO = ['Diagnóstico por imagen', 'Monitorización', 'Laboratorio', 'Electromedicina', 'Mobiliario clínico', 'Esterilización', 'Óptica y oftalmología', 'Otro'];
export const ETAPAS_PIPELINE = ['Prospecto', 'Interesado', 'Propuesta enviada', 'Negociación', 'Ganado', 'Perdido'];
export const TIPOS_EVENTO = ['Visita comercial', 'Mantenimiento preventivo', 'Reparación/Servicio técnico', 'Llamada/Seguimiento', 'Demo de equipo', 'Cierre de venta con cliente'];
export const TIPOS_SERVICIO = ['Mantenimiento preventivo', 'Reparación correctiva', 'Instalación', 'Calibración/Verificación', 'Garantía', 'Asesoramiento técnico'];
export const PRIORIDADES_SERVICIO = ['Baja', 'Normal', 'Alta', 'Urgente'];
export const ESTADOS_SERVICIO = ['Pendiente', 'Programada', 'En curso', 'Completada', 'Cancelada'];
export const ESTADOS_DEMO = ['Pendiente', 'Confirmada', 'Realizada', 'Reprogramada', 'Cancelada'];
export const RESULTADOS_DEMO = ['Muy interesado', 'Interesado', 'Sin interés', 'Pendiente de decisión'];
export const ORIGENES_OPP = ['Visita comercial', 'Referido', 'Web', 'Llamada entrante', 'Feria', 'Email', 'Redes sociales', 'Otro'];
export const REDES_SOCIALES = ['Instagram', 'Facebook', 'LinkedIn', 'WhatsApp', 'YouTube', 'Otra'];
export const LUGARES_DEMO = ['Cliente', 'Sala Sanicom', 'Videollamada'];
export const ROLES = ['Administración', 'Comercial Restringido'];

export const PAISES_COMUNES = ['España', 'Argentina', 'Portugal', 'Francia', 'Italia', 'Alemania', 'Reino Unido', 'Estados Unidos', 'México'];
export const PAISES_RESTO = [
  'Afganistán','Albania','Algeria','Andorra','Angola','Antigua y Barbuda','Arabia Saudí','Armenia','Australia','Austria',
  'Azerbaiyán','Bahamas','Baréin','Bangladés','Barbados','Bélgica','Belice','Benín','Bielorrusia','Bolivia',
  'Bosnia y Herzegovina','Botsuana','Brasil','Brunéi','Bulgaria','Burkina Faso','Burundi','Bután','Cabo Verde',
  'Camboya','Camerún','Canadá','Catar','Chad','Chile','China','Chipre','Colombia','Comoras',
  'Congo','Corea del Norte','Corea del Sur','Costa de Marfil','Costa Rica','Croacia','Cuba','Dinamarca','Dominica',
  'Ecuador','Egipto','El Salvador','Emiratos Árabes Unidos','Eritrea','Eslovaquia','Eslovenia','Estonia','Esuatini',
  'Etiopía','Filipinas','Finlandia','Fiyi','Gabón','Gambia','Georgia','Ghana','Granada','Grecia',
  'Guatemala','Guinea','Guinea-Bisáu','Guinea Ecuatorial','Guyana','Haití','Honduras','Hungría','India','Indonesia',
  'Irak','Irán','Irlanda','Islandia','Islas Marshall','Islas Salomón','Israel','Jamaica','Japón','Jordania',
  'Kazajistán','Kenia','Kirguistán','Kiribati','Kuwait','Laos','Lesoto','Letonia','Líbano','Liberia',
  'Libia','Liechtenstein','Lituania','Luxemburgo','Macedonia del Norte','Madagascar','Malasia','Malaui','Maldivas',
  'Malí','Malta','Marruecos','Mauricio','Mauritania','Micronesia','Moldavia','Mónaco','Mongolia','Montenegro',
  'Mozambique','Namibia','Nauru','Nepal','Nicaragua','Níger','Nigeria','Noruega','Nueva Zelanda','Omán',
  'Países Bajos','Pakistán','Palaos','Palestina','Panamá','Papúa Nueva Guinea','Paraguay','Perú','Polonia',
  'República Centroafricana','República Checa','República del Congo','República Democrática del Congo','República Dominicana',
  'Ruanda','Rumanía','Rusia','Samoa','San Cristóbal y Nieves','San Marino','San Vicente y las Granadinas',
  'Santa Lucía','Santo Tomé y Príncipe','Senegal','Serbia','Seychelles','Sierra Leona','Singapur','Siria',
  'Somalia','Sri Lanka','Sudáfrica','Sudán','Sudán del Sur','Suecia','Suiza','Surinam','Tailandia',
  'Tanzania','Tayikistán','Timor Oriental','Togo','Tonga','Trinidad y Tobago','Túnez','Turkmenistán','Turquía',
  'Tuvalu','Ucrania','Uganda','Uruguay','Uzbekistán','Vanuatu','Venezuela','Vietnam','Yemen','Yibuti',
  'Zambia','Zimbabue',
];
export const PAISES = [...PAISES_COMUNES, '───────────────', ...PAISES_RESTO];
export const SERVICIOS_HOSPITAL_DEFAULT = [
  'Cardiología', 'Urgencias', 'UCI / Cuidados intensivos', 'Cirugía', 'Traumatología',
  'Pediatría', 'Ginecología', 'Oncología', 'Neurología', 'Radiología',
  'Laboratorio', 'Oftalmología', 'Medicina interna', 'Rehabilitación', 'Otro',
];

export const COLORS_EVENTO = {
  'Visita comercial': '#3B82F6',
  'Mantenimiento preventivo': '#22C55E',
  'Reparación/Servicio técnico': '#F59E0B',
  'Llamada/Seguimiento': '#EF4444',
  'Demo de equipo': '#8B5CF6',
  'Cierre de venta con cliente': '#10B981',
};

export const COLORS_ESTADO_SERVICIO = {
  'Pendiente': '#F59E0B',
  'Programada': '#3B82F6',
  'En curso': '#F97316',
  'Completada': '#22C55E',
  'Cancelada': '#6B7280',
};

export const COLORS_ESTADO_DEMO = {
  'Pendiente': '#F59E0B',
  'Confirmada': '#3B82F6',
  'Realizada': '#22C55E',
  'Reprogramada': '#F97316',
  'Cancelada': '#1F2937',
};
