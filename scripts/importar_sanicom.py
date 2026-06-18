#!/usr/bin/env python3
"""
Importador de Planilla Sanicom (Carlos)
========================================
Detecta automáticamente si el Excel es la planilla de Fisioterapia o la de
Podología leyendo los encabezados de la fila 5, y aplica la estructura correcta.

── Planilla Fisioterapia ──────────────────────────────────────────────────────
  Fila 5  → encabezados
  Fila 9+ → datos (filas 6-8 son cabeceras visuales / espaciado)

  Col  1  Diatermia       ┐
  Col  2  O.Choque        │
  Col  3  ECO             │ Columnas de equipos
  Col  4  Magneto         │ Color de la celda indica:
  Col  5  Láser           │   FF00FF00 (verde)  → equipo que TIENE
  Col  6  Radio           │   FF00FFFF (celeste) → equipo con INTERÉS
  Col  7  Otros           │   FFFFFFFF (blanco)  → ignorar
  Col  8  Otros 2         │
  Col  9  Otros 3         ┘
  Col 12  NOMBRE
  Col 13  DIRECCION
  Col 14  POB.
  Col 15  PROV.
  Col 16  C.P
  Col 17  TELEFONO
  Col 18  E-MAIL
  Col 19  WEB
  Col 20  OBSERVACIONES

── Planilla Podología ─────────────────────────────────────────────────────────
  Fila 5  → encabezados
  Fila 6+ → datos

  Col  1  Diatermia       ┐
  Col  2  Ondas de choque │ Columnas de equipos (mismas reglas de colores)
  Col  3  Ecógrafo        │
  Col  4  Otros           ┘
  Col  5  NOMBRE
  Col  6  DIRECCION
  Col  7  PROVINCIA
  Col  8  LOCALIDAD
  Col  9  C.P.
  Col 10  TELEFONO
  Col 11  E-MAIL
  Col 12  WEB
  Col 13  OBSERVACIONES

Uso:
  python importar_sanicom.py planilla.xlsx
  python importar_sanicom.py planilla.xlsx --verbose
  python importar_sanicom.py planilla.xlsx -o salida.json

Requiere: pip install openpyxl
"""

import json
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
# CONFIGURACIONES POR TIPO DE PLANILLA
# ═══════════════════════════════════════════════════════════════════════════════

