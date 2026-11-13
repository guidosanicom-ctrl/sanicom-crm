// Crea en STEL Order el presupuesto de un presupuesto del CRM.
//
// Entrada (POST JSON): { presupuestoId, usuario }   usuario = nombre de quien lo envía (solo informativo)
// Lee el presupuesto y el cliente directamente de la base de datos (no se fía de lo que mande el navegador).
//
// 1. Si el presupuesto ya se envió (data.stel.id), no hace nada: evita duplicados.
// 2. Todas las líneas deben ser artículos del catálogo STEL (STEL no admite líneas de texto libre).
// 3. Busca el cliente en STEL por CIF; si no existe, lo crea. Guarda el id de STEL en la ficha del cliente.
// 4. Crea el presupuesto en STEL y guarda su id y referencia en el presupuesto del CRM.
//
// Secreto necesario: STEL_API_KEY (el mismo que usa stel-sync).

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

async function stel(apiKey: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${STEL_BASE}/${path}`, {
    method,
    headers: { APIKEY: apiKey, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`STEL ${method} ${path.split('?')[0]} → ${res.status}: ${String(text).slice(0, 400)}`);
  return data;
}

// STEL solo acepta fechas como 2026-11-13T00:00:00+0000 (sin milisegundos ni "Z")
const stelDate = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, '+0000');

const listOf = (d: any) => (Array.isArray(d) ? d : (d?.data ?? []));
const normCif = (s: unknown) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

async function obtenerClienteStel(apiKey: string, cliente: any): Promise<number> {
  if (cliente.stelClientId) return cliente.stelClientId;

  const cif = normCif(cliente.cif);
  if (!cif) throw new UserError(`El cliente «${cliente.nombre}» no tiene CIF en el CRM. Añádelo en su ficha para poder enviarlo a STEL.`);

  // Buscar por CIF (probamos con el CIF tal cual y normalizado)
  for (const valor of new Set([String(cliente.cif).trim(), cif])) {
    const encontrados = listOf(await stel(apiKey, 'GET', `clients?tax-identification-number=${encodeURIComponent(valor)}&limit=5`));
    // Solo vale si el CIF coincide de verdad (si STEL ignorase el filtro devolvería otros clientes)
    const match = encontrados.find((c: any) => normCif(c['tax-identification-number'] ?? c['identification-number']) === cif);
    if (match?.id) return match.id;
  }

  // No existe: crearlo
  const base: Record<string, unknown> = {
    'legal-name': (cliente.nombre || '').slice(0, 128),
    'name': (cliente.nombre || '').slice(0, 128),
    'tax-identification-number': String(cliente.cif).trim().slice(0, 30),
    ...(cliente.telefono ? { phone: String(cliente.telefono).slice(0, 32) } : {}),
    ...(cliente.email ? { email: String(cliente.email).trim() } : {}),
    'external-id': `crm-${cliente.id}`.slice(0, 64),
  };
  const direccion = cliente.direccion
    ? {
        'main-address': {
          'address-data': String(cliente.direccion).slice(0, 256),
          ...(cliente.cp ? { 'postal-code': String(cliente.cp).slice(0, 10) } : {}),
          ...(cliente.provincia ? { province: String(cliente.provincia).slice(0, 64) } : {}),
          ...(cliente.ciudad ? { 'city-town': String(cliente.ciudad).slice(0, 64) } : {}),
        },
      }
    : {};
  let creado: any;
  try {
    creado = await stel(apiKey, 'POST', 'clients', { ...base, ...direccion });
  } catch (e) {
    // Si STEL rechaza la dirección o el email, crear el cliente con lo mínimo y que Julieta lo complete
    console.warn('[stel-enviar-presupuesto] reintento sin dirección/email:', e);
    const { email: _e, ...minimo } = base as any;
    creado = await stel(apiKey, 'POST', 'clients', minimo);
  }
  const id = creado?.id ?? listOf(creado)[0]?.id;
  if (!id) throw new Error('STEL no devolvió el id del cliente creado');
  return id;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const apiKey = Deno.env.get('STEL_API_KEY');
  if (!apiKey) return json({ error: 'Falta el secreto STEL_API_KEY en Supabase' }, 500);

  try {
    const { presupuestoId, usuario } = await req.json().catch(() => ({}));
    if (!presupuestoId) throw new UserError('Falta el presupuesto');

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: pRow, error: pErr } = await supabase.from('presupuestos').select('data').eq('id', presupuestoId).maybeSingle();
    if (pErr) throw pErr;
    const presupuesto = pRow?.data;
    if (!presupuesto) throw new UserError('No se encontró el presupuesto');
    if (presupuesto.stel?.id) return json({ ok: true, yaEnviado: true, stel: presupuesto.stel });

    const lineas = (presupuesto.lineas || []).filter((l: any) => String(l.concepto || '').trim());
    const libres = lineas.filter((l: any) => !l.stelItemId);
    if (!lineas.length) throw new UserError('El presupuesto no tiene líneas');
    if (libres.length) {
      throw new UserError(`STEL solo admite artículos de su catálogo. Estas líneas están escritas a mano: ${libres.map((l: any) => `«${l.concepto}»`).join(', ')}. Elígelas del buscador de artículos.`);
    }

    const { data: cRow, error: cErr } = await supabase.from('clientes').select('data').eq('id', presupuesto.clienteId).maybeSingle();
    if (cErr) throw cErr;
    const cliente = cRow?.data;
    if (!cliente) throw new UserError('No se encontró el cliente del presupuesto');

    const accountId = await obtenerClienteStel(apiKey, cliente);
    if (cliente.stelClientId !== accountId) {
      await supabase.from('clientes').update({ data: { ...cliente, stelClientId: accountId } }).eq('id', cliente.id);
    }

    const fecha = presupuesto.fecha ? new Date(`${presupuesto.fecha}T00:00:00Z`) : null;
    const validez = fecha && presupuesto.validezDias
      ? stelDate(new Date(fecha.getTime() + Number(presupuesto.validezDias) * 86400000))
      : null;
    const comentarios = [
      presupuesto.formaPago && `Forma de pago: ${presupuesto.formaPago}`,
      presupuesto.condiciones,
    ].filter(Boolean).join('\n');

    const body: Record<string, unknown> = {
      'account-id': accountId,
      ...(fecha && !isNaN(fecha.getTime()) ? { date: stelDate(fecha) } : {}),
      ...(validez ? { 'validity-date': validez } : {}),
      ...(comentarios ? { comments: comentarios.slice(0, 30000) } : {}),
      'private-comments': [
        `Creado desde el CRM (${presupuesto.numero || presupuesto.id})${usuario ? ` por ${usuario}` : ''}.`,
        presupuesto.notas ? `Notas: ${presupuesto.notas}` : '',
      ].filter(Boolean).join('\n').slice(0, 20000),
      lines: lineas.map((l: any) => ({
        'line-type': 'ITEM',
        'item-id': Number(l.stelItemId),
        units: Number(l.cantidad) || 1,
        'item-base-price': Math.max(0, Number(l.precioUnitario) || 0),
      })),
    };

    const creado = await stel(apiKey, 'POST', 'salesEstimates', body);
    const est = creado?.id ? creado : listOf(creado)[0];
    if (!est?.id) throw new Error('STEL no devolvió el presupuesto creado');

    const info = {
      id: est.id,
      referencia: est['full-reference'] || est.reference || '',
      total: est['total-amount'] ?? null,
      enviadoEn: new Date().toISOString(),
      enviadoPor: usuario || null,
    };
    await supabase.from('presupuestos').update({ data: { ...presupuesto, stel: info } }).eq('id', presupuestoId);

    return json({ ok: true, stel: info, stelClientId: accountId });
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    console.error('[stel-enviar-presupuesto]', msg);
    return json({ error: msg }, e instanceof UserError ? 400 : 500);
  }
});
