import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const LS_KEY = 'sanicom_drive_url';
const TABLE  = 'configuracion';
const CLAVE  = 'drive_url';

export const useDriveStore = create((set, get) => ({
  driveUrl: localStorage.getItem(LS_KEY) || '',
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const { data } = await supabase
      .from(TABLE)
      .select('valor')
      .eq('clave', CLAVE)
      .single();
    if (data?.valor) {
      localStorage.setItem(LS_KEY, data.valor);
      set({ driveUrl: data.valor, initialized: true });
    } else {
      set({ initialized: true });
    }
  },

  saveDriveUrl: async (url) => {
    const trimmed = url.trim();
    localStorage.setItem(LS_KEY, trimmed);
    set({ driveUrl: trimmed });
    await supabase
      .from(TABLE)
      .upsert({ clave: CLAVE, valor: trimmed }, { onConflict: 'clave' });
  },
}));
