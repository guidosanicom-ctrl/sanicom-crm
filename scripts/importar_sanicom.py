#!/usr/bin/env python3
"""
Importador de Planilla Sanicom – Fisioterapia
==============================================
Genera un JSON con todos los clientes de la planilla Excel de Fisioterapia.

ESTRUCTURA DE HOJAS
────────────────────
Hojas con equipos (fila 9 → datos):
  N. Sevilla, V.Sevillla, Málaga, Córdoba, Cádiz, Huelva, Granada, Jaén, Almería
  · Encabezados : fila 5
  · Primera fila de datos : fila 9  (filas 6-8 = cabeceras visuales)
  · Col  1  Diatermia   ┐
    Col  2  O.Choque    │  Color FF00FF00 (verde)  → equipo que TIENE
    Col  3  ECO         │  Color FF00FFFF (celeste) → equipo con INTERÉS
    Col  4  Magneto     │  Cualquier otro color    → IGNORAR
    Col  5  Láser       │  Celda vacía             → IGNORAR siempre
    Col  6  Radio       │
    Col  7  Otros       │
    Col  8  Otros2      │
    Col  9  Otros3      ┘
  · Col 10  NOMBRE        · Col 11  DIRECCION
    Col 12  POB (ciudad)  · Col 13  PROV (provincia)
    Col 14  CP            · Col 15  TELEFONO
    Col 16  EMAIL         · Col 17  WEB
    Col 18  OBSERVACIONES

Hoja Ceuta (sin equipos, datos desde fila 5):
  · Col  1  NOMBRE   · Col 2  DIRECCION  · Col 3  POB
    Col  4  PROV     · Col 5  CP         · Col 6  TELEFONO
    Col  7  EMAIL

Hoja ignorada:
  · 'Clientes Por Teléfono Redes' → se omite completamente

REGLAS DE FILTRADO DE CLIENTES
────────────────────────────────
  · Ignorar fila si NOMBRE está vacío
  · Ignorar fila si NOMBRE contiene (sin distinción mayúsculas):
    'Curso', 'Catálogo', 'EN PROCESO', 'LISTA'

FORMATO DE SALIDA
──────────────────
  {
    "clientes": [
      {
        "nombre":       "Clínica Fisio Ejemplo",
        "direccion":    "C/ Mayor 1",
        "ciudad":       "Sevilla",
        "provincia":    "Sevilla",
        "cp":           "41001",
        "telefono":     "955000000",
        "email":        "info@ejemplo.es",
        "web":          "www.ejemplo.es",
        "especialidad": "Fisioterapia",
        "observaciones":"...",
        "equipos_tiene":   ["ECO: Esaote mylab X6", "Magneto: BTL"],
        "equipos_interes": ["O.Choque: Storz"]
      },
      ...
    ]
  }

USO
────
  python importar_sanicom.py planilla.xlsx
  python importar_sanicom.py planilla.xlsx -o salida.json
  python importar_sanicom.py planilla.xlsx --verbose

Requiere: pip install openpyxl
"""

import json
import re
import sys
import argparse
from pathlib import Path

try:
    import openpyxl
except ImportError:
    print("\nERROR: Necesitas instalar openpyxl:")
    print("  pip install openpyxl\n")
    sys.exit(1)


# ═══════════════════════════════════════════════════════════════════════════════
# CONSTANTES
# ═══════════════════════════════════════════════════════════════════════════════

# Hojas a ignorar completamente
HOJAS_IGNORAR = {'V.Sevillla', 'V.Sevillla ', 'Clientes Por Teléfono Redes'}

# Hoja especial sin equipos
HOJA_CEUTA = 'Ceuta'

# Nombres de columnas de equipos (cols 1-9)
COLS_EQUIPOS = {
    1: 'Diatermia',
    2: 'O.Choque',
    3: 'ECO',
    4: 'Magneto',
    5: 'Láser',
    6: 'Radio',
    7: 'Otros',
    8: 'Otros2',
    9: 'Otros3',
}

