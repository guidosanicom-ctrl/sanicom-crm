#!/usr/bin/env python3
"""
Importador de Planilla Sanicom (Carlos)
========================================
Lee el archivo Excel con openpyxl para conservar los colores de celda.

Reglas de color:
  VERDE   → equipo guardado en "Equipos que tiene" (ya lo tiene el cliente)
  CELESTE → equipo guardado en "Equipos con interés" (le interesa comprarlo)
  Sin color / vacío → ignorado

Uso:
  python importar_sanicom.py planilla.xlsx
  python importar_sanicom.py planilla.xlsx --descubrir   # Imprime columnas encontradas
  python importar_sanicom.py planilla.xlsx -o salida.json

Requiere: pip install openpyxl
"""

import json
import sys
import os
import argparse
from pathlib import Path
from datetime import datetime

try:
    import openpyxl
    from openpyxl.styles.colors import COLOR_INDEX, aRGB_REGEX
except ImportError:
    print("\nERROR: Necesitas instalar openpyxl:")
    print("  pip install openpyxl\n")
    sys.exit(1)


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN — Ajusta los nombres de columna a los de tu planilla
# Si una columna no existe en tu planilla, pon None
# ═══════════════════════════════════════════════════════════════════════════════
CONFIG = {
    # Columnas de datos del cliente (tal como aparecen en la cabecera del Excel)
    'col_nombre':        'NOMBRE',          # col 17
    'col_direccion':     'DIRECCION',       # col 18
    'col_ciudad':        'POB.',            # col 19 — Población
    'col_provincia':     'PROV.',           # col 20
    'col_cp':            'C.P',             # col 21
    'col_telefono':      'TELEFONO',        # col 22
    'col_email':         'E-MAIL',          # col 23
    'col_web':           'WEB',             # col 24
    'col_observaciones': 'OBSERVACIONES',   # col 25

    # Fila donde están los encabezados (fila 5 en la planilla de Carlos)
    'fila_cabecera': 5,

    # Valores por defecto para todos los clientes importados
    'especialidad': 'Fisioterapia',
    'tipo':         'Clínica',
    'estado':       'Activo',
}

# Hojas a procesar: None = todas las hojas del libro
# o una lista: ['Sevilla', 'Málaga', 'Córdoba', ...]
HOJAS = None

# ═══════════════════════════════════════════════════════════════════════════════
# DETECCIÓN DE COLORES
# ═══════════════════════════════════════════════════════════════════════════════

# Colores concretos que Excel usa habitualmente para verde y celeste.
# Añade aquí los ARGB exactos de tu planilla si los detectas con --descubrir.
COLORES_VERDE_EXACTOS = {
    '00FF00', 'FF00FF00', '9200FF00',       # Verde puro
    'FF92D050', '92D050',                   # Verde Excel "claro"
    'FF00B050', '00B050',                   # Verde Excel "medio"
    'FF70AD47', '70AD47',                   # Verde Excel "oscuro"
    'FF548235', '548235',                   # Verde oscuro
    'FFC6EFCE', 'C6EFCE',                   # Verde muy claro (condicional)
}

COLORES_CELESTE_EXACTOS = {
    'FF00B0F0', '00B0F0',                   # Azul claro Excel "Accent 5"
    'FF9BC2E6', '9BC2E6',                   # Azul claro
    'FFBDD7EE', 'BDD7EE',                   # Azul muy claro
    'FF4BACC6', '4BACC6',                   # Cyan
    'FF17375E', '17375E',                   # Azul oscuro (probablemente no)
    'FFDCE6F1', 'DCE6F1',                   # Azul muy pálido
    'FF93CDDD', '93CDDD',                   # Celeste medio
    'FFCDD1FF', 'CDD1FF',                   # Lila/celeste
}


def rgb_to_components(argb: str):
    """Convierte 'FFRRGGBB' o 'RRGGBB' a (r, g, b) en 0-255."""
    argb = argb.strip().lstrip('#')
    if len(argb) == 8:
        r = int(argb[2:4], 16)
        g = int(argb[4:6], 16)
        b = int(argb[6:8], 16)
    elif len(argb) == 6:
        r = int(argb[0:2], 16)
        g = int(argb[2:4], 16)
        b = int(argb[4:6], 16)
    else:
        return None
    return r, g, b