PLANILLAS = {
    'fisioterapia': {
        'nombre':       'Fisioterapia',
        'especialidad': 'Fisioterapia',
        'fila_cabecera': 5,
        'fila_datos':    9,
        'cols_equipos': {
            1: 'Diatermia',
            2: 'O.Choque',
            3: 'ECO',
            4: 'Magneto',
            5: 'Láser',
            6: 'Radio',
            7: 'Otros',
            8: 'Otros 2',
            9: 'Otros 3',
        },
        'col_nombre':        12,
        'col_direccion':     13,
        'col_ciudad':        14,   # POB.
        'col_provincia':     15,   # PROV.
        'col_cp':            16,
        'col_telefono':      17,
        'col_email':         18,
        'col_web':           19,
        'col_observaciones': 20,
        # Celda detectora: col 12 contiene "NOMBRE" en la fila de cabecera
        'detect_col':  12,
        'detect_text': 'nombre',
    },
    'podologia': {
        'nombre':       'Podología',
        'especialidad': 'Podología',
        'fila_cabecera': 5,
        'fila_datos':    6,
        'cols_equipos': {
            1: 'Diatermia',
            2: 'Ondas de choque',
            3: 'Ecógrafo',
            4: 'Otros',
        },
        'col_nombre':        5,
        'col_direccion':     6,
        'col_ciudad':        8,   # LOCALIDAD
        'col_provincia':     7,   # PROVINCIA
        'col_cp':            9,
        'col_telefono':      10,
        'col_email':         11,
        'col_web':           12,
        'col_observaciones': 13,
        # Celda detectora: col 5 contiene "NOMBRE" en la fila de cabecera
        'detect_col':  5,
        'detect_text': 'nombre',
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# COLORES EXACTOS (ARGB formato openpyxl: 8 caracteres hex AARRGGBB)
# ═══════════════════════════════════════════════════════════════════════════════

COLOR_VERDE   = 'FF00FF00'   # Verde puro  → equipo que TIENE
COLOR_CELESTE = 'FF00FFFF'   # Cyan puro   → equipo con INTERÉS
COLOR_BLANCO  = 'FFFFFFFF'   # Blanco      → ignorar
COLOR_TRANS   = '00000000'   # Transparente → ignorar


def get_cell_color_type(cell):
    """
    Retorna 'verde', 'celeste' o None según el color ARGB exacto del relleno.
    """
    try:
        fill = cell.fill
        if fill is None or fill.fill_type in (None, 'none'):
            return None

        argb = None

        fgc = fill.fgColor
        if fgc and fgc.type == 'rgb':
            argb = fgc.rgb.upper()

        if not argb or argb in (COLOR_BLANCO, COLOR_TRANS):
            bgc = fill.bgColor
            if bgc and bgc.type == 'rgb':
                argb = bgc.rgb.upper()

        if not argb or argb in (COLOR_BLANCO, COLOR_TRANS):
            return None

        if argb == COLOR_VERDE:
            return 'verde'
        if argb == COLOR_CELESTE:
            return 'celeste'

    except Exception:
        pass

    return None


# ═══════════════════════════════════════════════════════════════════════════════
# DETECCIÓN AUTOMÁTICA
# ═══════════════════════════════════════════════════════════════════════════════

def detectar_tipo_planilla(ws):
    """
    Lee la fila de cabecera (fila 5) y devuelve la clave del tipo de planilla.
    Prueba cada configuración buscando el texto esperado en la columna detectora.
    """
    for clave, cfg in PLANILLAS.items():
        fila = cfg['fila_cabecera']
        col  = cfg['detect_col']
        val  = ws.cell(row=fila, column=col).value
        if val and str(val).strip().lower() == cfg['detect_text']:
            return clave

    return None


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def normalizar(val):
    """Devuelve el valor como string limpio, o '' si es None/vacío."""
    if val is None:
        return ''
    s = str(val).strip()
    if s.endswith('.0') and s[:-2].isdigit():
        s = s[:-2]
    return s


def cell_val(ws, row, col):
    return normalizar(ws.cell(row=row, column=col).value)


# ═══════════════════════════════════════════════════════════════════════════════
# PROCESADO
# ═══════════════════════════════════════════════════════════════════════════════

def procesar_hoja(ws, nombre_hoja, cfg, verbose=False):
    """Procesa una hoja según la configuración dada y devuelve lista de clientes."""
    clientes = []

    fila_datos        = cfg['fila_datos']
    cols_equipos      = cfg['cols_equipos']
    col_nombre        = cfg['col_nombre']
    col_direccion     = cfg['col_direccion']
    col_ciudad        = cfg['col_ciudad']
    col_provincia     = cfg['col_provincia']
    col_cp            = cfg['col_cp']
    col_telefono      = cfg['col_telefono']
    col_email         = cfg['col_email']
    col_web           = cfg['col_web']
    col_observaciones = cfg['col_observaciones']
    especialidad      = cfg['especialidad']

    for row_idx in range(fila_datos, ws.max_row + 1):
        nombre = cell_val(ws, row_idx, col_nombre)
        if not nombre:
            continue

        provincia_celda = cell_val(ws, row_idx, col_provincia)
        cliente = {
            'nombre':       nombre,
            'direccion':    cell_val(ws, row_idx, col_direccion),
            'ciudad':       cell_val(ws, row_idx, col_ciudad) or nombre_hoja,
            'provincia':    provincia_celda or nombre_hoja,
            'cp':           cell_val(ws, row_idx, col_cp),
            'telefono':     cell_val(ws, row_idx, col_telefono),
            'email':        cell_val(ws, row_idx, col_email),
            'web':          cell_val(ws, row_idx, col_web),
            'especialidad': especialidad,
            'tipo':         'Clínica',
            'estado':       'Activo',
            'equiposInstalados': [],
            'equiposInteres':    [],
        }

        obs = cell_val(ws, row_idx, col_observaciones)
        if obs:
            cliente['notas'] = obs

        tiene   = []
        interes = []
        for col_idx, eq_nombre in cols_equipos.items():
            cell = ws.cell(row=row_idx, column=col_idx)

            val_celda = normalizar(cell.value)
            if not val_celda:
                continue

            color = get_cell_color_type(cell)
            if color not in ('verde', 'celeste'):
                continue

            if val_celda.strip().lower() == eq_nombre.strip().lower():
                continue

            nombre_equipo = f"{eq_nombre}: {val_celda}"

            if color == 'verde':
                cliente['equiposInstalados'].append({
                    'id':              f"imp_{row_idx}_{col_idx}",
                    'nombre':          nombre_equipo,
                    'marca':           '',
                    'modelo':          '',
                    'nSerie':          '',
                    'anioInstalacion': '',
                    'distribuidor':    '',
                    'estado':          'Operativo',
                })
                tiene.append(nombre_equipo)

            elif color == 'celeste':
                cliente['equiposInteres'].append({
                    'id':     f"imp_int_{row_idx}_{col_idx}",
                    'nombre': nombre_equipo,
                })
                interes.append(nombre_equipo)

        clientes.append(cliente)

        if verbose and (tiene or interes):
            print(f"    [{nombre[:35]:<35}]  "
                  f"Tiene: {tiene or '-'}  |  Interés: {interes or '-'}")

    return clientes


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description='Importador de planilla Sanicom')
    parser.add_argument('archivo', help='Ruta al archivo Excel (.xlsx)')
    parser.add_argument('-o', '--output', default=None,
                        help='Archivo JSON de salida (default: clientes_sanicom.json junto al Excel)')
    parser.add_argument('--verbose', '-v', action='store_true',
                        help='Muestra equipos detectados por fila')
    args = parser.parse_args()

    archivo = Path(args.archivo)
    if not archivo.exists():
        print(f"\nERROR: No se encuentra el archivo: {archivo}\n")
        sys.exit(1)

    print(f"\n📂 Leyendo: {archivo.name}")
    wb = openpyxl.load_workbook(archivo, data_only=True)
    print(f"   Hojas encontradas ({len(wb.sheetnames)}): {', '.join(wb.sheetnames)}")

    # Detectar tipo de planilla usando la primera hoja
    primera_hoja = wb[wb.sheetnames[0]]
    tipo_detectado = detectar_tipo_planilla(primera_hoja)

    if tipo_detectado is None:
        print("\nERROR: No se pudo detectar el tipo de planilla.")
        print("  Se esperaba encontrar 'NOMBRE' en la columna 5 (Podología)")
        print("  o en la columna 12 (Fisioterapia) de la fila 5.\n")
        sys.exit(1)

    cfg = PLANILLAS[tipo_detectado]
    print(f"   Tipo detectado: {cfg['nombre']} ✓")
    print(f"   Encabezados en fila {cfg['fila_cabecera']}, datos desde fila {cfg['fila_datos']}\n")

    todos_clientes = []

    print(f"⚙️  Procesando...\n")
    for nombre_hoja in wb.sheetnames:
        ws = wb[nombre_hoja]
        clientes = procesar_hoja(ws, nombre_hoja, cfg, verbose=args.verbose)
        todos_clientes.extend(clientes)

        n_verde   = sum(1 for c in clientes if c['equiposInstalados'])
        n_celeste = sum(1 for c in clientes if c['equiposInteres'])
        print(f"  ✔ {nombre_hoja:<22} {len(clientes):3d} clientes  "
              f"(verde: {n_verde:3d}, celeste: {n_celeste:3d})")

    salida = Path(args.output) if args.output else archivo.parent / 'clientes_sanicom.json'
    with open(salida, 'w', encoding='utf-8') as f:
        json.dump(todos_clientes, f, ensure_ascii=False, indent=2)

    total         = len(todos_clientes)
    total_equipos = sum(len(c['equiposInstalados']) for c in todos_clientes)
    total_interes = sum(len(c['equiposInteres'])    for c in todos_clientes)

    print(f"\n{'─'*50}")
    print(f"✅ Planilla:               {cfg['nombre']}")
    print(f"   Especialidad asignada:  {cfg['especialidad']}")
    print(f"   Total clientes:         {total}")
    print(f"   Equipos que tienen:    {total_equipos}  (celdas verdes  FF00FF00)")
    print(f"   Equipos con interés:   {total_interes}  (celdas celeste FF00FFFF)")
    print(f"\n📄 JSON guardado en: {salida}")
    print(f"\n👉 Sube ese JSON desde el CRM:")
    print(f"   Módulo Clientes → 'Importar planilla Sanicom' → selecciona {salida.name}\n")


if __name__ == '__main__':
    main()