# Columnas de datos del cliente – hojas normales (col 10+)
COL_NOMBRE_NORMAL        = 10
COL_DIRECCION_NORMAL     = 11
COL_CIUDAD_NORMAL        = 12   # POB
COL_PROVINCIA_NORMAL     = 13   # PROV
COL_CP_NORMAL            = 14
COL_TELEFONO_NORMAL      = 15
COL_EMAIL_NORMAL         = 16
COL_WEB_NORMAL           = 17
COL_OBSERVACIONES_NORMAL = 18

FILA_DATOS_NORMAL        = 9    # primera fila con datos de cliente

# Columnas de datos del cliente – hoja Ceuta
COL_NOMBRE_CEUTA         = 1
COL_DIRECCION_CEUTA      = 2
COL_CIUDAD_CEUTA         = 3
COL_PROVINCIA_CEUTA      = 4
COL_CP_CEUTA             = 5
COL_TELEFONO_CEUTA       = 6
COL_EMAIL_CEUTA          = 7

FILA_DATOS_CEUTA         = 5

# Palabras que indican que la fila NO es un cliente real
PALABRAS_IGNORAR = ('curso', 'catálogo', 'catalogo', 'en proceso', 'lista')

# Colores ARGB exactos (openpyxl devuelve AARRGGBB en mayúsculas)
COLOR_VERDE   = 'FF00FF00'   # verde puro  → equipo que TIENE
COLOR_CELESTE = 'FF00FFFF'   # cyan puro   → equipo con INTERÉS
COLOR_BLANCO  = 'FFFFFFFF'
COLOR_TRANS   = '00000000'


# ═══════════════════════════════════════════════════════════════════════════════
# UTILIDADES
# ═══════════════════════════════════════════════════════════════════════════════

def normalizar(val):
    """Convierte el valor de celda a string limpio; elimina '.0' en números."""
    if val is None:
        return ''
    s = str(val).strip()
    if s.endswith('.0') and s[:-2].isdigit():
        s = s[:-2]
    return s


def cell_val(ws, row, col):
    return normalizar(ws.cell(row=row, column=col).value)


def get_color_equipo(cell):
    """
    Devuelve 'tiene', 'interes' o None según el color ARGB exacto del relleno.
    Solo reconoce FF00FF00 y FF00FFFF. Cualquier otro → None.
    """
    try:
        fill = cell.fill
        if fill is None or fill.fill_type in (None, 'none'):
            return None

        argb = None
        fgc = fill.fgColor
        if fgc and fgc.type == 'rgb':
            argb = fgc.rgb.upper()

        # Si fgColor es blanco/transparente, intentar bgColor
        if not argb or argb in (COLOR_BLANCO, COLOR_TRANS):
            bgc = fill.bgColor
            if bgc and bgc.type == 'rgb':
                argb = bgc.rgb.upper()

        if argb == COLOR_VERDE:
            return 'tiene'
        if argb == COLOR_CELESTE:
            return 'interes'
    except Exception:
        pass
    return None


def debe_ignorar_nombre(nombre):
    """True si el nombre indica que la fila no es un cliente real."""
    nl = nombre.lower()
    return any(p in nl for p in PALABRAS_IGNORAR)


# ═══════════════════════════════════════════════════════════════════════════════
# PROCESADO
# ═══════════════════════════════════════════════════════════════════════════════

