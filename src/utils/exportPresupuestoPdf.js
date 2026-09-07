import { jsPDF } from 'jspdf';
import { formatDate, formatCurrency } from './formatters';

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

function fechaValidez(presupuesto) {
  if (!presupuesto.fecha || !presupuesto.validezDias) return null;
  const d = new Date(presupuesto.fecha);
  d.setDate(d.getDate() + Number(presupuesto.validezDias));
  return d.toISOString().split('T')[0];
}

export async function exportPresupuestoPdf(presupuesto, cliente, logoSrc) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = M;
  let secNum = 1;
  const header = (text) => { y = sectionHeader(doc, `${secNum}. ${text}`, y); secNum++; };

  // ── CABECERA ────────────────────────────────────────────────────────────
  if (logoSrc) {
    try {
      doc.addImage(logoSrc, 'PNG', M, y, 48, 18, undefined, 'FAST');
    } catch (_) { /* si falla el logo, continuar sin él */ }
  }

  doc.setFillColor(...PRIMARY);
  doc.roundedRect(PW - M - 60, y, 60, 18, 2, 2, 'F');
  setFont(doc, 8, [255, 255, 255]);
  doc.text('PRESUPUESTO', PW - M - 30, y + 5.5, { align: 'center' });
  setFont(doc, 13, [255, 255, 255], 'bold');
  doc.text(presupuesto.numero || '—', PW - M - 30, y + 13, { align: 'center' });

  y += 22;
  doc.setDrawColor(...CYAN);
  doc.setLineWidth(0.8);
  doc.line(M, y, PW - M, y);
  y += 6;

  const validoHasta = fechaValidez(presupuesto);
  setFont(doc, 8, MUTED);
  doc.text('Fecha:', M, y);
  setFont(doc, 8, DARK, 'bold');
  doc.text(formatDate(presupuesto.fecha) || '—', M + 16, y);

  setFont(doc, 8, MUTED);
  doc.text('Válido hasta:', M + 62, y);
  setFont(doc, 8, DARK, 'bold');
  doc.text(validoHasta ? formatDate(validoHasta) : '—', M + 88, y);

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
  if (presupuesto.equipoNombre) {
    header('EQUIPO');
    field(doc, 'Modelo / Nombre', presupuesto.equipoNombre, M, y, PW - M * 2 - 6);
    y += 14;
  }

  // ── LÍNEAS ──────────────────────────────────────────────────────────────
  header('CONCEPTOS');
  const lineas = presupuesto.lineas || [];
  const colX = { concepto: M, cantidad: M + 100, precio: M + 125, subtotal: M + 155 };
  setFont(doc, 7.5, MUTED, 'bold');
  doc.text('CONCEPTO', colX.concepto, y);
  doc.text('CANT.', colX.cantidad, y);
  doc.text('PRECIO', colX.precio, y);
  doc.text('SUBTOTAL', colX.subtotal, y);
  y += 3;
  hLine(doc, y);
  y += 5;

  for (const l of lineas) {
    if (y > PH - 60) { doc.addPage(); y = M; }
    const cantidad = parseFloat(l.cantidad) || 0;
    const precio = parseFloat(l.precioUnitario) || 0;
    const subtotal = cantidad * precio;
    setFont(doc, 9, DARK);
    const conceptoLines = doc.splitTextToSize(l.concepto || '', 95);
    doc.text(conceptoLines, colX.concepto, y);
    doc.text(String(cantidad), colX.cantidad, y);
    doc.text(formatCurrency(precio), colX.precio, y);
    setFont(doc, 9, DARK, 'bold');
    doc.text(formatCurrency(subtotal), colX.subtotal, y);
    y += Math.max(5, conceptoLines.length * 4.5);
  }
  y += 2;
  hLine(doc, y);
  y += 6;

  // ── TOTALES ─────────────────────────────────────────────────────────────
  const totalX = PW - M - 60;
  setFont(doc, 9, MUTED);
  doc.text('Total sin IVA', totalX, y);
  setFont(doc, 9, DARK, 'bold');
  doc.text(formatCurrency(presupuesto.totalSinIva || 0), PW - M, y, { align: 'right' });
  y += 6;

  setFont(doc, 9, MUTED);
  doc.text(`IVA (${presupuesto.iva ?? 21}%)`, totalX, y);
  setFont(doc, 9, DARK, 'bold');
  doc.text(formatCurrency((presupuesto.totalConIva || 0) - (presupuesto.totalSinIva || 0)), PW - M, y, { align: 'right' });
  y += 7;

  doc.setFillColor(...PRIMARY);
  doc.roundedRect(totalX - 5, y - 5, PW - M - totalX + 5, 9, 1.5, 1.5, 'F');
  setFont(doc, 10, [255, 255, 255], 'bold');
  doc.text('TOTAL CON IVA', totalX, y + 1);
  doc.text(formatCurrency(presupuesto.totalConIva || 0), PW - M - 3, y + 1, { align: 'right' });
  y += 14;

  // ── NOTAS ───────────────────────────────────────────────────────────────
  if (presupuesto.notas) {
    header('NOTAS');
    y = textBlock(doc, '', presupuesto.notas, y);
  }

  // ── PIE DE PÁGINA ────────────────────────────────────────────────────────
  doc.setDrawColor(...CYAN);
  doc.setLineWidth(0.5);
  doc.line(M, PH - 26, PW - M, PH - 26);

  setFont(doc, 8, PRIMARY, 'bold');
  doc.text('Sanicom Medical Systems SL', M, PH - 21);
  setFont(doc, 7.5, MUTED);
  doc.text('CIF B90309147', M, PH - 17);
  doc.text('Av. de Mairena 5 - Local 20 - Mairena del Aljarafe (41927)', M, PH - 13);
  doc.text('guidorosso@sanicom.es', M, PH - 9);
  doc.text(`Documento generado el ${formatDate(new Date().toISOString())}`, PW - M, PH - 9, { align: 'right' });

  // ── GUARDAR ──────────────────────────────────────────────────────────────
  doc.save(`Presupuesto_${presupuesto.numero || 'presupuesto'}.pdf`);
}
