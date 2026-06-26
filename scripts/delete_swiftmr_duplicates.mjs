#!/usr/bin/env node
/**
 * Borra los clientes SwiftMR duplicados por nombre, conservando siempre el
 * registro con grupo_rm y campo_rm rellenos. Si varios los tienen completos,
 * conserva el más reciente (misma regla que find_swiftmr_duplicates.mjs).
 *
 * Uso: node scripts/delete_swiftmr_duplicates.mjs
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
    const page = await resp.json();
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

async function main() {
  const all = await fetchAllClientes();
  const swift = all.filter(r => r.data?.especialidad === 'SwiftMR');

  const grupos = new Map();
  for (const r of swift) {
    const key = norm(r.data?.nombre);
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key).push(r);
  }
  const duplicados = [...grupos.entries()].filter(([, items]) => items.length > 1);

  let eliminados = 0, errores = 0;

  for (const [, items] of duplicados) {
    const sorted = [...items].sort((a, b) => recencia(b.data).localeCompare(recencia(a.data)));
    const completos = sorted.filter(r => tieneCompleto(r.data));
    const aConservar = completos.length > 0 ? completos[0] : sorted[0];

    for (const r of sorted) {
      if (r.id === aConservar.id) continue;
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/clientes?id=eq.${r.id}`, {
        method: 'DELETE',
        headers: { ...headers, Prefer: 'return=minimal' },
      });
      if (!resp.ok) {
        console.error(`Error eliminando "${r.data.nombre}" (id ${r.id}):`, resp.status, await resp.text());
        errores++;
      } else {
        console.log(`🗑️  Eliminado: "${r.data.nombre}" (id ${r.id})`);
        eliminados++;
      }
    }
  }

  console.log('\n── Resumen ──────────────────────────');
  console.log(`✅ Eliminados: ${eliminados}`);
  console.log(`❌ Errores: ${errores}`);
}

main().catch(err => {
  console.error('Error inesperado:', err);
  process.exit(1);
});
