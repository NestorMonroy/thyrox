#!/usr/bin/env python3
"""check_hallazgo_submodulo.py — los tres signos del submódulo de un hallazgo.

Un hallazgo declara su capa **tres veces** y las tres tienen que coincidir:

1. el **prefijo del ID** en el nombre del archivo — ``hallazgo-H-DOCS-226-…``
2. la clave ``:submodulo:`` de su bloque ``.. meta::``
3. el segmento ``<submodulo>`` de su ruta —
   ``source/gestion/pm/<submodulo>/iniciativas/<slug>/hallazgos/``

``hallazgos-documentacion-obligatoria.md`` lo fija en una frase: *"«<submodulo>»
sigue determinado por la capa del hallazgo (api / ui / server / db / docs), **no
por dónde se descubrió**"*. Un hallazgo de capa ``docs`` producido mientras se
trabajaba una iniciativa de ``api`` va a una iniciativa de ``docs``; la de ``api``
lo cruza con ``:ref:``.

Uso:
    python3 .claude/scripts/gates/check_hallazgo_submodulo.py              # reporte
    python3 .claude/scripts/gates/check_hallazgo_submodulo.py --quiet      # sólo el conteo
    python3 .claude/scripts/gates/check_hallazgo_submodulo.py --strict     # exit 1 si hay nuevos
    python3 .claude/scripts/gates/check_hallazgo_submodulo.py <archivos>   # sólo ésos
    python3 .claude/scripts/gates/check_hallazgo_submodulo.py --write-baseline

La deuda heredada se congela en ``hallazgo_submodulo_baseline.txt``: una ruta
listada no bloquea, una nueva sí. Mismo criterio prospectivo que
``identifier_language_baseline.txt`` y el grifo cerrado de la tarea #313.
"""

import pathlib
import re
import sys

RAIZ_PM = pathlib.Path('source/gestion/pm')
BASELINE = pathlib.Path(__file__).parent / 'hallazgo_submodulo_baseline.txt'
PATRON_RUTA = re.compile(
    r'source/gestion/pm/(?P<carpeta>[^/]+)/iniciativas/[^/]+/hallazgos/'
    r'hallazgo-H-(?P<prefijo>[A-Z]+)-'
)
PATRON_META = re.compile(r'^\s*:submodulo:\s*(\S+)', re.M)


def signos(ruta):
    """Devuelve (prefijo_id, meta, carpeta) o None si la ruta no es un hallazgo."""
    m = PATRON_RUTA.search(str(ruta).replace('\\', '/'))
    if not m:
        return None
    try:
        texto = pathlib.Path(ruta).read_text(encoding='utf-8')
    except OSError:
        return None
    mm = PATRON_META.search(texto)
    return (m.group('prefijo').lower(),
            mm.group(1).strip().lower() if mm else '(ausente)',
            m.group('carpeta').lower())


def leer_baseline():
    if not BASELINE.exists():
        return set()
    return {l.strip() for l in BASELINE.read_text(encoding='utf-8').splitlines()
            if l.strip() and not l.startswith('#')}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    quiet = '--quiet' in sys.argv
    strict = '--strict' in sys.argv
    escribir = '--write-baseline' in sys.argv

    universo = ([pathlib.Path(a) for a in args] if args
                else sorted(RAIZ_PM.glob('*/iniciativas/*/hallazgos/hallazgo-*.rst')))

    base = set() if escribir else leer_baseline()
    medidos, desajuste = 0, []
    for f in universo:
        s = signos(f)
        if s is None:
            continue
        medidos += 1
        idp, meta, carpeta = s
        if idp == meta == carpeta:
            continue
        clave = str(f).replace('\\', '/')
        desajuste.append((clave, idp, meta, carpeta, clave in base))

    nuevos = [d for d in desajuste if not d[4]]

    if escribir:
        BASELINE.write_text(
            '# Deuda heredada de check_hallazgo_submodulo.py — congelada, no barrida.\n'
            '# Una ruta listada no bloquea; una nueva sí. Al mover un hallazgo a su\n'
            '# iniciativa correcta, quitar su línea: si no, el baseline miente.\n'
            + '\n'.join(sorted(d[0] for d in desajuste)) + '\n',
            encoding='utf-8')
        print(f'baseline escrito: {len(desajuste)} ruta(s)')
        return 0

    if quiet:
        print(len(nuevos))
    else:
        if nuevos:
            print(f'check-hallazgo-submodulo: {len(nuevos)} hallazgo(s) fuera de su '
                  f'submódulo, sin baseline')
            for clave, idp, meta, carpeta, _ in nuevos:
                print(f'  {clave}')
                print(f'      ID={idp}  ·  :submodulo:={meta}  ·  carpeta=pm/{carpeta}')
                print(f'      → debe vivir en una iniciativa de pm/{idp}/iniciativas/')
        else:
            print('OK: 0 hallazgo(s) fuera de su submódulo')
        heredada = len(desajuste) - len(nuevos)
        print(f'  (alcance medido: {medidos} hallazgo(s); '
              f'{heredada} en baseline heredado)')

    return 1 if (strict and nuevos) else 0


if __name__ == '__main__':
    sys.exit(main())
