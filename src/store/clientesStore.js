import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { fetchAll } from '../lib/supabaseUtils';
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
    const { data, error } = await fetchAll(TABLE);
    if (error) { console.error('[clientesStore]', error); return; }
    set({ clientes: (data || []).map(r => r.data), initialized: true });
  },

  addCliente: (clienteData) => {
    const user = useAuthStore.getState().user;
    const ahora = new Date().toISOString();
    const item = { ...clienteData, id: generateId(), fechaAlta: ahora.split('T')[0], fechaModificacion: ahora, creadoPorId: user?.id, creadoPorNombre: user?.name, modificadoPorId: user?.id, contactos: clienteData.contactos || [] };
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
    const updated = { ...prev, ...updates, fechaModificacion: new Date().toISOString(), modificadoPorId: user?.id };
    set(s => ({ clientes: s.clientes.map(c => c.id === id ? updated : c) }));
    db.update(id, updated).then(({ error }) => {
      if (error) { console.error(error); set(s => ({ clientes: s.clientes.map(c => c.id === id ? prev : c) })); }
    });
  },

  deleteCliente: async (id) => {
    const prev = get().clientes;
    set(s => ({ clientes: s.clientes.filter(c => c.id !== id) }));
    const { error, status } = await db.delete(id);
    if (error) {
      console.error(`[deleteCliente] Error eliminando ${id}:`, { error, status });
      set({ clientes: prev });
      return { ok: false, error };
    }
    console.log(`[deleteCliente] ${id} eliminado OK (status ${status})`);
    return { ok: true };
  },

  deleteClientes: async (ids) => {
    console.log(`[deleteClientes] Eliminando ${ids.length} registros:`, ids);
    const prev = get().clientes;

    // Optimistic: quitar del estado local inmediatamente
    set(s => ({ clientes: s.clientes.filter(c => !ids.includes(c.id)) }));

    // Eliminar en Supabase en lotes de 100 (el .in() tiene límite práctico)
    const BATCH = 100;
    const errors = [];
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      const { error, status, statusText } = await supabase
        .from(TABLE)
        .delete()
        .in('id', batch);
      if (error) {
        console.error(`[deleteClientes] Error lote ${i}–${i + batch.length - 1}:`, { error, status, statusText });
        errors.push(error);
      } else {
        console.log(`[deleteClientes] Lote ${i}–${i + batch.length - 1} eliminado OK (status ${status})`);
      }
    }

    if (errors.length > 0) {
      // Revertir estado local si algún lote falló
      set({ clientes: prev });
      return { ok: false, errors };
    }

    // Re-fetch para confirmar que los registros ya no existen en Supabase
    set({ initialized: false });
    const { data, error: fetchError } = await fetchAll(TABLE);
    if (!fetchError) {
      set({ clientes: (data || []).map(r => r.data), initialized: true });
      console.log(`[deleteClientes] Re-fetch OK: ${(data || []).length} clientes en BD`);
    }

    return { ok: true };
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
    const BATCH = 50;   // Supabase rechaza payloads muy grandes en una sola llamada
    const current = get().clientes;
    let imported = 0, skipped = 0, dbErrors = 0;
    const toInsert = [], toUpdate = [];
    const updated = [...current];

    // Normaliza una fila del JSON al formato interno del CRM
    const normalizeRow = (row) => {
      const base = { ...row };

      // Formato nuevo: equipos_tiene / equipos_interes (arrays de strings)
      if (Array.isArray(row.equipos_tiene)) {
        base.equiposInstalados = row.equipos_tiene.map((nombre, i) => ({
          id: `imp_${Date.now()}_${i}`, nombre, marca: '', modelo: '',
          nSerie: '', anioInstalacion: '', distribuidor: '', estado: 'Operativo',
        }));
        delete base.equipos_tiene;
      }
      if (Array.isArray(row.equipos_interes)) {
        base.equiposInteres = row.equipos_interes.map((nombre, i) => ({
          id: `imp_int_${Date.now()}_${i}`, nombre,
        }));
        delete base.equipos_interes;
      }

      // Mapear observaciones → notas si viene del nuevo formato
      if (row.observaciones !== undefined && row.notas === undefined) {
        base.notas = row.observaciones;
        delete base.observaciones;
      }

      return base;
    };

    const normTel = s => (s || '').replace(/[\s\-().]/g, '');

    rows.forEach(row => {
      const rowTel = normTel(row.telefono);
      const exists = current.find(c =>
        (row.cif && c.cif === row.cif) ||
        c.nombre?.toLowerCase() === row.nombre?.toLowerCase() ||
        (rowTel.length >= 7 && normTel(c.telefono) === rowTel)
      );
      if (exists) {
        // Siempre actualizar: el registro importado (más reciente) reemplaza al existente
        const merged = { ...exists, ...normalizeRow(row) };
        const idx = updated.findIndex(c => c.id === exists.id);
        updated[idx] = merged;
        toUpdate.push(merged);
        imported++;
      } else {
        const item = { ...normalizeRow(row), id: generateId(), fechaAlta: new Date().toISOString().split('T')[0], contactos: [], estado: 'Activo' };
        updated.push(item);
        toInsert.push(item);
        imported++;
      }
    });

    // Actualizar estado local inmediatamente
    set({ clientes: updated });

    // Insertar en lotes de BATCH para evitar límite de payload de Supabase
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH);
      const { error } = await supabase.from(TABLE).insert(batch.map(c => ({ id: c.id, data: c })));
      if (error) {
        console.error(`[importClientes] Error en lote ${i}–${i + batch.length - 1}:`, error);
        dbErrors += batch.length;
      }
    }

    // Actualizar existentes en paralelo (cada uno es pequeño)
    if (toUpdate.length) {
      const results = await Promise.all(toUpdate.map(c => db.update(c.id, c)));
      results.forEach(({ error }, i) => {
        if (error) { console.error(`[importClientes] Error actualizando ${toUpdate[i].id}:`, error); dbErrors++; }
      });
    }

    return { imported, skipped, dbErrors, total: rows.length };
  },

  getCliente: (id) => get().clientes.find(c => c.id === id),
}));
