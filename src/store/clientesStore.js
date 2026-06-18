import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { SEED_CLIENTS } from '../data/seedData';
import { generateId } from '../utils/formatters';
import { useAuthStore } from './authStore';
import { useActividadStore } from './actividadStore';

const TABLE = 'clientes';

const db = {
  insert: (item) => supabase.from(TABLE).insert({ id: item.id, data: item }),
  update: (id, item) => supabase.from(TABLE).update({ data: item }).eq('id', id),
  delete: (id) => supabase.from(TABLE).delete().eq('id', id),
};

export const useClientesStore = create((set, get) => ({
  clientes: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const { data, error } = await supabase.from(TABLE).select('data');
    if (error) { console.error('[clientesStore]', error); return; }
    if ((data || []).length === 0) {
      await supabase.from(TABLE).insert(SEED_CLIENTS.map(c => ({ id: c.id, data: c })));
      set({ clientes: SEED_CLIENTS, initialized: true });
    } else {
      set({ clientes: data.map(r => r.data), initialized: true });
    }
  },

  addCliente: (clienteData) => {
    const user = useAuthStore.getState().user;
    const item = { ...clienteData, id: generateId(), fechaAlta: new Date().toISOString().split('T')[0], contactos: clienteData.contactos || [] };
    set(s => ({ clientes: [...s.clientes, item] }));
    db.insert(item).then(({ error }) => {
      if (error) { console.error(error); set(s => ({ clientes: s.clientes.filter(c => c.id !== item.id) })); }
    });
    if (user) useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'cliente', accion: 'creó un nuevo cliente', registroId: item.id, registroLabel: item.nombre, modulo: 'clientes' });
    return item;
  },

  updateCliente: (id, updates) => {
    const user = useAuthStore.getState().user;
    const prev = get().clientes.find(c => c.id === id);
    const updated = { ...prev, ...updates };
    set(s => ({ clientes: s.clientes.map(c => c.id === id ? updated : c) }));
    db.update(id, updated).then(({ error }) => {
      if (error) { console.error(error); set(s => ({ clientes: s.clientes.map(c => c.id === id ? prev : c) })); }
    });
    if (user) useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'cliente', accion: 'actualizó el cliente', registroId: id, registroLabel: updated?.nombre || id, modulo: 'clientes' });
  },

  deleteCliente: (id) => {
    const user = useAuthStore.getState().user;
    const target = get().clientes.find(c => c.id === id);
    const prev = get().clientes;
    set(s => ({ clientes: s.clientes.filter(c => c.id !== id) }));
    db.delete(id).then(({ error }) => {
      if (error) { console.error(error); set({ clientes: prev }); }
    });
    if (user) useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'cliente', accion: 'eliminó el cliente', registroId: id, registroLabel: target?.nombre || id, modulo: 'clientes' });
  },

  deleteClientes: (ids) => {
    const prev = get().clientes;
    set(s => ({ clientes: s.clientes.filter(c => !ids.includes(c.id)) }));
    supabase.from(TABLE).delete().in('id', ids).then(({ error }) => {
      if (error) { console.error(error); set({ clientes: prev }); }
    });
  },

  addContacto: (clienteId, contacto) => {
    const c = get().clientes.find(c => c.id === clienteId);
    if (!c) return;
    const updated = { ...c, contactos: [...(c.contactos || []), { ...contacto, id: generateId() }] };
    set(s => ({ clientes: s.clientes.map(cl => cl.id === clienteId ? updated : cl) }));
    db.update(clienteId, updated).then(({ error }) => { if (error) console.error(error); });
  },

  updateContacto: (clienteId, contactoId, updates) => {
    const c = get().clientes.find(c => c.id === clienteId);
    if (!c) return;
    const updated = { ...c, contactos: (c.contactos || []).map(ct => ct.id === contactoId ? { ...ct, ...updates } : ct) };
    set(s => ({ clientes: s.clientes.map(cl => cl.id === clienteId ? updated : cl) }));
    db.update(clienteId, updated).then(({ error }) => { if (error) console.error(error); });
  },

  deleteContacto: (clienteId, contactoId) => {
    const c = get().clientes.find(c => c.id === clienteId);
    if (!c) return;
    const updated = { ...c, contactos: (c.contactos || []).filter(ct => ct.id !== contactoId) };
    set(s => ({ clientes: s.clientes.map(cl => cl.id === clienteId ? updated : cl) }));
    db.update(clienteId, updated).then(({ error }) => { if (error) console.error(error); });
  },

  importClientes: async (rows, mode) => {
    const current = get().clientes;
    let imported = 0, skipped = 0;
    const toInsert = [], toUpdate = [];
    const updated = [...current];

    rows.forEach(row => {
      const exists = current.find(c => (row.cif && c.cif === row.cif) || c.nombre?.toLowerCase() === row.nombre?.toLowerCase());
      if (exists) {
        if (mode === 'update') {
          const merged = { ...exists, ...row };
          const idx = updated.findIndex(c => c.id === exists.id);
          updated[idx] = merged;
          toUpdate.push(merged);
          imported++;
        } else { skipped++; }
      } else {
        const item = { ...row, id: generateId(), fechaAlta: new Date().toISOString().split('T')[0], contactos: [], estado: 'Activo' };
        updated.push(item);
        toInsert.push(item);
        imported++;
      }
    });

    set({ clientes: updated });
    if (toInsert.length) await supabase.from(TABLE).insert(toInsert.map(c => ({ id: c.id, data: c })));
    if (toUpdate.length) await Promise.all(toUpdate.map(c => db.update(c.id, c)));
    return { imported, skipped };
  },

  getCliente: (id) => get().clientes.find(c => c.id === id),
}));
