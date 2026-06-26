#!/usr/bin/env node
/**
 * Detecta clientes SwiftMR duplicados por nombre y muestra, para cada grupo,
 * qué registro tiene grupo_rm y campo_rm rellenos y cuál no — para decidir
 * con seguridad cuál conservar antes de borrar duplicados.
 *
 * No borra nada. Solo reporta. Regla de conservación (aplicada en el reporte,
 * la eliminación real se hace en un paso aparte tras revisar este listado):
 *   1. Si solo un registro del grupo tiene grupo_rm Y campo_rm rellenos → ese se conserva.
 *   2. Si varios los tienen completos → se conserva el más reciente
 *      (fechaModificacion > fechaAlta como proxy de recencia).
 *   3. Si ninguno los tiene completos → se conserva el más reciente igualmente,
 *      pero se marca con ⚠️ para revisión manual.
 *
 * Uso: node scripts/find_swiftmr_duplicates.mjs
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

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

const norm = (s) => (s || '').toString().trim().toLowerCase();
const tieneCompleto = (d) => !!(d.grupo_rm && d.campo_rm);
const recencia = (d) => d.fechaModificacion || (d.fechaAlta ? `${d.fechaAlta}T00:00:00` : '1970-01-01');

async function fetchAllClientes() {
  const PAGE_SIZE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/clientes?select=id,data`, {
      headers: { ...headers, Range: `${from}-${from + PAGE_SIZE - 1}` },
    });
    if (!resp.ok) {
      console.error('Error consultando Supabase:', resp.status, await resp.text());
      process.exit(1);
    }
    const page = await resp.json();
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

async function main() {
  const all = await fetchAllClientes();
  const swift = all.filter(r => r.data?.especialidad === 'SwiftMR');
  console.log(`Total clientes SwiftMR: ${swift.length}`);

  const grupos = new Map();
  for (const r of swift) {
    const key = norm(r.data?.nombre);
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key).push(r);
  }

  const duplicados = [...grupos.entries()].filter(([, items]) => items.length > 1);
  console.log(`Nombres duplicados encontrados: ${duplicados.length}\n`);

  if (duplicados.length === 0) {
    console.log('No hay duplicados que revisar.');
    return;
  }

  let totalRegistrosEnDuplicados = 0;
  let avisos = 0;

  for (const [, items] of duplicados) {
    totalRegistrosEnDuplicados += items.length;
    const nombre = items[0].data.nombre;
    console.log(`── "${nombre}" (${items.length} registros) ──────────────────────`);

    // Ordenar por recencia desc para mostrar y decidir
    const sorted = [...items].sort((a, b) => recencia(b.data).localeCompare(recencia(a.data)));
    const completos = sorted.filter(r => tieneCompleto(r.data));
    let aConservar;
    let motivo;
    if (completos.length > 0) {
      aConservar = completos[0]; // ya ordenados por recencia
      motivo = completos.length > 1 ? 'completo + más reciente' : 'único con grupo_rm y campo_rm completos';
    } else {
      aConservar = sorted[0];
      motivo = '⚠️ ninguno tiene grupo_rm/campo_rm completos — se sugiere el más reciente, revisar manualmente';
      avisos++;
    }

    for (const r of sorted) {
      const marca = r.id === aConservar.id ? '✅ CONSERVAR' : '🗑️  eliminar';
      const grupo = r.data.grupo_rm || '(vacío)';
      const campo = r.data.campo_rm || '(vacío)';
      const fecha = r.data.fechaModificacion || r.data.fechaAlta || '(sin fecha)';
      console.log(`  ${marca}  id=${r.id}  grupo_rm=${grupo}  campo_rm=${campo}  fecha=${fecha}`);
    }
    console.log(`  → Motivo: ${motivo}\n`);
  }

  console.log('── Resumen ──────────────────────────');
  console.log(`Grupos duplicados: ${duplicados.length}`);
  console.log(`Registros totales involucrados: ${totalRegistrosEnDuplicados}`);
  console.log(`Registros que se eliminarían: ${totalRegistrosEnDuplicados - duplicados.length}`);
  console.log(`⚠️  Grupos sin ningún registro completo (revisar manualmente): ${avisos}`);
  console.log('\nEste script NO ha borrado nada. Revisa el listado y ejecuta el script de eliminación cuando confirmes.');
}

main().catch(err => {
  console.error('Error inesperado:', err);
  process.exit(1);
});
