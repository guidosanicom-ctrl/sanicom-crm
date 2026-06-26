#!/usr/bin/env node
/**
 * Actualiza grupo_rm y campo_rm de los clientes SwiftMR ya importados.
 *
 * Lee scripts/clientes_swiftmr.json (mismo formato usado en la importación inicial:
 * cada fila con { nombre, grupo, campo, ... }) y, para cada cliente, busca en Supabase
 * el registro de la tabla `clientes` cuyo data.nombre coincida (case-insensitive, trim)
 * y cuyo data.especialidad === 'SwiftMR'. Si lo encuentra, actualiza SOLO grupo_rm y
 * campo_rm dentro del JSONB `data`, sin tocar el resto de campos ni crear duplicados.
 *
 * Uso:
 *   node scripts/update_swiftmr_grupo_campo.mjs [ruta-al-json]
 *
 * Si no se pasa ruta, usa scripts/clientes_swiftmr.json por defecto.
 * Lee las credenciales de Supabase desde .env.local (mismas variables que usa la app).
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const text = readFileSync(path, 'utf-8');
  const env = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = { ...loadEnv(join(ROOT, '.env')), ...loadEnv(join(ROOT, '.env.local')) };
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('No se encontraron VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env o .env.local');
  process.exit(1);
}

const jsonPath = resolve(ROOT, process.argv[2] || 'scripts/clientes_swiftmr.json');
if (!existsSync(jsonPath)) {
  console.error(`No se encontró el archivo: ${jsonPath}`);
  process.exit(1);
}

const raw = JSON.parse(readFileSync(jsonPath, 'utf-8'));
const allRows = Array.isArray(raw) ? raw : (Array.isArray(raw?.clientes) ? raw.clientes : [raw]);
// Descarta filas de cabecera/plantilla (valores literales como "Dirección", "Localidad", etc.)
const rows = allRows.filter(r => r.nombre && r.nombre !== 'Centro' && r.direccion !== 'Dirección');

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

const norm = (s) => (s || '').toString().trim().toLowerCase();

async function main() {
  console.log(`Leyendo ${rows.length} filas de ${jsonPath}`);

  // Trae TODOS los clientes paginando (PostgREST limita a 1000 filas por defecto
  // y la tabla clientes supera ese límite — igual que fetchAll() en la app).
  const PAGE_SIZE = 1000;
  const allClientes = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/clientes?select=id,data`, {
      headers: { ...headers, Range: `${from}-${from + PAGE_SIZE - 1}` },
    });
    if (!resp.ok) {
      console.error('Error consultando Supabase:', resp.status, await resp.text());
      process.exit(1);
    }
    const page = await resp.json();
    allClientes.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  const swiftmrClientes = allClientes.filter(r => r.data?.especialidad === 'SwiftMR');
  console.log(`Encontrados ${swiftmrClientes.length} clientes con especialidad SwiftMR en Supabase.`);

  const byNombre = new Map();
  for (const r of swiftmrClientes) {
    const key = norm(r.data?.nombre);
    if (key) byNombre.set(key, r);
  }

  let actualizados = 0;
  let noEncontrados = [];
  let sinCambios = 0;

  for (const row of rows) {
    const key = norm(row.nombre);
    const match = byNombre.get(key);
    if (!match) {
      noEncontrados.push(row.nombre);
      continue;
    }

    const grupoNuevo = row.grupo_rm || row.grupo || '';
    const campoNuevo = row.campo_rm || row.campo || '';
    if (match.data.grupo_rm === grupoNuevo && match.data.campo_rm === campoNuevo) {
      sinCambios++;
      continue;
    }

    const updatedData = { ...match.data, grupo_rm: grupoNuevo, campo_rm: campoNuevo };
    const putResp = await fetch(`${SUPABASE_URL}/rest/v1/clientes?id=eq.${match.id}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ data: updatedData }),
    });

    if (!putResp.ok) {
      console.error(`Error actualizando "${row.nombre}" (id ${match.id}):`, putResp.status, await putResp.text());
      noEncontrados.push(`${row.nombre} (error al guardar)`);
      continue;
    }
    actualizados++;
  }

  console.log('\n── Resumen ──────────────────────────');
  console.log(`✅ Actualizados correctamente: ${actualizados}`);
  console.log(`⏭️  Ya estaban al día (sin cambios): ${sinCambios}`);
  console.log(`❌ No encontrados en Supabase: ${noEncontrados.length}`);
  if (noEncontrados.length) {
    console.log('   ' + noEncontrados.join('\n   '));
  }
}

main().catch(err => {
  console.error('Error inesperado:', err);
  process.exit(1);
});