def procesar_hoja_normal(ws, nombre_hoja, verbose=False):
    """Procesa una hoja con equipos (cols 1-9) y datos en cols 10-18."""
    clientes = []

    for row_idx in range(FILA_DATOS_NORMAL, ws.max_row + 1):
        nombre = cell_val(ws, row_idx, COL_NOMBRE_NORMAL)
        if not nombre:
            continue
        if debe_ignorar_nombre(nombre):
            if verbose:
                print(f"    [IGNORADO] fila {row_idx}: '{nombre}'")
            continue

        equipos_tiene   = []
        equipos_interes = []

        for col_idx, col_nombre in COLS_EQUIPOS.items():
            cell = ws.cell(row=row_idx, column=col_idx)
            texto = normalizar(cell.value)
            if not texto:
                continue   # celda vacía → siempre ignorar

            tipo_color = get_color_equipo(cell)
            if tipo_color is None:
                continue   # color distinto de verde/celeste → ignorar

            entrada = f"{col_nombre}: {texto}"

            if tipo_color == 'tiene':
                equipos_tiene.append(entrada)
            else:
                equipos_interes.append(entrada)

        cliente = {
            'nombre':           nombre,
            'direccion':        cell_val(ws, row_idx, COL_DIRECCION_NORMAL),
            'ciudad':           cell_val(ws, row_idx, COL_CIUDAD_NORMAL) or nombre_hoja,
            'provincia':        cell_val(ws, row_idx, COL_PROVINCIA_NORMAL) or nombre_hoja,
            'cp':               cell_val(ws, row_idx, COL_CP_NORMAL),
            'telefono':         cell_val(ws, row_idx, COL_TELEFONO_NORMAL),
            'email':            cell_val(ws, row_idx, COL_EMAIL_NORMAL),
            'web':              cell_val(ws, row_idx, COL_WEB_NORMAL),
            'especialidad':     'Fisioterapia',
            'observaciones':    cell_val(ws, row_idx, COL_OBSERVACIONES_NORMAL),
            'equipos_tiene':    equipos_tiene,
            'equipos_interes':  equipos_interes,
        }
        clientes.append(cliente)

        if verbose and (equipos_tiene or equipos_interes):
            print(f"    [{nombre[:40]:<40}]  "
                  f"Tiene: {equipos_tiene or '-'}  |  Interés: {equipos_interes or '-'}")

    return clientes


