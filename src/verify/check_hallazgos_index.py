#!/usr/bin/env python3
"""Gate: coherencia interna de cada ``hallazgos/index.rst`` — la tabla
consigo misma y contra su toctree.

Cada índice sostiene el mismo par de listas escrito a mano dos veces: la
``list-table`` de ID · severidad · estado · resumen, y el ``toctree`` que
mete los archivos al árbol. Cuatro formas de coherencia sobre ese par, y
las cuatro fallan en silencio:

1. **Filas con menos celdas que la cabecera.** Sphinx no revienta una fila
   de 3 celdas en una tabla de 4 columnas — la rellena con vacío y sigue.
2. **Filas duplicadas** (mismo ``:ref:`` dos veces). El conteo total de
   filas sube igual que si fueran distintas, así que un total "cuadrado"
   no descarta duplicación — la esconde.
3. **Entradas de toctree duplicadas.** Mismo defecto, mismo instrumento
   ciego: una entrada repetida N veces cuenta como N documentos.
4. **Descoordinación tabla↔toctree** (heredado, H-DOCS-153): un archivo en
   el toctree sin fila, o una fila sin entrada en el toctree.

Las cuatro comparten un único origen medido: un ``index.rst`` real llegó a
tener las cuatro filas ``h-api-668``…``h-api-671`` duplicadas —cada una
con 3 celdas en una tabla de 4 columnas— y el toctree con las mismas
cuatro entradas repetidas. El total daba 80 filas y 80 entradas de
toctree sobre 76 nombres únicos: el conteo "cuadraba" precisamente porque
el defecto vivía a ambos lados por igual (``docs@b19396e4``, corregido en
``docs@9dd637cf``). Ningún check de un solo lado lo habría visto.

Métrica: filas y entradas de toctree contadas TAL COMO EXISTEN en el
archivo — sin deduplicar antes de contar.
Ciega a: que la severidad y el estado de una fila coincidan con los del
archivo del hallazgo que referencia — no hay vocabulario canónico para esas
dos columnas aún, y la deriva ya es medible (``CRITICA`` junto a ``CRÍTICA``,
``RESUELTO`` junto a ``CORREGIDO``). Sucesor: tarea **#523**, que fija el
canon y luego extiende este gate. Ciega también a cualquier ``:ref:`` que no
ocupe la primera celda de una fila, porque ésos son citas cruzadas a otra
iniciativa, no filas de esta tabla.

Uso:
    check_hallazgos_index.py                       # barre el alcance por defecto
    check_hallazgos_index.py <ruta> [<ruta> ...]    # sólo esos índices
    check_hallazgos_index.py --strict               # exit 1 si hay algún desajuste
    check_hallazgos_index.py --quiet                # sólo el conteo de índices con desajuste
"""
import argparse
import os
import re
import sys
from collections import Counter
from glob import glob

DEFAULT_PATTERN = 'source/gestion/pm/*/iniciativas/*/hallazgos/index.rst'

ROW_START = re.compile(r'^( *)\* - (.*)$')
LABEL = re.compile(r'^\.\. _([a-z0-9\-]+):', re.M)
REF = re.compile(r':ref:`([^`<]+)`')
TOCTREE_BLOCK = re.compile(r'\.\.\s+toctree::(.*?)(?:\n\S|\Z)', re.S)


def table_span(lines):
    """Rango ``[inicio, fin)`` del cuerpo del ``list-table``, o None si no hay tabla.

    El cuerpo termina en el ``toctree`` (que siempre lo sigue en este
    formato) o al final del archivo si no hay toctree.
    """
    start = None
    for i, line in enumerate(lines):
        if '.. list-table::' in line:
            start = i
        elif start is not None and '.. toctree::' in line:
            return start, i
    if start is not None:
        return start, len(lines)
    return None


def parse_rows(text):
    """Filas del ``list-table``, en orden y sin deduplicar.

    Cada fila es un dict ``{n_cells, ref, line}``. La primera fila
    devuelta es la cabecera (``ID · Severidad · …``); las demás son
    datos. Una celda nueva es una línea indentada dos espacios más que
    el ``* -`` de la fila y que empieza con ``- ``; cualquier otra línea
    es continuación (texto envuelto) de la celda anterior.
    """
    lines = text.split('\n')
    span = table_span(lines)
    if span is None:
        return []
    body = lines[span[0]:span[1]]
    starts = [i for i, l in enumerate(body) if ROW_START.match(l)]
    rows = []
    for n, idx in enumerate(starts):
        match = ROW_START.match(body[idx])
        indent = len(match.group(1))
        first_cell = match.group(2)
        end = starts[n + 1] if n + 1 < len(starts) else len(body)
        cell_marker = re.compile(r'^ {%d}- ' % (indent + 2))
        n_cells = 1 + sum(1 for l in body[idx + 1:end] if cell_marker.match(l))
        ref_match = REF.search(first_cell)
        rows.append({
            'n_cells': n_cells,
            'ref': ref_match.group(1) if ref_match else None,
            'line': span[0] + idx + 1,
        })
    return rows


