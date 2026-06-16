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