def classify_color_by_rgb(r, g, b):
    """Clasifica un color RGB en 'verde', 'celeste' o None."""
    luminance = (r + g + b) / 3
    if luminance > 245:   # Blanco / casi blanco → no hay relleno real
        return None
    if luminance < 10:    # Negro → fondo oscuro, ignorar
        return None

    # Verde: canal G dominante, R y B bastante por debajo
    if g > 120 and g > r * 1.25 and g > b * 1.15:
        return 'verde'

    # Celeste / Cyan: B alto o (G + B altos) con R bajo
    if b > 130 and r < b * 0.85:
        return 'celeste'
    if g > 130 and b > 130 and r < 180 and abs(g - b) < 80:
        return 'celeste'

    return None


def get_cell_color_type(cell):
    """
    Retorna 'verde', 'celeste' o None según el color de fondo de la celda.
    Intenta primero listas exactas de colores conocidos, luego análisis RGB.
    """
    try:
        fill = cell.fill
        if fill is None or fill.fill_type in (None, 'none'):
            return None

        fgc = fill.fgColor
        if fgc is None:
            return None

        if fgc.type == 'rgb':
            argb = fgc.rgb
            if not argb or argb in ('00000000', 'FFFFFFFF'):
                return None  # Transparente o blanco

            # Comprueba lista exacta primero
            argb_norm = argb.upper().lstrip('0') or '0'
            for col in COLORES_VERDE_EXACTOS:
                if argb.upper() == col.upper() or argb.upper().lstrip('F') == col.lstrip('F').upper():
                    return 'verde'
            for col in COLORES_CELESTE_EXACTOS:
                if argb.upper() == col.upper():
                    return 'celeste'

            # Análisis RGB genérico
            comps = rgb_to_components(argb)
            if comps:
                return classify_color_by_rgb(*comps)

        elif fgc.type == 'theme':
            # Los colores de tema son complejos; intenta via patternFill bgColor
            bgc = fill.bgColor
            if bgc and bgc.type == 'rgb':
                comps = rgb_to_components(bgc.rgb)
                if comps:
                    return classify_color_by_rgb(*comps)

        elif fgc.type == 'indexed':
            # Colores indexados de Excel heredado
            # Índice 10 = rojo, 11 = verde claro, 33 = amarillo, 41 = azul...
            idx = getattr(fgc, 'indexed', None)
            if idx in (11, 17, 50, 51, 57):   # verdes comunes
                return 'verde'
            if idx in (5, 33, 39, 41, 44):    # azules/cyans comunes
                return 'celeste'

    except Exception:
        pass

    return None


# ═══════════════════════════════════════════════════════════════════════════════
# PROCESADO DEL EXCEL
# ═══════════════════════════════════════════════════════════════════════════════

def normalizar(s):
    return str(s).strip() if s is not None else ''


def col_index(ws, nombre_col, fila_cab):
    """Devuelve el índice de columna (1-based) para un encabezado dado.
    Compara quitando puntos, espacios y tildes para mayor tolerancia."""
    if nombre_col is None:
        return None

    def simplify(s):
        return s.lower().replace('.', '').replace(' ', '').replace('-', '')

    buscar = simplify(nombre_col)
    for cell in ws[fila_cab]:
        val = simplify(normalizar(cell.value))
        if val == buscar or buscar in val or val in buscar:
            return cell.column
    return None


def cell_val(ws, row_idx, col_idx):
    if col_idx is None:
        return ''
    cell = ws.cell(row=row_idx, column=col_idx)
    return normalizar(cell.value)


def descubrir_columnas(wb):
    """Modo descubrimiento: imprime encabezados de cada hoja."""
    print("\n📋 COLUMNAS ENCONTRADAS EN EL ARCHIVO\n" + "─" * 50)
    for nombre_hoja in wb.sheetnames:
        ws = wb[nombre_hoja]
        fila_cab = CONFIG['fila_cabecera']
        headers = [normalizar(cell.value) for cell in ws[fila_cab] if normalizar(cell.value)]
        print(f"\n  Hoja '{nombre_hoja}' ({ws.max_row} filas, {ws.max_column} columnas):")
        for i, h in enumerate(headers, 1):
            print(f"    Col {i:02d}: {h}")
    print("\n💡 Ajusta los nombres en CONFIG al inicio del script y vuelve a ejecutar sin --descubrir\n")


