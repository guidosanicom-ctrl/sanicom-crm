// Crea en STEL Order el presupuesto de un presupuesto del CRM.
//
// Entrada (POST JSON): { presupuestoId, usuario, modo? }
//   usuario = nombre de quien lo envía (solo informativo)
//   modo = 'actualizar' → si el presupuesto ya está en STEL, lo modifica allí (mismo número PRV)
//   modo = 'pedido'     → el cliente ha aceptado: crea en STEL un pedido de venta con las mismas
//                         líneas, colgado del presupuesto (parent-document-id)
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

// Los acentos y la ñ se mandan escapados (\u00ed…): así llegan bien aunque STEL
// interprete el cuerpo con otra codificación (antes "Clínica" llegaba como "ClÃ­nica").
const toAsciiJson = (v: unknown) =>
  JSON.stringify(v).replace(/[\u007f-\uffff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

async function stel(apiKey: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${STEL_BASE}/${path}`, {
    method,
    headers: {
      APIKEY: apiKey,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json; charset=UTF-8' } : {}),
    },
    body: body ? toAsciiJson(body) : undefined,
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
    // Razón social para facturar; el nombre de la clínica queda como nombre comercial
    'legal-name': (cliente.razonSocial?.trim() || cliente.nombre || '').slice(0, 128),
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

const normTxt = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

/** Mantiene la ficha del cliente en STEL al día con los datos del CRM (nombre, teléfono, email). */
async function actualizarClienteStel(apiKey: string, stelId: number, cliente: any) {
  const datos: Record<string, unknown> = {
    // Razón social para facturar; el nombre de la clínica queda como nombre comercial
    'legal-name': (cliente.razonSocial?.trim() || cliente.nombre || '').slice(0, 128),
    'name': (cliente.nombre || '').slice(0, 128),
    ...(cliente.telefono ? { phone: String(cliente.telefono).slice(0, 32) } : {}),
    ...(cliente.email ? { email: String(cliente.email).trim() } : {}),
  };
  try {
    await stel(apiKey, 'PUT', `clients/${stelId}`, datos);
  } catch (e) {
    // No es grave: el presupuesto se crea igual con el cliente tal como esté en STEL
    console.warn('[stel-enviar-presupuesto] no se pudo actualizar el cliente en STEL:', e);
  }
}

/** Busca en STEL la forma de pago cuyo nombre coincide con la del CRM. */
async function formaPagoId(apiKey: string, formaPago: string): Promise<number | null> {
  if (!formaPago) return null;
  try {
    const opciones = listOf(await stel(apiKey, 'GET', 'paymentOptions?limit=100')).filter((o: any) => !o.deleted);
    const q = normTxt(formaPago);
    const exacta = opciones.find((o: any) => normTxt(o.name) === q);
    if (exacta) return exacta.id;
    const parcial = opciones.find((o: any) => q.includes(normTxt(o.name)) || normTxt(o.name).includes(q));
    return parcial?.id ?? null;
  } catch (e) {
    console.warn('[stel-enviar-presupuesto] formas de pago:', e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const apiKey = Deno.env.get('STEL_API_KEY');
  if (!apiKey) return json({ error: 'Falta el secreto STEL_API_KEY en Supabase' }, 500);

  try {
    const { presupuestoId, usuario, modo } = await req.json().catch(() => ({}));
    const actualizar = modo === 'actualizar';
    const pedido = modo === 'pedido';
    if (!presupuestoId) throw new UserError('Falta el presupuesto');

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: pRow, error: pErr } = await supabase.from('presupuestos').select('data').eq('id', presupuestoId).maybeSingle();
    if (pErr) throw pErr;
    const presupuesto = pRow?.data;
    if (!presupuesto) throw new UserError('No se encontró el presupuesto');
    if (pedido) {
      if (!presupuesto.stel?.id) throw new UserError('Primero hay que enviar el presupuesto a STEL.');
      if (presupuesto.stel?.pedido?.id) return json({ ok: true, yaPedido: true, stel: presupuesto.stel });
    } else {
      if (presupuesto.stel?.id && !actualizar) return json({ ok: true, yaEnviado: true, stel: presupuesto.stel });
      if (!presupuesto.stel?.id && actualizar) return json({ ok: true, noEnviado: true });
    }

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

    const yaVinculado = !!cliente.stelClientId;
    const accountId = await obtenerClienteStel(apiKey, cliente);
    if (cliente.stelClientId !== accountId) {
      await supabase.from('clientes').update({ data: { ...cliente, stelClientId: accountId } }).eq('id', cliente.id);
    }
    // Si el cliente ya existía en STEL, poner su ficha al día con los datos del CRM
    if (yaVinculado) await actualizarClienteStel(apiKey, accountId, cliente);

    const pagoId = await formaPagoId(apiKey, presupuesto.formaPago);

    const fecha = presupuesto.fecha ? new Date(`${presupuesto.fecha}T00:00:00Z`) : null;
    const validez = fecha && presupuesto.validezDias
      ? stelDate(new Date(fecha.getTime() + Number(presupuesto.validezDias) * 86400000))
      : null;
    const comentarios = [
      presupuesto.formaPago && `Forma de pago: ${presupuesto.formaPago}`,
      presupuesto.condiciones,
    ].filter(Boolean).join('\n');

    // IVA: el del presupuesto del CRM (0/10/21). Se manda explícito en el documento y en
    // cada línea; si no, STEL usa el de la ficha del artículo y puede salir sin IVA.
    const ivaDoc = Math.min(100, Math.max(0, Number(presupuesto.iva ?? 21) || 0));

    const body: Record<string, unknown> = {
      'account-id': accountId,
      'primary-tax-enabled': true,
      ...(pagoId != null ? { 'payment-option-id': pagoId } : {}),
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
        'discount-percentage': Math.min(100, Math.max(0, Number(l.descuento) || 0)),
        'primary-tax-percentage': ivaDoc,
        // Nombre y descripción tal como los escribió el comercial (no cambia el artículo en STEL)
        'item-name': String(l.concepto).trim().slice(0, 128),
        ...(String(l.descripcion || '').trim() ? { 'item-description': String(l.descripcion).trim().slice(0, 2048) } : {}),
      })),
    };

    if (pedido) {
      const bodyPedido = {
        ...body,
        date: stelDate(new Date()),
        'parent-document-id': presupuesto.stel.id,
        'private-comments': `Pedido creado desde el CRM a partir del presupuesto ${presupuesto.stel.referencia || presupuesto.stel.id}${usuario ? ` por ${usuario}` : ''}.`,
      };
      delete (bodyPedido as any)['validity-date'];
      let ped: any;
      try {
        const r = await stel(apiKey, 'POST', 'salesOrders', bodyPedido);
        ped = r?.id ? r : listOf(r)[0];
      } catch (e) {
        // Si STEL no acepta el vínculo con el presupuesto, crear el pedido suelto
        console.warn('[stel-enviar-presupuesto] pedido sin parent-document-id:', e);
        const { 'parent-document-id': _p, ...suelto } = bodyPedido as any;
        const r = await stel(apiKey, 'POST', 'salesOrders', suelto);
        ped = r?.id ? r : listOf(r)[0];
      }
      if (!ped?.id) throw new Error('STEL no devolvió el pedido creado');
      const infoPedido = {
        id: ped.id,
        referencia: ped['full-reference'] || ped.reference || '',
        total: ped['total-amount'] ?? null,
        creadoEn: new Date().toISOString(),
        creadoPor: usuario || null,
      };
      const stelInfo = { ...presupuesto.stel, pedido: infoPedido };
      await supabase.from('presupuestos').update({ data: { ...presupuesto, stel: stelInfo, estado: 'Aceptado' } }).eq('id', presupuestoId);
      return json({ ok: true, pedido: infoPedido, stel: stelInfo });
    }

    let est: any;
    if (actualizar) {
      try {
        const mod = await stel(apiKey, 'PUT', `salesEstimates/${presupuesto.stel.id}`, body);
        est = mod?.id ? mod : listOf(mod)[0];
      } catch (e) {
        // STEL no deja tocar presupuestos aceptados/facturados: avisar en claro
        throw new UserError(`STEL no ha permitido actualizar el ${presupuesto.stel.referencia || 'presupuesto'} (puede estar ya aceptado o facturado). El CRM se ha guardado, pero en STEL sigue la versión anterior. Detalle: ${String((e as Error).message).slice(0, 200)}`);
      }
    } else {
      const creado = await stel(apiKey, 'POST', 'salesEstimates', body);
      est = creado?.id ? creado : listOf(creado)[0];
    }
    if (!est?.id) throw new Error('STEL no devolvió el presupuesto');

    const info = {
      ...(actualizar ? presupuesto.stel : {}),
      id: est.id,
      referencia: est['full-reference'] || est.reference || presupuesto.stel?.referencia || '',
      total: est['total-amount'] ?? null,
      ...(actualizar
        ? { actualizadoEn: new Date().toISOString(), actualizadoPor: usuario || null }
        : { enviadoEn: new Date().toISOString(), enviadoPor: usuario || null }),
    };
    await supabase.from('presupuestos').update({ data: { ...presupuesto, stel: info } }).eq('id', presupuestoId);

    return json({ ok: true, actualizado: actualizar, stel: info, stelClientId: accountId });
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    console.error('[stel-enviar-presupuesto]', msg);
    return json({ error: msg }, e instanceof UserError ? 400 : 500);
  }
});