def toctree_entries(text):
    """Nombres de documento listados en el toctree, en orden y SIN deduplicar."""
    block = TOCTREE_BLOCK.search(text)
    if not block:
        return []
    return [
        line.strip() for line in block.group(1).split('\n')
        if line.strip() and not line.strip().startswith(':')
    ]


def label_of(path):
    """La etiqueta ``.. _x:`` que declara el archivo, o None si no la tiene."""
    if not os.path.exists(path):
        return None
    match = LABEL.search(open(path, encoding='utf-8').read())
    return match.group(1) if match else None


def check(index_path):
    """Las cuatro clases de defecto para un único ``hallazgos/index.rst``."""
    text = open(index_path, encoding='utf-8').read()
    rows = parse_rows(text)
    data_rows = rows[1:]
    header_cells = rows[0]['n_cells'] if rows else None

    malformed = [
        row for row in data_rows
        if header_cells is not None and row['n_cells'] != header_cells
    ]
    ref_counts = Counter(row['ref'] for row in data_rows if row['ref'])
    duplicate_rows = sorted(ref for ref, n in ref_counts.items() if n > 1)

    entries = toctree_entries(text)
    entry_counts = Counter(entries)
    duplicate_entries = sorted(entry for entry, n in entry_counts.items() if n > 1)

    folder = os.path.dirname(index_path)
    table_refs = set(ref_counts)
    labels_by_doc = {}
    for doc in dict.fromkeys(entries):
        label = label_of(os.path.join(folder, doc + '.rst'))
        if label:
            labels_by_doc[doc] = label
    missing_row = {doc for doc, label in labels_by_doc.items() if label not in table_refs}
    missing_toctree = table_refs - set(labels_by_doc.values())

    return {
        'rows_total': len(data_rows),
        'entries_total': len(entries),
        'malformed': malformed,
        'duplicate_rows': duplicate_rows,
        'duplicate_entries': duplicate_entries,
        'missing_row': missing_row,
        'missing_toctree': missing_toctree,
    }


def has_defect(result):
    return bool(
        result['malformed'] or result['duplicate_rows']
        or result['duplicate_entries'] or result['missing_row']
        or result['missing_toctree']
    )


def display_name(index_path):
    if '/iniciativas/' in index_path:
        return index_path.split('/iniciativas/')[1].replace('/hallazgos/index.rst', '')
    return index_path


def main():
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('paths', nargs='*', help='índices concretos a revisar')
    parser.add_argument('--strict', action='store_true')
    parser.add_argument('--quiet', action='store_true')
    args = parser.parse_args()

    indices = sorted(args.paths) if args.paths else sorted(glob(DEFAULT_PATTERN))
    rows_total = 0
    entries_total = 0
    offenders = 0

    for index_path in indices:
        result = check(index_path)
        rows_total += result['rows_total']
        entries_total += result['entries_total']
        if not has_defect(result):
            continue
        offenders += 1
        if args.quiet:
            continue
        print(f'  {display_name(index_path)}')
        if result['malformed']:
            bad = ', '.join(
                f"{row['ref'] or ('línea ' + str(row['line']))} ({row['n_cells']} celdas)"
                for row in result['malformed']
            )
            print(f'      filas con menos celdas que la cabecera: {bad}')
        if result['duplicate_rows']:
            print(f"      filas duplicadas: {', '.join(result['duplicate_rows'])}")
        if result['duplicate_entries']:
            print(f"      toctree duplicado: {', '.join(result['duplicate_entries'])}")
        if result['missing_row']:
            print(f"      en toctree y sin fila : {', '.join(sorted(result['missing_row']))}")
        if result['missing_toctree']:
            print(f"      con fila y sin toctree: {', '.join(sorted(result['missing_toctree']))}")

    if args.quiet:
        print(offenders)
    else:
        verdict = 'OK' if not offenders else 'DESAJUSTE'
        print(
            f'{verdict}: {offenders} índice(s) con desajuste '
            f'(alcance medido: {len(indices)} índices, {rows_total} filas, '
            f'{entries_total} entradas de toctree)'
        )
    return 1 if (args.strict and offenders) else 0


if __name__ == '__main__':
    sys.exit(main())
