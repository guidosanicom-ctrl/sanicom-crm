#!/usr/bin/env python3
"""
Importador de Contactos de Seguimiento – Planilla FISIOTERAPIAS
===============================================================
Lee la planilla Excel de Fisioterapia y crea registros en la tabla
`seguimiento_contactos` de Supabase para los clientes que ya existen.
NO crea clientes nuevos.

ESTRUCTURA POR HOJA
────────────────────
  N. Sevilla  (NOMBRE en col 17):
    Col 13 (Wi / Wi 2) → WhatsApp información
    Col 14 (Wi 2)      → WhatsApp contactado
    Col 15 (@)         → Email
    Col 16 (@)         → Email 2

  Málaga, Córdoba, Almería  (NOMBRE en col 15):
    Col 12 (W.i) → WhatsApp información
    Col 13 (W.c) → WhatsApp contactado
    Col 14 (@)   → Email

  Cádiz, Huelva, Granada, Jaén  (NOMBRE en col 15):
    Col 12 (Wi) → WhatsApp información
    Col 13 (WC) → WhatsApp contactado
    Col 14 (@)  → Email

  Ceuta → ignorar completamente

REGLAS
──────
  · Solo celdas con texto — ignorar vacías
  · Buscar cliente en Supabase por nombre exacto (tabla `clientes`, campo data->>'nombre')
  · Si no existe el cliente → ignorar y continuar
  · No crear duplicados: verificar (clienteId + tipo + nota) antes de insertar
  · Tipo WhatsApp información → tipo='whatsapp', nota='<texto> (información)'
  · Tipo WhatsApp contactado  → tipo='whatsapp', nota='<texto> (contactado)'
  · Tipo Email                → tipo='email',    nota='<texto>'
  · Fecha del contacto: hoy si no hay fecha específica

USO
────
  python importar_contactos.py planilla.xlsx
  python importar_contactos.py planilla.xlsx --dry-run
  python importar_contactos.py planilla.xlsx --verbose

Requiere:
  pip install openpyxl supabase python-dotenv
"""

import sys
import os
import uuid
import argparse
from datetime import date
from pathlib import Path

# ── Dependencias opcionales con mensajes claros ──────────────────────────────

try:
    import openpyxl
except ImportError:
    print("\nERROR: Necesitas instalar openpyxl:\n  pip install openpyxl\n")
    sys.exit(1)

try:
    from supabase import create_client
except ImportError:
    print("\nERROR: Necesitas instalar supabase:\n  pip install supabase\n")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv()
    load_dotenv(Path(__file__).parent.parent / '.env.local')
    load_dotenv(Path(__file__).parent.parent / '.env')