def procesar_hoja(ws, nombre_hoja, verbose=False):
    """Procesa una hoja y devuelve lista de clientes."""
    fila_cab = CONFIG['fila_cabecera']

    # Mapeo columna → índice
    cols = {
        'nombre':        col_index(ws, CONFIG['col_nombre'], fila_cab),
        'direccion':     col_index(ws, CONFIG['col_direccion'], fila_cab),
        'ciudad':        col_index(ws, CONFIG['col_ciudad'], fila_cab),
        'provincia':     col_index(ws, CONFIG.get('col_provincia'), fila_cab),
        'cp':            col_index(ws, CONFIG['col_cp'], fila_cab),
        'telefono':      col_index(ws, CONFIG['col_telefono'], fila_cab),
        'email':         col_index(ws, CONFIG['col_email'], fila_cab),
        'web':           col_index(ws, CONFIG['col_web'], fila_cab),
        'observaciones': col_index(ws, CONFIG['col_observaciones'], fila_cab),
    }

    # Columnas de datos del cliente (para no confundirlas con columnas de equipos)
    cols_cliente = set(v for v in cols.values() if v is not None)

    # Todas las columnas del Excel: las que NO son de cliente son de equipo
    cabeceras = {}
    for cell in ws[fila_cab]:
        val = normalizar(cell.value)
        if val:
            cabeceras[cell.column] = val

    cols_equipo = {c: name for c, name in cabeceras.items() if c not in cols_cliente}

    if verbose:
        print(f"  → Columnas de equipo detectadas: {list(cols_equipo.values())}")

    if cols['nombre'] is None:
        # Muestra los encabezados reales de la fila de cabecera para facilitar el diagnóstico
        headers_reales = [normalizar(cell.value) for cell in ws[fila_cab] if normalizar(cell.value)]
        print(f"  ⚠️  No se encontró '{CONFIG['col_nombre']}' en hoja '{nombre_hoja}' (fila {fila_cab}).")
        print(f"     Encabezados encontrados: {headers_reales}")
        print(f"     Ajusta 'col_nombre' y 'fila_cabecera' en CONFIG al inicio del script.")
        return []

    clientes = []
    fila_inicio = fila_cab + 1

    for row_idx in range(fila_inicio, ws.max_row + 1):
        nombre = cell_val(ws, row_idx, cols['nombre'])
        if not nombre:
            continue  # Fila vacía, omitir

        # Datos base del cliente
        # La provincia viene de la columna PROV. si existe; si no, del nombre de la hoja
        provincia_celda = cell_val(ws, row_idx, cols['provincia'])
        cliente = {
            'nombre':       nombre,
            'direccion':    cell_val(ws, row_idx, cols['direccion']),
            'ciudad':       cell_val(ws, row_idx, cols['ciudad']) or nombre_hoja,
            'cp':           cell_val(ws, row_idx, cols['cp']),
            'telefono':     cell_val(ws, row_idx, cols['telefono']),
            'email':        cell_val(ws, row_idx, cols['email']),
            'web':          cell_val(ws, row_idx, cols['web']),
            'provincia':    provincia_celda or nombre_hoja,
            'especialidad': CONFIG['especialidad'],
            'tipo':         CONFIG['tipo'],
            'estado':       CONFIG['estado'],
            'equiposInstalados': [],   # Verde → tiene el equipo
            'equiposInteres':    [],   # Celeste → tiene interés
        }

        observaciones = cell_val(ws, row_idx, cols['observaciones'])
        if observaciones:
            cliente['notas'] = observaciones

        # Procesar columnas de equipo
        colores_vistos = {}  # Para debug
        for col_idx, eq_nombre in cols_equipo.items():
            cell = ws.cell(row=row_idx, column=col_idx)
            color_type = get_cell_color_type(cell)
            val_celda = normalizar(cell.value)

            # El nombre del equipo puede venir de la cabecera o del contenido de la celda
            nombre_equipo = val_celda if val_celda else eq_nombre

            if color_type == 'verde':
                cliente['equiposInstalados'].append({
                    'id': f"imp_{row_idx}_{col_idx}",
                    'nombre': nombre_equipo,
                    'marca': '',
                    'modelo': '',
                    'nSerie': '',
                    'anioInstalacion': '',
                    'distribuidor': '',
                    'estado': 'Operativo',
                })
                colores_vistos[eq_nombre] = 'VERDE'
            elif color_type == 'celeste':
                cliente['equiposInteres'].append({
                    'id': f"imp_int_{row_idx}_{col_idx}",
                    'nombre': nombre_equipo,
                })
                colores_vistos[eq_nombre] = 'CELESTE'

        clientes.append(cliente)

        if verbose and colores_vistos:
            tiene = [k for k, v in colores_vistos.items() if v == 'VERDE']
            interes = [k for k, v in colores_vistos.items() if v == 'CELESTE']
            print(f"    [{nombre[:30]}] Tiene: {tiene or '-'}  Interés: {interes or '-'}")

    return clientes


