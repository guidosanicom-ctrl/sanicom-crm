// Sincroniza el catálogo de STEL Order (productos, servicios y categorías)
// con la tabla stel_items del CRM.
//
// La API key de STEL NUNCA va en el frontend: se guarda como secreto
//   supabase secrets set STEL_API_KEY=xxxxx
// y despliega con:
//   supabase functions deploy stel-sync
//
// Uso de la API (plan Business: 60 llamadas/min, 1000/día): una sincronización
// completa hace ~1 llamada por cada 500 artículos de cada tipo.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STEL_BASE = 'https://app.stelorder.com/app';
const PAGE = 500; // máximo permitido por STEL

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function stelList(resource: string, apiKey: string): Promise<any[]> {
  const all: any[] = [];
  for (let start = 0; ; start += PAGE) {
    const res = await fetch(`${STEL_BASE}/${resource}?limit=${PAGE}&start=${start}`, {
      headers: { APIKEY: apiKey, Accept: 'application/json' },
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`STEL ${resource} ${res.status}: ${txt.slice(0, 300)}`);
    }
    const page = await res.json();
    const rows = Array.isArray(page) ? page : (page?.data ?? []);
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return all;
}

const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

function mapItem(raw: any, tipo: 'product' | 'service', categorias: Map<number, string>) {
  const categoriaId = tipo === 'product' ? (raw['product-category-id'] ?? null) : null;
  return {
    id: `${tipo}-${raw.id}`,
    stelId: raw.id,
    tipo,
    referencia: raw['full-reference'] || raw.reference || '',
    nombre: raw.name || '',
    descripcion: raw.description || '',
    precio: num(raw['sales-price']),
    ivaPct: num(raw['primary-tax-percentage']),
    ivaId: raw['primary-tax-id'] ?? null,
    categoriaId,
    categoriaNombre: categoriaId != null ? (categorias.get(categoriaId) || '') : '',
    inactivo: !!raw.inactive,
    eliminado: !!raw.deleted,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const apiKey = Deno.env.get('STEL_API_KEY');
  if (!apiKey) return json({ error: 'Falta el secreto STEL_API_KEY en Supabase' }, 500);

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const [rawCats, rawProducts, rawServices] = await Promise.all([
      stelList('productCategories', apiKey),
      stelList('products', apiKey),
      stelList('services', apiKey),
    ]);

    const categorias = new Map<number, string>(rawCats.map((c: any) => [c.id, c.name || `Categoría ${c.id}`]));
    const syncedAt = new Date().toISOString();

    // Conservar lo que se configura en el CRM (áreas asignadas a mano)
    const { data: existing, error: exErr } = await supabase.from('stel_items').select('id, data');
    if (exErr) throw exErr;
    const prev = new Map<string, any>((existing ?? []).map((r: any) => [r.id, r.data]));

    const fresh = [
      ...rawProducts.map((p: any) => mapItem(p, 'product', categorias)),
      ...rawServices.map((s: any) => mapItem(s, 'service', categorias)),
    ];
    const freshIds = new Set(fresh.map(i => i.id));

    const rows = fresh.map(item => ({
      id: item.id,
      data: { ...item, areas: prev.get(item.id)?.areas ?? [], syncedAt },
    }));
    // Lo que ya no existe en STEL se marca como eliminado (no se borra: puede estar en presupuestos viejos)
    for (const [id, data] of prev) {
      if (!freshIds.has(id) && !data.eliminado) rows.push({ id, data: { ...data, eliminado: true, syncedAt } });
    }

    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from('stel_items').upsert(rows.slice(i, i + 500));
      if (error) throw error;
    }

    const { data: cfgRow } = await supabase.from('stel_config').select('data').eq('id', 'main').maybeSingle();
    const cfg = {
      ...(cfgRow?.data ?? {}),
      categorias: [...categorias].map(([id, nombre]) => ({ id, nombre })),
      ultimaSync: syncedAt,
    };
    const { error: cfgErr } = await supabase.from('stel_config').upsert({ id: 'main', data: cfg });
    if (cfgErr) throw cfgErr;

    return json({ ok: true, productos: rawProducts.length, servicios: rawServices.length, categorias: rawCats.length, syncedAt });
  } catch (e) {
    console.error('[stel-sync]', e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
