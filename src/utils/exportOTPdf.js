import { jsPDF } from 'jspdf';
import { formatDate } from './formatters';

const PRIMARY = [27, 79, 138];    // #1B4F8A
const CYAN    = [58, 189, 213];   // #3ABDD5
const DARK    = [30, 41, 59];     // #1E293B
const MUTED   = [100, 116, 139];  // #64748B
const LIGHT   = [248, 250, 252];  // #F8FAFC
const LINE    = [226, 232, 240];  // border

const PW = 210; // page width A4 mm
const PH = 297; // page height A4 mm
const M  = 14;  // margin

function setFont(doc, size, color = DARK, style = 'normal') {
  doc.setFontSize(size);
  doc.setTextColor(...color);
  doc.setFont('helvetica', style);
}

function hLine(doc, y, color = LINE) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.3);
  doc.line(M, y, PW - M, y);
}

function sectionHeader(doc, text, y) {
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(M, y, PW - M * 2, 7, 1, 1, 'F');
  setFont(doc, 9, [255, 255, 255], 'bold');
  doc.text(text, M + 3, y + 4.8);
  return y + 11;
}

function field(doc, label, value, x, y, w = 85) {
  setFont(doc, 7.5, MUTED);
  doc.text(label.toUpperCase(), x, y);
  setFont(doc, 9, DARK);
  const lines = doc.splitTextToSize(value || '—', w);
  doc.text(lines, x, y + 4.5);
  return y + 4.5 + (lines.length - 1) * 4.5;
}

function textBlock(doc, label, value, y) {
  if (!value) return y;
  setFont(doc, 7.5, MUTED);
  doc.text(label.toUpperCase(), M, y);
  y += 4;
  doc.setFillColor(...LIGHT);
  const lines = doc.splitTextToSize(value, PW - M * 2 - 6);
  const blockH = lines.length * 4.5 + 5;
  doc.roundedRect(M, y, PW - M * 2, blockH, 1.5, 1.5, 'F');
  setFont(doc, 9, DARK);
  doc.text(lines, M + 3, y + 4);
  return y + blockH + 4;
}

