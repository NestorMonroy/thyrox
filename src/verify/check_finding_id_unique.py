#!/usr/bin/env python3
"""check_finding_id_unique.py — un número, un hallazgo, un ``.rst``.

El id de un hallazgo nace en dos sitios: el acuñador
(``src/hallazgo/hallazgo_ids.py``) lo propone contra el árbol del consumidor, y
``agent_store.py agregar-hallazgo`` lo escribe como fila. Este gate declara cuál
de los dos GOBIERNA y mide las dos caras de esa decisión.

**La dirección, medida antes de declararla.** Sobre los seis prefijos del
corpus, los números que viven **sólo** como fila del store eran cero en cinco de
ellos; el sexto (``THYROX``) tenía tres. O sea: el ``.rst`` ya era la fuente de
facto y el store ya era su índice — nadie lo había declarado, y por eso la unión
en lectura de :func:`hallazgo_ids.next_id` se leía como «dos fuentes iguales».
No lo son: el ``.rst`` es el artefacto de gobierno —lleva el cuerpo, su etiqueta
``:ref:`` y su fila en el índice de la iniciativa— y la fila es su entrada de
búsqueda entre sesiones.

De ahí las dos mitades:

**A — toda fila tiene su ``.rst``.** Una fila sin archivo es la ventana entre
registrar y escribir, que es legítima mientras dura; congelada, es deuda. Sin
esta mitad el store puede acumular ids que ningún artefacto de gobierno respalda,
y entonces sí serían dos fuentes.

**B — el relleno no crea un número nuevo.** ``H-THYROX-1`` y ``H-THYROX-01`` son
dos archivos con dos hallazgos distintos, y ``_ID_RE`` colapsa los dos a
``int(1)``: el acuñador ve un número donde hay dos. Es su ceguera por
construcción —normaliza a entero a propósito, porque el árbol escribe las dos
formas— así que el gate la cubre desde fuera.

Uso — con el cwd puesto en el CONSUMIDOR, que es de donde salen el corpus y el
baseline:

    T=/home/user/thyrox
    python3 "$T/src/verify/check_finding_id_unique.py"                # reporte
    python3 "$T/src/verify/check_finding_id_unique.py" --quiet        # sólo el conteo
    python3 "$T/src/verify/check_finding_id_unique.py" --strict       # exit 1 si hay nuevos
    python3 "$T/src/verify/check_finding_id_unique.py" --write-baseline

La deuda heredada se congela en ``finding_id_unique_baseline.txt``: una entrada
listada no bloquea, una nueva sí. Mismo criterio prospectivo que
``hallazgo_submodulo_baseline.txt``.
"""

import os
import pathlib
import re
import sqlite3
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))
import check_vocabulario_prosa as _parameter  # noqa: E402

PM_ROOT = pathlib.Path('source/gestion/pm')

BASELINE_NAME = 'finding_id_unique_baseline.txt'
BASELINE_VAR = 'FINDING_ID_UNIQUE_BASELINE'

#: El id tal como el corpus lo escribe: prefijo y número, con o sin relleno.
FINDING_ID_RE = re.compile(r'H-(?P<prefix>[A-Z]+)-(?P<number>\d+)')
FILENAME_RE = re.compile(r'hallazgo-(?P<finding_id>H-[A-Z]+-\d+)-')


def normalized(finding_id: str) -> str | None:
    """``H-THYROX-01`` y ``H-THYROX-1`` dan la MISMA clave.

    Es a propósito: la clave es el número que el acuñador ve, no la forma con
    que se escribió. Dos archivos que caen en la misma clave son la colisión
    que la mitad B mide.
    """
    match = FINDING_ID_RE.fullmatch(finding_id.strip().upper())
    if not match:
        return None
    return f"H-{match.group('prefix')}-{int(match.group('number'))}"


def store_path() -> pathlib.Path | None:
    """La ruta del store por la vía declarada, nunca compuesta aquí.

    Ausencia no es error: un consumidor sin store todavía mide su mitad B, y
    rehusar aquí ataría el gate a que el store exista.
    """
    declared = os.environ.get('THYROX_AGENT_STORE', '').strip()
    if declared:
        return pathlib.Path(declared).expanduser()
    try:
        from paths import reach
    except ImportError:
        return None
    return reach.agent_store_path()


def store_finding_ids(path: pathlib.Path | None) -> list[str]:
    """Los ``finding_id`` de ``findings_history``, o vacío si no hay store."""
    if path is None or not path.is_file():
        return []
    conn = sqlite3.connect(f'file:{path}?mode=ro', uri=True)
    try:
        return [row[0] for row in
                conn.execute('SELECT finding_id FROM findings_history')]
    except sqlite3.DatabaseError:
        return []           # el store existe y aún no tiene la tabla
    finally:
        conn.close()