def procesar_hoja_ceuta(ws, verbose=False):
    """Procesa la hoja Ceuta: sin equipos, datos desde fila 5, cols 1-7."""
    clientes = []

    for row_idx in range(FILA_DATOS_CEUTA, ws.max_row + 1):
        nombre = cell_val(ws, row_idx, COL_NOMBRE_CEUTA)
        if not nombre:
            continue
        if debe_ignorar_nombre(nombre):
            if verbose:
                print(f"    [IGNORADO] fila {row_idx}: '{nombre}'")
            continue

        cliente = {
            'nombre':          nombre,
            'direccion':       cell_val(ws, row_idx, COL_DIRECCION_CEUTA),
            'ciudad':          cell_val(ws, row_idx, COL_CIUDAD_CEUTA) or 'Ceuta',
            'provincia':       cell_val(ws, row_idx, COL_PROVINCIA_CEUTA) or 'Ceuta',
            'cp':              cell_val(ws, row_idx, COL_CP_CEUTA),
            'telefono':        cell_val(ws, row_idx, COL_TELEFONO_CEUTA),
            'email':           cell_val(ws, row_idx, COL_EMAIL_CEUTA),
            'web':             '',
            'especialidad':    'Fisioterapia',
            'observaciones':   '',
            'equipos_tiene':   [],
            'equipos_interes': [],
        }
        clientes.append(cliente)

    return clientes


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description='Importador de planilla Sanicom – Fisioterapia',
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('archivo', help='Ruta al archivo Excel (.xlsx)')
    parser.add_argument(
        '-o', '--output', default=None,
        help='Archivo JSON de salida (default: clientes_fisio.json junto al Excel)',
    )
    parser.add_argument('--verbose', '-v', action='store_true',
                        help='Muestra equipos detectados por cliente')
    args = parser.parse_args()

    archivo = Path(args.archivo)
    if not archivo.exists():
        print(f"\nERROR: No se encuentra el archivo: {archivo}\n")
        sys.exit(1)

    print(f"\n📂 Leyendo: {archivo.name}")
    wb = openpyxl.load_workbook(archivo, data_only=True)

    hojas_todas   = wb.sheetnames
    hojas_proceso = [h for h in hojas_todas if h not in HOJAS_IGNORAR]
    hojas_ignor   = [h for h in hojas_todas if h in HOJAS_IGNORAR]

    print(f"   Hojas encontradas  : {', '.join(hojas_todas)}")
    if hojas_ignor:
        print(f"   Hojas ignoradas    : {', '.join(hojas_ignor)}")
    print(f"   Hojas a procesar   : {', '.join(hojas_proceso)}\n")

    todos_clientes = []

    print("⚙️  Procesando...\n")
    for nombre_hoja in hojas_proceso:
        ws = wb[nombre_hoja]

        if nombre_hoja == HOJA_CEUTA:
            clientes = procesar_hoja_ceuta(ws, verbose=args.verbose)
        else:
            clientes = procesar_hoja_normal(ws, nombre_hoja, verbose=args.verbose)

        todos_clientes.extend(clientes)

        n_tiene   = sum(1 for c in clientes if c['equipos_tiene'])
        n_interes = sum(1 for c in clientes if c['equipos_interes'])
        tipo_nota = '(sin equipos)' if nombre_hoja == HOJA_CEUTA else \
                    f'(verde: {n_tiene:3d}, celeste: {n_interes:3d})'
        print(f"  ✔ {nombre_hoja:<35} {len(clientes):3d} clientes  {tipo_nota}")

    # Deduplicar: si el mismo nombre o teléfono aparece varias veces (en distintas hojas),
    # se conserva la ÚLTIMA ocurrencia (la más reciente importada).
    seen_nombre = {}   # nombre normalizado → índice en deduped
    seen_tel    = {}   # teléfono normalizado → índice en deduped
    deduped     = []

    for c in todos_clientes:
        n = c['nombre'].lower().strip()
        t = re.sub(r'[\s\-().]', '', c.get('telefono', '') or '')
        t = t if len(t) >= 7 else ''

        dup_idx = seen_nombre.get(n)
        if dup_idx is None and t:
            dup_idx = seen_tel.get(t)

        if dup_idx is not None:
            deduped[dup_idx] = c          # reemplaza con la ocurrencia más reciente
        else:
            idx = len(deduped)
            deduped.append(c)
            seen_nombre[n] = idx
            if t:
                seen_tel[t] = idx

    duplicados_eliminados = len(todos_clientes) - len(deduped)
    todos_clientes = deduped

    # Guardar JSON
    salida = Path(args.output) if args.output else archivo.parent / 'clientes_fisio.json'
    with open(salida, 'w', encoding='utf-8') as f:
        json.dump({'clientes': todos_clientes}, f, ensure_ascii=False, indent=2)

    total         = len(todos_clientes)
    total_tiene   = sum(len(c['equipos_tiene'])   for c in todos_clientes)
    total_interes = sum(len(c['equipos_interes']) for c in todos_clientes)

    print(f"\n{'─' * 55}")
    if duplicados_eliminados:
        print(f"🔁 Duplicados eliminados     : {duplicados_eliminados}  (se conservó la última ocurrencia)")
    print(f"✅ Total clientes           : {total}")
    print(f"   Equipos que tienen       : {total_tiene}  (celdas verdes  FF00FF00)")
    print(f"   Equipos con interés      : {total_interes}  (celdas celeste FF00FFFF)")
    print(f"\n📄 JSON guardado en: {salida}")
    print(f"\n👉 Sube ese JSON desde el CRM:")
    print(f"   Módulo Clientes → 'Importar planilla Sanicom' → selecciona {salida.name}\n")


if __name__ == '__main__':
    main()
