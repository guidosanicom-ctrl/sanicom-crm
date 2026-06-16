import { create } from 'zustand';
import { SEED_CLIENTS } from '../data/seedData';
import { generateId } from '../utils/formatters';
import { useAuthStore } from './authStore';
import { useActividadStore } from './actividadStore';

const KEY = 'sanicom_clientes';

const load = () => {
  try {
    const data = localStorage.getItem(KEY);
    if (data) return JSON.parse(data);
    localStorage.setItem(KEY, JSON.stringify(SEED_CLIENTS));
    return SEED_CLIENTS;
  } catch { return SEED_CLIENTS; }
};

const save = (clientes) => localStorage.setItem(KEY, JSON.stringify(clientes));

export const useClientesStore = create((set, get) => ({
  clientes: load(),

  addCliente: (data) => {
    const user = useAuthStore.getState().user;
    const cliente = { ...data, id: generateId(), fechaAlta: new Date().toISOString().split('T')[0], contactos: data.contactos || [] };
    const clientes = [...get().clientes, cliente];
    save(clientes);
    set({ clientes });
    if (user) useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'cliente', accion: 'creó un nuevo cliente', registroId: cliente.id, registroLabel: cliente.nombre, modulo: 'clientes' });
    return cliente;
  },

  updateCliente: (id, data) => {
    const user = useAuthStore.getState().user;
    const clientes = get().clientes.map(c => c.id === id ? { ...c, ...data } : c);
    save(clientes);
    set({ clientes });
    if (user) { const c = clientes.find(c => c.id === id); useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'cliente', accion: 'actualizó el cliente', registroId: id, registroLabel: c?.nombre || id, modulo: 'clientes' }); }
  },

  deleteCliente: (id) => {
    const user = useAuthStore.getState().user;
    const target = get().clientes.find(c => c.id === id);
    const clientes = get().clientes.filter(c => c.id !== id);
    save(clientes);
    set({ clientes });
    if (user) useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'cliente', accion: 'eliminó el cliente', registroId: id, registroLabel: target?.nombre || id, modulo: 'clientes' });
  },

  addContacto: (clienteId, contacto) => {
    const clientes = get().clientes.map(c => {
      if (c.id !== clienteId) return c;
      return { ...c, contactos: [...(c.contactos || []), { ...contacto, id: generateId() }] };
    });
    save(clientes);
    set({ clientes });
  },

  updateContacto: (clienteId, contactoId, data) => {
    const clientes = get().clientes.map(c => {
      if (c.id !== clienteId) return c;
      return { ...c, contactos: c.contactos.map(ct => ct.id === contactoId ? { ...ct, ...data } : ct) };
    });
    save(clientes);
    set({ clientes });
  },

  deleteContacto: (clienteId, contactoId) => {
    const clientes = get().clientes.map(c => {
      if (c.id !== clienteId) return c;
      return { ...c, contactos: c.contactos.filter(ct => ct.id !== contactoId) };
    });
    save(clientes);
    set({ clientes });
  },

  importClientes: (rows, mode) => {
    const current = get().clientes;
    let imported = 0, skipped = 0;
    const updated = [...current];
    rows.forEach(row => {
      const exists = current.find(c => (row.cif && c.cif === row.cif) || c.nombre?.toLowerCase() === row.nombre?.toLowerCase());
      if (exists) {
        if (mode === 'update') {
          const idx = updated.findIndex(c => c.id === exists.id);
          updated[idx] = { ...exists, ...row };
          imported++;
        } else { skipped++; }
      } else {
        updated.push({ ...row, id: generateId(), fechaAlta: new Date().toISOString().split('T')[0], contactos: [] });
        imported++;
      }
    });
    save(updated);
    set({ clientes: updated });
    return { imported, skipped };
  },

  getCliente: (id) => get().clientes.find(c => c.id === id),
}));