export async function exportOTPdf(orden, cliente, equipo, tecnico, logoSrc) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = M;
  let secNum = 1;
  const header = (text) => { y = sectionHeader(doc, `${secNum}. ${text}`, y); secNum++; };

  // ── CABECERA ────────────────────────────────────────────────────────────
  // Logo
  if (logoSrc) {
    try {
      doc.addImage(logoSrc, 'PNG', M, y, 48, 18, undefined, 'FAST');
    } catch (_) { /* si falla el logo, continuar sin él */ }
  }

  // Bloque azul derecha con número de OT
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(PW - M - 60, y, 60, 18, 2, 2, 'F');
  setFont(doc, 8, [255, 255, 255]);
  doc.text('ORDEN DE TRABAJO', PW - M - 30, y + 5.5, { align: 'center' });
  setFont(doc, 13, [255, 255, 255], 'bold');
  doc.text(orden.numero || '—', PW - M - 30, y + 13, { align: 'center' });

  y += 22;
  hLine(doc, y, CYAN);
  doc.setDrawColor(...CYAN);
  doc.setLineWidth(0.8);
  doc.line(M, y, PW - M, y);
  y += 6;

  // Fecha / estado / prioridad en una línea
  setFont(doc, 8, MUTED);
  doc.text(`Fecha de creación: `, M, y);
  setFont(doc, 8, DARK, 'bold');
  doc.text(formatDate(orden.fechaCreacion) || '—', M + 32, y);

  setFont(doc, 8, MUTED);
  doc.text('Estado:', M + 72, y);
  setFont(doc, 8, DARK, 'bold');
  doc.text(orden.estado || '—', M + 84, y);

  setFont(doc, 8, MUTED);
  doc.text('Prioridad:', M + 116, y);
  setFont(doc, 8, DARK, 'bold');
  doc.text(orden.prioridad || '—', M + 130, y);

  y += 10;

  // ── CLIENTE ─────────────────────────────────────────────────────────────
  header('DATOS DEL CLIENTE');
  const clienteDir = [cliente?.direccion, cliente?.ciudad, cliente?.provincia].filter(Boolean).join(', ');
  field(doc, 'Nombre', cliente?.nombre, M, y);
  field(doc, 'Dirección', clienteDir, M + 92, y);
  y += 12;
  field(doc, 'Teléfono', cliente?.telefono, M, y);
  field(doc, 'Email', cliente?.email, M + 92, y);
  y += 14;

  // ── EQUIPO ──────────────────────────────────────────────────────────────
  // Solo Modelo/Nombre y Nº de serie — Marca y Categoría se quitaron porque
  // equipoNombre suele ser texto libre y esos dos campos quedaban siempre vacíos.
  header('EQUIPO INTERVENIDO');
  field(doc, 'Modelo / Nombre', equipo?.nombre ? `${equipo.nombre}${equipo.modelo ? ` — ${equipo.modelo}` : ''}` : '—', M, y);
  field(doc, 'Nº de serie', orden.nSerie, M + 92, y);
  y += 14;

  // ── SERVICIO ─────────────────────────────────────────────────────────────
  header('DATOS DEL SERVICIO');
  field(doc, 'Técnico asignado', tecnico?.name, M, y);
  field(doc, 'Tipo de servicio', orden.tipo, M + 92, y);
  y += 12;
  field(doc, 'Fecha programada', formatDate(orden.fechaProgramada), M, y);
  y += 14;

  // ── BLOQUES DE TEXTO ────────────────────────────────────────────────────
  header('DESCRIPCIÓN DEL PROBLEMA');
  y = textBlock(doc, '', orden.descripcion, y);
  y += 2;

  header('TRABAJO REALIZADO / SOLUCIÓN APLICADA');
  y = textBlock(doc, '', orden.resultado, y);
  y += 2;

  // Partes de trabajo (acciones)
  if ((orden.acciones || []).length > 0) {
    header('PARTES DE TRABAJO');
    for (const a of orden.acciones) {
      const txt = `${formatDate(a.fecha)}  —  ${a.descripcion || ''}`;
      y = textBlock(doc, '', txt, y);
      y += 1;
    }
    y += 2;
  }

  // Materiales
  if (orden.materiales && (Array.isArray(orden.materiales) ? orden.materiales.length > 0 : orden.materiales.trim())) {
    const matText = Array.isArray(orden.materiales) ? orden.materiales.join('\n') : orden.materiales;
    header('MATERIALES Y REPUESTOS UTILIZADOS');
    y = textBlock(doc, '', matText, y);
    y += 2;
  }

  // ── CONFIRMACIÓN ─────────────────────────────────────────────────────────
  if (orden.confirmacionCliente) {
    doc.setFillColor(220, 252, 231); // green-100
    doc.roundedRect(M, y, PW - M * 2, 8, 1.5, 1.5, 'F');
    setFont(doc, 9, [21, 128, 61], 'bold');
    doc.text('✓  Conformidad del cliente recibida', M + 4, y + 5.3);
    y += 12;
  }

  // ── FIRMA DEL CLIENTE ────────────────────────────────────────────────────
  if (orden.estado === 'Entregada' && (orden.fechaEntrega || orden.firmaCliente)) {
    if (y > PH - 60) { doc.addPage(); y = M; }
    header('FIRMA DEL CLIENTE');
    field(doc, 'Fecha de entrega', formatDate(orden.fechaEntrega), M, y);
    y += 10;
    if (orden.firmaCliente) {
      try {
        const imgW = 70, imgH = 28;
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.3);
        doc.roundedRect(M, y, imgW, imgH, 1.5, 1.5);
        doc.addImage(orden.firmaCliente, 'PNG', M + 1, y + 1, imgW - 2, imgH - 2, undefined, 'FAST');
        y += imgH + 4;
      } catch (_) { /* firma corrupta o formato no soportado, omitir imagen */ }
    }
  }

  // ── PIE DE PÁGINA ────────────────────────────────────────────────────────
  hLine(doc, PH - 18, CYAN);
  doc.setDrawColor(...CYAN);
  doc.setLineWidth(0.5);
  doc.line(M, PH - 18, PW - M, PH - 18);

  setFont(doc, 8, PRIMARY, 'bold');
  doc.text('Sanicom Medical Systems', M, PH - 12);
  setFont(doc, 7.5, MUTED);
  doc.text('www.sanicom.es  ·  info@sanicom.es', M, PH - 7.5);
  setFont(doc, 7.5, MUTED);
  doc.text(`Documento generado el ${formatDate(new Date().toISOString())}`, PW - M, PH - 7.5, { align: 'right' });

  // ── GUARDAR ──────────────────────────────────────────────────────────────
  doc.save(`OT_${orden.numero || 'orden'}.pdf`);
}
