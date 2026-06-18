import { create } from 'zustand';
import { USERS } from '../data/seedData';

const SESSION_KEY = 'sanicom_session';

const getSession = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
};

export const useAuthStore = create((set, get) => ({
  user: getSession(),
  users: USERS,

  login: (email, password) => {
    const user = USERS.find(u => u.email === email && u.password === password && u.active);
    if (user) {
      const safeUser = { ...user };
      delete safeUser.password;
      localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
      set({ user: safeUser });
      return true;
    }
    return false;
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
    set({ user: null });
  },

  canAccess: (module) => {
    const { user } = get();
    if (!user) return false;
    if (user.role === 'Administración') return true;
    if (user.role === 'Comercial Restringido') {
      const forbidden = ['configuracion'];
      return !forbidden.includes(module);
    }
    return false;
  },

  isReadOnly: (module) => {
    const { user } = get();
    if (!user) return true;
    if (user.role === 'Comercial Restringido' && module === 'equipos') return true;
    if (user.email === 'carlosleal@sanicom.es' && module === 'servicio-tecnico') return true;
    return false;
  },

  isCarlos: () => get().user?.email === 'carlosleal@sanicom.es',

  canEditRecord: (record) => {
    const { user } = get();
    if (!user) return false;
    if (user.role === 'Administración') return true;
    if (user.email === 'carlosleal@sanicom.es') return record?.creadoPorId === user.id;
    return false;
  },

  CARLOS_ESPECIALIDADES: ['Fisioterapia', 'Podología', 'Veterinaria', 'Fisioterapia & Podología'],
}));
