import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { SERVICIOS_HOSPITAL_DEFAULT } from '../utils/constants';

const TABLE = 'servicios_hospital';
const LS_KEY = 'sanicom_servicios_hospital';

export const useServiciosHospitalStore = create((set, get) => ({
  servicios: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const { data, error } = await supabase.from(TABLE).select('nombre').order('nombre');
    if (error) {
      const saved = localStorage.getItem(LS_KEY);
      const servicios = saved ? JSON.parse(saved) : SERVICIOS_HOSPITAL_DEFAULT;
      set({ servicios, initialized: true });
      return;
    }
    if ((data || []).length === 0) {
      await supabase.from(TABLE).insert(SERVICIOS_HOSPITAL_DEFAULT.map(n => ({ nombre: n })));
      set({ servicios: SERVICIOS_HOSPITAL_DEFAULT, initialized: true });
      localStorage.setItem(LS_KEY, JSON.stringify(SERVICIOS_HOSPITAL_DEFAULT));
    } else {
      const servicios = data.map(r => r.nombre);
      set({ servicios, initialized: true });
      localStorage.setItem(LS_KEY, JSON.stringify(servicios));
    }
  },

  addServicio: (nombre) => {
    const trimmed = nombre.trim();
    if (!trimmed) return { ok: false, error: 'El nombre no puede estar vacío.' };
    if (get().servicios.some(s => s.toLowerCase() === trimmed.toLowerCase()))
      return { ok: false, error: 'Ya existe un servicio con ese nombre.' };
    const next = [...get().servicios, trimmed];
    set({ servicios: next });
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    supabase.from(TABLE).insert({ nombre: trimmed })
      .then(({ error }) => { if (error) console.error('[serviciosHospitalStore.add]', error); });
    return { ok: true };
  },

  updateServicio: (oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return { ok: false, error: 'El nombre no puede estar vacío.' };
    if (trimmed !== oldName && get().servicios.some(s => s.toLowerCase() === trimmed.toLowerCase()))
      return { ok: false, error: 'Ya existe un servicio con ese nombre.' };
    const next = get().servicios.map(s => s === oldName ? trimmed : s);
    set({ servicios: next });
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    supabase.from(TABLE).update({ nombre: trimmed }).eq('nombre', oldName)
      .then(({ error }) => { if (error) console.error('[serviciosHospitalStore.update]', error); });
    return { ok: true };
  },

  deleteServicio: (nombre) => {
    const next = get().servicios.filter(s => s !== nombre);
    set({ servicios: next });
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    supabase.from(TABLE).delete().eq('nombre', nombre)
      .then(({ error }) => { if (error) console.error('[serviciosHospitalStore.delete]', error); });
  },
}));
