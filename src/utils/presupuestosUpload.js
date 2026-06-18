import { supabase } from '../lib/supabase';

const BUCKET = 'presupuestos';
const MAX_SIZE_MB = 10;

export async function uploadPresupuesto({ file, origen, origenId, user }) {
  if (!file) return { ok: false, error: 'Sin archivo.' };
  if (file.type !== 'application/pdf') return { ok: false, error: 'Solo se permiten archivos PDF.' };
  if (file.size > MAX_SIZE_MB * 1024 * 1024) return { ok: false, error: `El archivo supera ${MAX_SIZE_MB} MB.` };

  const ts = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${origen}/${origenId}/${ts}_${safeName}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: 'application/pdf',
  });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return {
    ok: true,
    presupuesto: {
      id: `pres_${ts}`,
      nombre: file.name,
      path,
      url: urlData.publicUrl,
      subidoPorId: user?.id || null,
      subidoPorNombre: user?.name || 'Desconocido',
      fecha: new Date().toISOString(),
    },
  };
}

export async function deletePresupuesto(path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.error('[deletePresupuesto]', error);
}