except ImportError:
    pass  # sin dotenv intentamos con variables de entorno directas


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN DE SUPABASE
# ═══════════════════════════════════════════════════════════════════════════════

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL') or os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY') or os.getenv('SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("\nERROR: Faltan variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY")
    print("  Asegúrate de que el archivo .env.local existe en la raíz del proyecto\n")
    sys.exit(1)


# ═══════════════════════════════════════════════════════════════════════════════
# CONSTANTES
# ═══════════════════════════════════════════════════════════════════════════════

TABLA_CLIENTES    = 'clientes'
TABLA_SEGUIMIENTO = 'seguimiento_contactos'

# Fila donde empiezan los datos en todas las hojas con equipos
FILA_DATOS = 9

# Hoja a ignorar completamente
HOJAS_IGNORAR = {'Ceuta', 'V.Sevillla', 'V.Sevillla ', 'Clientes Por Teléfono Redes'}

# ── Definición de estructura por hoja ───────────────────────────────────────
#
#   col_nombre : columna donde está el NOMBRE del cliente
#   contactos  : lista de (columna, tipo_interno, sufijo_nota)
#                tipo_interno: 'whatsapp' | 'email'
#                sufijo_nota : ' (información)' | ' (contactado)' | ''
#
ESTRUCTURA_HOJAS = {
    'N. Sevilla': {
        'col_nombre': 17,
        'col_telefono': 22,
        'contactos': [
            (13, 'whatsapp', ' (información)'),
            (14, 'whatsapp', ' (contactado)'),
            (15, 'email',    ''),
            (16, 'email',    ''),
        ],
    },
    # Grupo Málaga / Córdoba / Almería
    'Málaga':  {'col_nombre': 15, 'col_telefono': 20, 'contactos': [(12, 'whatsapp', ' (información)'), (13, 'whatsapp', ' (contactado)'), (14, 'email', '')]},
    'Córdoba': {'col_nombre': 15, 'col_telefono': 20, 'contactos': [(12, 'whatsapp', ' (información)'), (13, 'whatsapp', ' (contactado)'), (14, 'email', '')]},
    'Almería': {'col_nombre': 15, 'col_telefono': 20, 'contactos': [(12, 'whatsapp', ' (información)'), (13, 'whatsapp', ' (contactado)'), (14, 'email', '')]},
    # Grupo Cádiz / Huelva / Granada / Jaén
    'Cádiz':   {'col_nombre': 15, 'col_telefono': 20, 'contactos': [(12, 'whatsapp', ' (información)'), (13, 'whatsapp', ' (contactado)'), (14, 'email', '')]},
    'Huelva':  {'col_nombre': 15, 'col_telefono': 20, 'contactos': [(12, 'whatsapp', ' (información)'), (13, 'whatsapp', ' (contactado)'), (14, 'email', '')]},
    'Granada': {'col_nombre': 15, 'col_telefono': 20, 'contactos': [(12, 'whatsapp', ' (información)'), (13, 'whatsapp', ' (contactado)'), (14, 'email', '')]},
    'Jaén':    {'col_nombre': 15, 'col_telefono': 20, 'contactos': [(12, 'whatsapp', ' (información)'), (13, 'whatsapp', ' (contactado)'), (14, 'email', '')]},
}


# ═══════════════════════════════════════════════════════════════════════════════
# UTILIDADES
# ═══════════════════════════════════════════════════════════════════════════════

def normalizar(val):
    """Convierte valor de celda a string limpio."""
    if val is None:
        return ''
    s = str(val).strip()
    if s.endswith('.0') and s[:-2].isdigit():
        s = s[:-2]
    return s


def cell_val(ws, row, col):
    return normalizar(ws.cell(row=row, column=col).value)


def limpiar_telefono(val):
    """Quita espacios, guiones y prefijo +34/0034; devuelve solo dígitos."""
    import re
    s = re.sub(r'[\s\-\.\(\)]', '', normalizar(val))
    s = re.sub(r'^(\+34|0034)', '', s)
    return s


def generate_id():
    return str(uuid.uuid4())


# ═══════════════════════════════════════════════════════════════════════════════
# CARGA DE DATOS DESDE SUPABASE
# ═══════════════════════════════════════════════════════════════════════════════

def cargar_clientes(sb, verbose=False):
    """
    Carga todos los clientes de Supabase.
    Devuelve (por_nombre, por_telefono):
      por_nombre    : dict nombre_lower → id
      por_telefono  : dict telefono_limpio → id  (solo dígitos, sin +34)
    """
    if verbose:
        print("  Cargando clientes desde Supabase...")

    por_nombre   = {}
    por_telefono = {}
    page_size = 1000
    offset = 0

    while True:
        res = (sb.table(TABLA_CLIENTES)
               .select('id, data->>nombre, data->>telefono')
               .range(offset, offset + page_size - 1)
               .execute())
        rows = res.data or []
        for row in rows:
            rid    = row['id']
            nombre = (row.get('nombre') or '').strip()
            tel    = limpiar_telefono(row.get('telefono') or '')
            if nombre:
                por_nombre[nombre.lower()] = rid
            if tel:
                por_telefono[tel] = rid
        if len(rows) < page_size:
            break
        offset += page_size

    if verbose:
        print(f"  → {len(por_nombre)} clientes cargados ({len(por_telefono)} con teléfono)")
    return por_nombre, por_telefono


def cargar_contactos_existentes(sb, verbose=False):
    """
    Carga todos los registros de seguimiento_contactos.
    Devuelve un set de (clienteId, tipo, nota) para evitar duplicados.
    """
    if verbose:
        print("  Cargando contactos existentes desde Supabase...")

    existentes = set()
    page_size = 1000
    offset = 0

    while True:
        res = (sb.table(TABLA_SEGUIMIENTO)
               .select('data->>clienteId, data->>tipo, data->>nota')
               .range(offset, offset + page_size - 1)
               .execute())
        rows = res.data or []
        for row in rows:
            cid  = row.get('clienteId') or ''
            tipo = row.get('tipo') or ''
            nota = row.get('nota') or ''
            if cid:
                existentes.add((cid, tipo, nota))
        if len(rows) < page_size:
            break
        offset += page_size

    if verbose:
        print(f"  → {len(existentes)} contactos existentes cargados")
    return existentes


# ═══════════════════════════════════════════════════════════════════════════════
# LECTURA DE LA PLANILLA
# ═══════════════════════════════════════════════════════════════════════════════

def procesar_hoja(ws, estructura, por_nombre, por_telefono, existentes, hoy_str, dry_run, verbose):
    """
    Recorre las filas de una hoja y devuelve la lista de registros a insertar.
    Busca el cliente primero por teléfono, luego por nombre exacto.
    """
    col_nombre    = estructura['col_nombre']
    col_telefono  = estructura.get('col_telefono')
    cols_contacto = estructura['contactos']
    nuevos = []
    no_encontrados = []
    duplicados = 0

    for row_idx in range(FILA_DATOS, ws.max_row + 1):
        nombre = cell_val(ws, row_idx, col_nombre)
        if not nombre:
            continue

        # 1) Buscar por teléfono
        cliente_id = None
        if col_telefono:
            tel = limpiar_telefono(cell_val(ws, row_idx, col_telefono))
            if tel:
                cliente_id = por_telefono.get(tel)

        # 2) Si no encontró, buscar por nombre exacto
        if not cliente_id:
            cliente_id = por_nombre.get(nombre.lower())

        if not cliente_id:
            no_encontrados.append(nombre)
            if verbose:
                print(f"    ⚠  No encontrado: '{nombre}'")
            continue

        for col, tipo, sufijo in cols_contacto:
            texto = cell_val(ws, row_idx, col)
            if not texto:
                continue

            nota = texto + sufijo
            clave = (cliente_id, tipo, nota)

            if clave in existentes:
                duplicados += 1
                if verbose:
                    print(f"    ⏭  Duplicado: '{nombre}' → {tipo}: {nota!r}")
                continue

            registro = {
                'id':         generate_id(),
                'clienteId':  cliente_id,
                'usuarioId':  'u3',        # Carlos Leal (importador)
                'tipo':       tipo,
                'nota':       nota,
                'fecha':      hoy_str,
            }
            nuevos.append(registro)
            existentes.add(clave)           # evitar duplicados dentro del mismo lote
            if verbose:
                print(f"    ✓  '{nombre}' → {tipo}: {nota!r}")

    return nuevos, no_encontrados, duplicados


# ═══════════════════════════════════════════════════════════════════════════════
# INSERCIÓN EN SUPABASE
# ═══════════════════════════════════════════════════════════════════════════════

def insertar_lote(sb, registros, dry_run, verbose):
    """Inserta registros en bloques de 100."""
    if dry_run:
        print(f"  [DRY RUN] Se insertarían {len(registros)} registros")
        return 0, 0

    creados = 0
    errores = 0
    chunk = 100

    for i in range(0, len(registros), chunk):
        lote = registros[i:i + chunk]
        # seguimiento_contactos usa columnas id (text PK) + data (jsonb)
        rows = [{'id': r['id'], 'data': r} for r in lote]
        try:
            res = sb.table(TABLA_SEGUIMIENTO).insert(rows).execute()
            creados += len(lote)
        except Exception as e:
            errores += len(lote)
            print(f"  ERROR insertando lote {i//chunk + 1}: {e}")

    return creados, errores


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description='Importa contactos de seguimiento desde la planilla de Fisioterapia')
    parser.add_argument('planilla', help='Ruta al archivo Excel (.xlsx)')
    parser.add_argument('--dry-run', action='store_true', help='Simular sin insertar nada en Supabase')
    parser.add_argument('--verbose', '-v', action='store_true', help='Mostrar detalle fila a fila')
    args = parser.parse_args()

    xlsx_path = Path(args.planilla)
    if not xlsx_path.exists():
        print(f"\nERROR: No se encuentra el archivo '{xlsx_path}'\n")
        sys.exit(1)

    hoy_str = date.today().isoformat()

    print(f"\n{'='*60}")
    print(f"  Importador de Contactos de Seguimiento")
    print(f"  Planilla : {xlsx_path.name}")
    print(f"  Fecha    : {hoy_str}")
    print(f"  Modo     : {'DRY RUN (sin cambios)' if args.dry_run else 'PRODUCCIÓN'}")
    print(f"{'='*60}\n")

    # ── Conectar a Supabase ──────────────────────────────────────────────────
    try:
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"ERROR conectando a Supabase: {e}")
        sys.exit(1)

    por_nombre, por_telefono = cargar_clientes(sb, verbose=args.verbose)
    existentes               = cargar_contactos_existentes(sb, verbose=args.verbose)
    print()

    # ── Abrir Excel ─────────────────────────────────────────────────────────
    try:
        wb = openpyxl.load_workbook(xlsx_path, read_only=False, data_only=True)
    except Exception as e:
        print(f"ERROR abriendo Excel: {e}")
        sys.exit(1)

    # ── Procesar hojas ───────────────────────────────────────────────────────
    total_nuevos        = []
    total_no_enc        = []
    total_duplicados    = 0
    hojas_procesadas    = 0
    hojas_ignoradas     = []

    for nombre_hoja in wb.sheetnames:
        nombre_hoja_strip = nombre_hoja.strip()

        if nombre_hoja_strip in HOJAS_IGNORAR:
            hojas_ignoradas.append(nombre_hoja)
            continue

        estructura = ESTRUCTURA_HOJAS.get(nombre_hoja_strip)
        if estructura is None:
            # Hoja no reconocida → advertir pero no abortar
            print(f"⚠  Hoja no reconocida: '{nombre_hoja}' — ignorada")
            hojas_ignoradas.append(nombre_hoja)
            continue

        ws = wb[nombre_hoja]
        print(f"📋 Procesando hoja: {nombre_hoja}")

        nuevos, no_enc, dupes = procesar_hoja(
            ws, estructura, por_nombre, por_telefono, existentes,
            hoy_str, args.dry_run, args.verbose
        )

        print(f"   → {len(nuevos)} nuevos · {len(no_enc)} no encontrados · {dupes} duplicados omitidos")

        total_nuevos.extend(nuevos)
        total_no_enc.extend(no_enc)
        total_duplicados += dupes
        hojas_procesadas += 1

    wb.close()

    # ── Insertar en Supabase ─────────────────────────────────────────────────
    print(f"\nInsertando {len(total_nuevos)} registros en Supabase...")
    creados, errores = insertar_lote(sb, total_nuevos, args.dry_run, args.verbose)

    # ── Resumen final ────────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"  RESUMEN FINAL")
    print(f"{'='*60}")
    print(f"  Hojas procesadas      : {hojas_procesadas}")
    print(f"  Hojas ignoradas       : {len(hojas_ignoradas)} ({', '.join(hojas_ignoradas) or '—'})")
    print(f"  Contactos creados     : {creados if not args.dry_run else f'{len(total_nuevos)} (simulado)'}")
    print(f"  Duplicados omitidos   : {total_duplicados}")
    print(f"  Clientes no encontr.  : {len(set(total_no_enc))}")
    if errores:
        print(f"  Errores de inserción  : {errores}")
    if total_no_enc:
        unicos = sorted(set(total_no_enc))
        print(f"\n  Clientes no encontrados ({len(unicos)}):")
        for n in unicos[:50]:
            print(f"    · {n}")
        if len(unicos) > 50:
            print(f"    ... y {len(unicos) - 50} más")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