def main():
    parser = argparse.ArgumentParser(description='Importador de planilla Sanicom')
    parser.add_argument('archivo', help='Ruta al archivo Excel (.xlsx)')
    parser.add_argument('-o', '--output', default=None, help='Archivo JSON de salida (default: clientes_sanicom.json)')
    parser.add_argument('--descubrir', action='store_true', help='Imprime columnas encontradas y sale')
    parser.add_argument('--verbose', action='store_true', help='Muestra detalles de cada fila procesada')
    args = parser.parse_args()

    archivo = Path(args.archivo)
    if not archivo.exists():
        print(f"ERROR: No se encuentra el archivo: {archivo}")
        sys.exit(1)

    print(f"\n📂 Leyendo: {archivo.name}")
    wb = openpyxl.load_workbook(archivo, data_only=True)
    print(f"   Hojas encontradas: {wb.sheetnames}")

    # Modo descubrimiento
    if args.descubrir:
        descubrir_columnas(wb)
        return

    # Selección de hojas
    hojas_a_procesar = HOJAS if HOJAS else wb.sheetnames
    hojas_validas = [h for h in hojas_a_procesar if h in wb.sheetnames]
    if not hojas_validas:
        print("ERROR: Ninguna de las hojas configuradas existe en el archivo.")
        sys.exit(1)

    # Procesado
    todos_clientes = []
    resumen = {}

    print(f"\n⚙️  Procesando {len(hojas_validas)} hojas...\n")
    for nombre_hoja in hojas_validas:
        ws = wb[nombre_hoja]
        clientes = procesar_hoja(ws, nombre_hoja, verbose=args.verbose)
        todos_clientes.extend(clientes)
        n_verde = sum(1 for c in clientes if c['equiposInstalados'])
        n_celeste = sum(1 for c in clientes if c['equiposInteres'])
        resumen[nombre_hoja] = {'clientes': len(clientes), 'con_equipos': n_verde, 'con_interes': n_celeste}
        print(f"  ✔ {nombre_hoja:20s} → {len(clientes):3d} clientes  "
              f"(verde: {n_verde}, celeste: {n_celeste})")

    # Guardar JSON
    salida = Path(args.output) if args.output else archivo.parent / 'clientes_sanicom.json'
    with open(salida, 'w', encoding='utf-8') as f:
        json.dump(todos_clientes, f, ensure_ascii=False, indent=2)

    total = len(todos_clientes)
    total_equipos = sum(len(c['equiposInstalados']) for c in todos_clientes)
    total_interes = sum(len(c['equiposInteres']) for c in todos_clientes)

    print(f"\n{'─'*50}")
    print(f"✅ Total clientes:         {total}")
    print(f"   Equipos (verde):        {total_equipos}")
    print(f"   Con interés (celeste):  {total_interes}")
    print(f"\n📄 JSON guardado en: {salida}")
    print(f"\n👉 Ahora sube ese JSON desde el CRM:")
    print(f"   Módulo Clientes → 'Importar planilla Sanicom' → selecciona {salida.name}\n")


if __name__ == '__main__':
    main()
