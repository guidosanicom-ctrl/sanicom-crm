import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    if (!isValid(d)) return '-';
    return format(d, 'dd/MM/yyyy', { locale: es });
  } catch { return '-'; }
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    if (!isValid(d)) return '-';
    return format(d, 'dd/MM/yyyy HH:mm', { locale: es });
  } catch { return '-'; }
};

export const formatCurrency = (amount) => {
  if (amount == null) return '-';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(amount);
};

export const formatPercent = (value) => {
  if (value == null) return '-';
  return `${value}%`;
};

export const generateId = () => crypto.randomUUID();

export const generateNumero = (prefix, list) => {
  const max = list.reduce((acc, item) => {
    const num = parseInt(item.numero?.replace(prefix + '-', '') || '0');
    return num > acc ? num : acc;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(4, '0')}`;
};

// Numeración anual sin guión: PR + año + secuencial de 4 dígitos, se reinicia cada año.
// startAt permite fijar un piso (ej: continuar una numeración externa previa).
export const generateNumeroAnual = (prefix, list, startAt = 1) => {
  const base = `${prefix}${new Date().getFullYear()}`;
  const max = list.reduce((acc, item) => {
    if (!item.numero?.startsWith(base)) return acc;
    const num = parseInt(item.numero.slice(base.length)) || 0;
    return num > acc ? num : acc;
  }, startAt - 1);
  return `${base}${String(max + 1).padStart(4, '0')}`;
};
