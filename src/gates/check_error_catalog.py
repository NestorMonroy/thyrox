#!/usr/bin/env python3
"""Gate: cada ``error-*.rst`` declara el vocabulario CERRADO del catalogo.

El catalogo de tipos de error (DEC-ERR-01..04, iniciativa
``catalogar-y-registrar-errores``) cierra cuatro claves que sin gate derivan a
texto libre. La evidencia de que derivan no es hipotetica: medido sobre la
referencia externa ``iact-docs@8673e59``, cuyos 21 archivos de error tienen la
misma FORMA que estos y ningun vocabulario ---

    type:      9 valores distintos sobre 16 archivos (5 no la declaran)
    severity:  7 grafias para 4 niveles (Alta/alta/Media/media/MEDIUM/...)
    status:    4 grafias para 2 estados

--- un agregado por tipo sobre ese corpus no es calculable. Este gate impide
que el nuestro llegue ahi.

Que mide, por archivo:

1. ``:clase:`` es ``proceso``. Un defecto de producto no vive en ``errores/``:
   su hogar es ``hallazgos/`` (DEC-ERR-01).
2. ``:tipo_error:`` esta en los seis valores cerrados (DEC-ERR-02).
3. ``:severidad:`` y ``:estado:`` reusan el vocabulario de hallazgos
   (DEC-ERR-04) --- no se acuña un tercero.
4. La etiqueta ``.. _err-NNN:`` coincide con el ``ERR-NNN`` del nombre del
   archivo. Un id que discrepa es un id que ninguna busqueda cruza.
5. Cada directorio ``errores/`` tiene su ``index.rst``, y ningun ``ERR-NNN``
   se repite entre directorios.

Y dos de CUMPLIMIENTO, que no miran el archivo sino su sitio (DEC-ERR-06) ---
porque los cuatro anteriores son ciegos justo a los dos modos que la
referencia externa exhibe:

6. Ningun archivo de error vive FUERA de un directorio ``errores/``. Se
   discrimina por el nombre ``error-ERR-NNN-`` o por la clave
   ``:tipo_error:`` en la cabecera.
7. El ``index.rst`` de cada hogar resuelve contra sus archivos, en las DOS
   direcciones: ni archivo sin entrada, ni entrada sin archivo.

Metrica: archivos ``error-*.rst`` bajo cualquier directorio ``errores/`` de
``source/gestion/pm``, y sus directorios contenedores.
Ciega a: que el ``:tipo_error:`` declarado sea el CORRECTO para el episodio
--- eso es juicio de contenido, no de vocabulario; el gate acota el universo
de valores, no elige dentro de el. Ciega tambien a los 24 registros
congelados de los dos monolitos (DEC-ERR-05), que no llevan la clave: su
triaje es la tarea #372. Y ciega, por construccion, al error que NUNCA se
escribio: no hay senal en el arbol que lo delate. Ese tercer modo queda
DESCONOCIDO declarado en DEC-ERR-06.

Uso:
    check_error_catalog.py                  # barre el alcance por defecto
    check_error_catalog.py --root <ruta>    # otra raiz (para las pruebas)
    check_error_catalog.py --strict         # exit 1 si hay incumplidores
    check_error_catalog.py --quiet          # solo el conteo
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys

CLASSES = ('producto', 'proceso')
TYPES = (
    'flujo',
    'artefacto-de-gestion',
    'conducta-del-agente',
    'instrumento',
    'gobierno',
    'entorno',
)
SEVERITIES = ('CRITICA', 'ALTA', 'MEDIA', 'BAJA')
STATES = ('DOCUMENTADO', 'RESUELTO')

META_KEY = re.compile(r'^\s+:([a-z_]+):\s*(.+?)\s*$')
LABEL = re.compile(r'^\.\. _(err-\d+):\s*$', re.MULTILINE)
ID_IN_NAME = re.compile(r'^error-(ERR-\d+)-')
TYPE_KEY = re.compile(r'^\s+:tipo_error:', re.MULTILINE)
TOCTREE_ENTRY = re.compile(r'^\s+(error-ERR-\d+-[\w-]+)\s*$', re.MULTILINE)


def parse_meta(text: str) -> dict:
    """Recupera las claves del bloque ``.. meta::`` de la cabecera.

    Sale del bloque en la primera linea sin sangria, para no arrastrar
    directivas posteriores que tambien usen el estilo ``:clave: valor``.
    """
    meta: dict[str, str] = {}
    inside = False
    for line in text.splitlines():
        if line.startswith('.. meta::'):
            inside = True
            continue
        if not inside:
            continue
        if line.strip() == '':
            continue
        if not line.startswith((' ', '\t')):
            break
        match = META_KEY.match(line)
        if match:
            meta[match.group(1)] = match.group(2)
    return meta


def defects_of_file(path: pathlib.Path, text: str) -> list[str]:
    """Defectos de vocabulario y de identidad de UN archivo de error.

    Cada cadena devuelta NOMBRA la clave que la origina: el conteo agregado
    sirve para el veredicto, y el nombre para saber que corregir sin abrir
    el archivo.
    """
    defects: list[str] = []
    meta = parse_meta(text)

    kind = meta.get('clase')
    if kind is None:
        defects.append('clase: no declarada')
    elif kind not in CLASSES:
        defects.append(f'clase: «{kind}» fuera de {CLASSES}')
    elif kind != 'proceso':
        defects.append(
            f'clase: «{kind}» no vive en errores/ — su hogar es hallazgos/ (DEC-ERR-01)'
        )

    error_type = meta.get('tipo_error')
    if error_type is None:
        defects.append('tipo_error: no declarado')
    elif error_type not in TYPES:
        defects.append(
            f'tipo_error: «{error_type}» fuera del vocabulario cerrado (DEC-ERR-02)'
        )

    severity = meta.get('severidad')
    if severity is None:
        defects.append('severidad: no declarada')
    elif severity not in SEVERITIES:
        defects.append(f'severidad: «{severity}» fuera de {SEVERITIES} (DEC-ERR-04)')

    state = meta.get('estado')
    if state is None:
        defects.append('estado: no declarado')
    elif state not in STATES:
        defects.append(f'estado: «{state}» fuera de {STATES} (DEC-ERR-04)')

    name_id = ID_IN_NAME.match(path.name)
    labels = LABEL.findall(text)
    if name_id is None:
        defects.append(f'nombre: «{path.name}» no sigue error-ERR-NNN-<slug>.rst')
    elif not labels:
        defects.append('etiqueta: el archivo no declara ninguna «.. _err-NNN:»')
    elif labels[0] != name_id.group(1).lower():
        defects.append(
            f'etiqueta: «{labels[0]}» no coincide con el id del nombre '
            f'«{name_id.group(1).lower()}»'
        )

    return defects


def strays(root: pathlib.Path, homes: list[pathlib.Path]) -> list[pathlib.Path]:
    """Archivos de error escritos FUERA de un directorio ``errores/``.

    El resto del gate mide la forma de lo que ya aterrizo en el hogar, asi
    que es ciego al documento que nunca llego. Medido en la referencia
    externa ``iact-docs@8673e59``: su hogar tiene 21 archivos y hay CUATRO
    documentos de error mas dispersos por dominio, fuera de el. Ver
    :ref:`analisis-documentacion-de-errores-en-iact-docs`.

    Discrimina por dos senales, cualquiera de las dos basta: el nombre
    ``error-ERR-NNN-`` o la clave ``:tipo_error:`` en la cabecera. La
    segunda existe porque un documento puede llevar el vocabulario sin
    seguir la convencion de nombre --- y ese es justo el caso que mas
    interesa ver.
    """
    base = root / 'source' / 'gestion' / 'pm'
    found: list[pathlib.Path] = []
    for path in sorted(base.rglob('*.rst')):
        if any(home in path.parents for home in homes):
            continue
        if ID_IN_NAME.match(path.name):
            found.append(path)
            continue
        head = path.read_text(encoding='utf-8', errors='replace')[:2000]
        if TYPE_KEY.search(head):
            found.append(path)
    return found


def index_mismatches(directory: pathlib.Path) -> list[str]:
    """Desacuerdos entre el ``index.rst`` del hogar y sus archivos.

    Las dos direcciones, porque son defectos distintos: un archivo sin
    entrada no se lee nunca desde el indice, y una entrada sin archivo
    rompe el ``toctree`` y miente sobre lo que hay. La referencia externa
    exhibe la primera --- 21 archivos contra 17 filas, con el tramo
    ERR-007..018 ausente sin que conste si existio.
    """
    index = directory / 'index.rst'
    if not index.exists():
        return []
    declared = set(TOCTREE_ENTRY.findall(index.read_text(encoding='utf-8')))
    present = {f.stem for f in directory.glob('error-*.rst')}
    problems = [f'{stem}.rst — sin entrada en index.rst' for stem in sorted(present - declared)]
    problems += [f'{stem} — entrada en index.rst sin archivo' for stem in sorted(declared - present)]
    return problems


def collect(root: pathlib.Path) -> tuple[list[pathlib.Path], list[pathlib.Path]]:
    """Los directorios ``errores/`` del alcance y sus archivos de error."""
    base = root / 'source' / 'gestion' / 'pm'
    if not base.is_dir():
        return [], []
    directories = sorted(p for p in base.rglob('errores') if p.is_dir())
    files = sorted(f for d in directories for f in d.glob('error-*.rst'))
    return directories, files


def main() -> int:
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--root', default=None)
    parser.add_argument('--strict', action='store_true')
    parser.add_argument('--quiet', action='store_true')
    args = parser.parse_args()

    root = pathlib.Path(args.root) if args.root else pathlib.Path(__file__).resolve().parents[3]
    directories, files = collect(root)

    if not directories:
        print(
            f'ERROR — no hay ningun directorio errores/ bajo {root}/source/gestion/pm.\n'
            'NO se emite conteo: un cero aqui no distinguiria «sin defectos» de '
            '«sin nada que medir» (sub-patron D de metrica-decide-la-conclusion.md).',
            file=sys.stderr,
        )
        return 2

    offenders = 0
    seen: dict[str, pathlib.Path] = {}
    collisions: list[str] = []

    for path in files:
        defects = defects_of_file(path, path.read_text(encoding='utf-8'))
        name_id = ID_IN_NAME.match(path.name)
        if name_id:
            identifier = name_id.group(1)
            if identifier in seen:
                collisions.append(f'{identifier}: {seen[identifier].name} · {path.name}')
            else:
                seen[identifier] = path
        if not defects:
            continue
        offenders += 1
        if args.quiet:
            continue
        print(f'  {path.relative_to(root)}')
        for defect in defects:
            print(f'      {defect}')

    outside = strays(root, directories)
    if outside and not args.quiet:
        for path in outside:
            print(f'  {path.relative_to(root)} — archivo de error fuera de errores/ (DEC-ERR-06)')

    mismatches = [
        f'{d.relative_to(root)} → {problem}'
        for d in directories
        for problem in index_mismatches(d)
    ]
    if mismatches and not args.quiet:
        for mismatch in mismatches:
            print(f'  {mismatch}')

    without_index = [d for d in directories if not (d / 'index.rst').exists()]
    if without_index and not args.quiet:
        for directory in without_index:
            print(f'  {directory.relative_to(root)} — sin index.rst')
    if collisions and not args.quiet:
        for collision in collisions:
            print(f'  id repetido entre directorios → {collision}')

    total = (offenders + len(without_index) + len(collisions)
             + len(outside) + len(mismatches))

    if args.quiet:
        print(total)
    else:
        verdict = 'OK' if not total else 'INCUMPLE'
        print(
            f'{verdict}: {total} incumplidor(es) '
            f'(alcance medido: {len(files)} archivos en {len(directories)} directorio(s) errores/)'
        )

    return 1 if (args.strict and total) else 0


if __name__ == '__main__':
    raise SystemExit(main())