def tree_findings(universe) -> dict[str, list[pathlib.Path]]:
    """Clave normalizada -> los ``.rst`` que la reclaman.

    Una clave con DOS archivos es la colisión de la mitad B.
    """
    claims: dict[str, list[pathlib.Path]] = {}
    for path in universe:
        match = FILENAME_RE.search(path.name)
        if not match:
            continue
        key = normalized(match.group('finding_id'))
        if key is not None:
            claims.setdefault(key, []).append(path)
    return claims


def read_baseline(measured=()):
    """Las entradas congeladas, o REHUSA.

    Devolver un conjunto vacío cuando el archivo no aparece publica la deuda
    heredada entera como nueva, y el conteo no distingue «no hay deuda» de «no
    encontré el baseline» — el sub-patrón D, que el gate hermano ya midió.
    """
    path = _parameter.resolve_parameter(BASELINE_NAME, BASELINE_VAR, measured)
    if not path.is_file():
        _parameter.refuse_without_parameter(
            BASELINE_NAME, BASELINE_VAR, path,
            'sin baseline, la deuda heredada se publicaria\n'
            '  entera como nueva. NO se emite conteo.')
    return {line.strip() for line in path.read_text(encoding='utf-8').splitlines()
            if line.strip() and not line.startswith('#')}


def baseline_destination(measured=()):
    """Donde ATERRIZA --write-baseline: el consumidor, nunca el proveedor."""
    declared = os.environ.get(BASELINE_VAR, '').strip()
    if declared:
        return pathlib.Path(declared)
    return _parameter.consumer_root(measured) / '.claude' / 'baselines' / BASELINE_NAME


def main() -> int:
    quiet = '--quiet' in sys.argv
    strict = '--strict' in sys.argv
    writing = '--write-baseline' in sys.argv

    universe = sorted(PM_ROOT.glob('*/iniciativas/*/hallazgos/hallazgo-*.rst'))
    claims = tree_findings(universe)

    # Mitad B — dos archivos bajo la misma clave.
    collisions = [(key, files) for key, files in sorted(claims.items())
                  if len(files) > 1]

    # Mitad A — fila del store sin ningun .rst que la respalde.
    orphans = []
    for finding_id in sorted(set(store_finding_ids(store_path()))):
        key = normalized(finding_id or '')
        if key is not None and key not in claims:
            orphans.append(finding_id)

    if writing:
        destination = baseline_destination(universe)
        destination.parent.mkdir(parents=True, exist_ok=True)
        frozen = sorted({f for f in orphans} | {key for key, _ in collisions})
        destination.write_text(
            '# Deuda heredada de check_finding_id_unique.py — congelada, no barrida.\n'
            '# Una entrada listada no bloquea; una nueva sí. Al escribir el .rst de\n'
            '# una fila huérfana, o al renumerar una colisión, quitar su línea.\n'
            + '\n'.join(frozen) + '\n', encoding='utf-8')
        print(f'baseline escrito en {destination}: {len(frozen)} entrada(s)')
        for entry in frozen:
            print(f'  {entry}')
        return 0

    base = read_baseline(universe)
    new_orphans = [o for o in orphans if o not in base and normalized(o) not in base]
    new_collisions = [(k, f) for k, f in collisions if k not in base]

    if quiet:
        print(len(new_orphans) + len(new_collisions))
    else:
        if new_orphans:
            print(f'check-finding-id-unique: {len(new_orphans)} fila(s) del store '
                  f'sin su .rst')
            for finding_id in new_orphans:
                print(f'  {finding_id}')
                print(f'      → escribir su hallazgo en pm/<submodulo>/iniciativas/'
                      f'<slug>/hallazgos/')
        if new_collisions:
            print(f'check-finding-id-unique: {len(new_collisions)} colisión(es) de '
                  f'relleno — dos hallazgos bajo un número')
            for key, files in new_collisions:
                print(f'  {key}')
                for path in files:
                    print(f'      {path}')
        if not new_orphans and not new_collisions:
            print('OK: 0 fila(s) huérfana(s) · 0 colisión(es) de relleno')
        inherited = ((len(orphans) - len(new_orphans))
                     + (len(collisions) - len(new_collisions)))
        print(f'  (alcance medido: {len(universe)} hallazgo(s) en el árbol, '
              f'{len(set(store_finding_ids(store_path())))} fila(s) en el store; '
              f'{inherited} en baseline heredado)')

    return 1 if (strict and (new_orphans or new_collisions)) else 0


if __name__ == '__main__':
    sys.exit(main())
