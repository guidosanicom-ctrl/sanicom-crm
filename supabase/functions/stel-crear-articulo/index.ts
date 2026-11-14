// Crea o modifica un artículo (producto o servicio) en STEL Order desde el CRM y lo
// guarda en el catálogo del CRM (tabla stel_items) con sus áreas.
//
// Entrada (POST JSON):
//   { id?, tipo: 'product' | 'service', referencia?, nombre, descripcion?, precio, ivaPct,
//     categoriaId?, areas: string[], usuario? }
//   id = 'product-123' / 'service-45' → modificar ese artículo (PUT); sin id → crear (POST)
// Secreto necesario: STEL_API_KEY (el mismo que usan las otras funciones).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const STEL_BASE = 'https://app.stelorder.com/app';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

class UserError extends Error {}

// Acentos y ñ escapados para que STEL no los corrompa
const toAsciiJson = (v: unknown) =>
  JSON.stringify(v).replace(/[\u007f-￿]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

async function stelPost(apiKey: string, path: string, body: unknown, method = 'POST') {
  const res = await fetch(`${STEL_BASE}/${path}`, {
    method,
    headers: { APIKEY: apiKey, Accept: 'application/json', 'Content-Type': 'application/json; charset=UTF-8' },
    body: toAsciiJson(body),
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`STEL ${method} ${path} → ${res.status}: ${String(text).slice(0, 400)}`);
  return Array.isArray(data) ? data[0] : data;
}

const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const apiKey = Deno.env.get('STEL_API_KEY');
  if (!apiKey) return json({ error: 'Falta el secreto STEL_API_KEY en Supabase' }, 500);

  try {
    const b = await req.json().catch(() => ({}));
    const editId = typeof b.id === 'string' && /^(product|service)-\d+$/.test(b.id) ? b.id : null;
    const tipo = editId ? (editId.split('-')[0] as 'product' | 'service') : (b.tipo === 'service' ? 'service' : 'product');
    const nombre = String(b.nombre || '').trim();
    const referencia = String(b.referencia || '').trim().toUpperCase();
    const descripcion = String(b.descripcion || '').trim();
    const precio = Math.max(0, num(b.precio));
    const ivaPct = Math.min(100, Math.max(0, b.ivaPct === undefined || b.ivaPct === '' ? 21 : num(b.ivaPct)));
    const areas: string[] = Array.isArray(b.areas) ? b.areas.filter((a: unknown) => typeof a === 'string') : [];

    if (!nombre) throw new UserError('El nombre es obligatorio');
    if (nombre.length > 128) throw new UserError('El nombre no puede pasar de 128 caracteres');
    if (referencia.length > 32) throw new UserError('La referencia no puede pasar de 32 caracteres');

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Evitar referencias duplicadas (según el catálogo sincronizado)
    if (referencia) {
      const { data: dup } = await supabase.from('stel_items').select('id, data')
        .eq('data->>referencia', referencia).limit(1);
      const d = dup?.[0]?.data;
      if (d && !d.eliminado && dup?.[0]?.id !== editId) throw new UserError(`Ya existe un artículo con la referencia ${referencia}: «${d.nombre}»`);
    }

    const body: Record<string, unknown> = {
      name: nombre,
      ...(descripcion ? { description: descripcion.slice(0, 2048) } : {}),
      'sales-price': precio,
      'primary-tax-percentage': ivaPct,
      ...(tipo === 'product' && b.categoriaId ? { 'product-category-id': Number(b.categoriaId) } : {}),
      ...(editId ? {} : { 'private-comments': `Creado desde el CRM${b.usuario ? ` por ${b.usuario}` : ''}.` }),
    };

    const recurso = tipo === 'product' ? 'products' : 'services';
    let creado: any;
    if (editId) {
      const stelId = editId.split('-')[1];
      const { data: prevRow } = await supabase.from('stel_items').select('data').eq('id', editId).maybeSingle();
      const prev = prevRow?.data || {};
      // La referencia solo se manda si cambia (si no, STEL podría quejarse de duplicado consigo mismo)
      const cambiaRef = referencia && referencia !== String(prev.referencia || '').toUpperCase();
      const put = { ...body, ...(cambiaRef ? { reference: referencia } : {}), ...(tipo === 'product' && !b.categoriaId ? { 'product-category-id': null } : {}) };
      try {
        creado = await stelPost(apiKey, `${recurso}/${stelId}`, put, 'PUT');
      } catch (e) {
        throw new UserError(`STEL no ha permitido modificar el artículo: ${String((e as Error).message).slice(0, 250)}`);
      }
      if (!creado?.id) creado = { ...prev, id: Number(stelId) };
    } else if (referencia) {
      // Referencia manual: STEL pide la serie MANUAL (-2); si no la acepta, se prueba sin indicar serie
      try {
        creado = await stelPost(apiKey, recurso, { ...body, reference: referencia, 'serial-number-id': -2 });
      } catch (e) {
        console.warn('[stel-crear-articulo] reintento sin serie manual:', e);
        creado = await stelPost(apiKey, recurso, { ...body, reference: referencia });
      }
    } else {
      creado = await stelPost(apiKey, recurso, body);
    }
    if (!creado?.id) throw new Error('STEL no devolvió el artículo creado');

    // Nombre de la categoría (si la hay) desde la configuración sincronizada
    const categoriaId = tipo === 'product' ? (creado['product-category-id'] ?? null) : null;
    let categoriaNombre = '';
    if (categoriaId != null) {
      const { data: cfg } = await supabase.from('stel_config').select('data').eq('id', 'main').maybeSingle();
      categoriaNombre = (cfg?.data?.categorias || []).find((c: any) => c.id === categoriaId)?.nombre || '';
    }

    const item = {
      id: `${tipo}-${creado.id}`,
      stelId: creado.id,
      tipo,
      referencia: creado['full-reference'] || creado.reference || referencia,
      nombre: creado.name || nombre,
      descripcion: creado.description || descripcion,
      precio: num(creado['sales-price'] ?? precio),
      ivaPct: num(creado['primary-tax-percentage'] ?? ivaPct),
      ivaId: creado['primary-tax-id'] ?? null,
      categoriaId,
      categoriaNombre,
      inactivo: !!creado.inactive,
      eliminado: false,
      areas,
      syncedAt: new Date().toISOString(),
    };
    const { error } = await supabase.from('stel_items').upsert({ id: item.id, data: item });
    if (error) throw error;

    return json({ ok: true, item });
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    console.error('[stel-crear-articulo]', msg);
    return json({ error: msg }, e instanceof UserError ? 400 : 500);
  }
});
