import { create } from 'zustand';
import { SEED_CLIENTS } from '../data/seedData';
import { generateId } from '../utils/formatters';

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
    const cliente = { ...data, id: generateId(), fechaAlta: new Date().toISOString().split('T')[0], contactos: data.contactos || [] };
    const clientes = [...get().clientes, cliente];
    save(clientes);
    set({ clientes });
    return cliente;
  },

  updateCliente: (id, data) => {
    const clientes = get().clientes.map(c => c.id === id ? { ...c, ...data } : c);
    save(clientes);
    set({ clientes });
  },

  deleteCliente: (id) => {
    const clientes = get().clientes.filter(c => c.id !== id);
    save(clientes);
    set({ clientes });
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
