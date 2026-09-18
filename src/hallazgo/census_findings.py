#!/usr/bin/env python3
"""census_findings.py — el censo del corpus de hallazgos, para que la prosa
nombre el comando y no la cifra.

Por que existe
--------------
`calibration-verified-numbers.md` separa dos usos de un numero y solo uno
driftea: la **evidencia fechada de un episodio** es valida para siempre, y la
**propiedad de un artefacto vivo** es falsa en cuanto el artefacto crece. Su
regla es una linea — *si el numero lo produce un comando, la prosa nombra el
comando*— y hasta hoy ese comando no existia para el corpus de hallazgos.

Medido al escribirlo: `hallazgos-documentacion-obligatoria.md` transcribia once
cifras de este corpus y **siete** ya no lo describian. Ninguna se escribio mal:
las siete fueron correctas el dia que se midieron.

Que lo hace del PROVEEDOR y no de un consumidor
-----------------------------------------------
No lleva dentro ninguna lista cerrada — ni de prefijos (`API`, `DOCS`, …) ni de
raices de trabajo. El prefijo se **deriva** del nombre del archivo y la raiz de
su **ruta**, asi que un consumidor con un prefijo que este arbol nunca vio
aparece igual. Una lista cerrada lo dejaria fuera **en silencio**, con el total
pareciendo sano: el sub-patron D de `metrica-decide-la-conclusion.md` con el
propio censo como sujeto. Su control es exactamente ese caso.

La raiz del corpus es un **parametro** (`--root`), no una constante: el
mecanismo es del proveedor y el corpus del consumidor.

*Metrica:* archivos `hallazgo-*.rst` bajo un directorio `hallazgos/` de la raiz
dada; su prefijo, su raiz de ruta y su clave `:submodulo:`.
*Ciega a:* un hallazgo cuyo cuerpo contradiga sus tres declaraciones —las tres
son metadata, no contenido—; a un monolito que no siga el nombre
`hallazgos-*.rst`; y al `:estado:` de cada hallazgo, que es otro eje.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import statistics  # noqa: F401  (documenta por que NO se usa: ver median_lines)
import sys


#: La extraccion de la clave declarada se REUSA del gate hermano, no se copia:
#: dos regex para la misma clave son dos fuentes de verdad que nadie sincroniza.
try:  # pragma: no cover - el gate hermano puede no estar en el sys.path del test
    from verify.check_hallazgo_submodulo import PATRON_META  # type: ignore
except Exception:  # pragma: no cover
    PATRON_META = re.compile(r'^\s*:submodulo:\s*(\S+)', re.M)

#: El prefijo vive en el NOMBRE, no en el cuerpo: `hallazgo-H-<PREFIJO>-<slug>`.
#: `[A-Z0-9]+` y no una alternancia de nombres — ahi esta la abstraccion.
FINDING_NAME = re.compile(r'^hallazgo-H-(?P<prefix>[A-Z0-9]+)-')

FINDING_GLOB = '**/hallazgos/hallazgo-*.rst'
MONOLITH_GLOB = '**/hallazgos-*.rst'
LOOSE_GLOB = '**/hallazgo-*.rst'


def _prefix_of(path: pathlib.Path) -> str | None:
    m = FINDING_NAME.match(path.name)
    return m.group('prefix') if m else None


def _root_of(path: pathlib.Path, pm_root: pathlib.Path) -> str:
    """La raiz de trabajo es el primer segmento bajo la raiz del corpus."""
    try:
        return path.relative_to(pm_root).parts[0]
    except ValueError:
        return '(fuera)'


def _declared_submodule(path: pathlib.Path) -> str:
    try:
        text = path.read_text(encoding='utf-8', errors='replace')
    except OSError:
        return '(ilegible)'
    m = PATRON_META.search(text)
    return m.group(1).strip() if m else '(ausente)'


def _line_count(path: pathlib.Path) -> int:
    try:
        with path.open('rb') as fh:
            return sum(1 for _ in fh)
    except OSError:
        return 0


def _in_findings_dir(path: pathlib.Path) -> bool:
    return 'hallazgos' in path.parent.name.split('/') or path.parent.name == 'hallazgos'


def census(pm_root: pathlib.Path | str) -> dict:
    """Mide el corpus bajo `pm_root` y devuelve sus cifras con su denominador."""
    pm_root = pathlib.Path(pm_root)
    findings = sorted(pm_root.glob(FINDING_GLOB))

    by_prefix: dict[str, int] = {}
    by_root: dict[str, int] = {}
    coherent = 0
    incoherent: list[tuple[str, str, str, str]] = []
    lines: list[int] = []

    for f in findings:
        prefix = _prefix_of(f)
        root = _root_of(f, pm_root)
        meta = _declared_submodule(f)
        if prefix:
            by_prefix[prefix] = by_prefix.get(prefix, 0) + 1
        by_root[root] = by_root.get(root, 0) + 1
        lines.append(_line_count(f))
        if prefix and prefix.lower() == meta.lower() == root.lower():
            coherent += 1
        else:
            incoherent.append((str(f), (prefix or '(sin prefijo)').lower(),
                               meta.lower(), root.lower()))

    monoliths = sorted(
        ((p, p.stat().st_size) for p in pm_root.glob(MONOLITH_GLOB)
         if p.parent.name != 'hallazgos'),
        key=lambda t: t[1], reverse=True)

    outside_dir = sorted(p for p in pm_root.glob(LOOSE_GLOB)
                         if p.parent.name != 'hallazgos')

    return {
        'root': str(pm_root),
        'total': len(findings),
        'by_prefix': by_prefix,
        'by_root': by_root,
        'coherent': coherent,
        'incoherent': incoherent,
        # La mediana se toma como el elemento SUPERIOR de un n par —`a[n//2]`—
        # y no como el promedio de los dos centrales que `statistics.median`
        # devuelve: una mediana de lineas tiene que ser un archivo que exista,
        # no un punto entre dos. `None` cuando no hay poblacion: un 0 ahi no
        # distinguiria «corpus vacio» de «hallazgos de cero lineas».
        'median_lines': sorted(lines)[len(lines) // 2] if lines else None,
        'monoliths': monoliths,
        'outside_dir': outside_dir,
    }


def render(data: dict) -> str:
    """El texto que la prosa cita. Toda cifra va con su denominador."""
    total = data['total']
    out = [f"censo del corpus de hallazgos — raiz: {data['root']}",
           f"  total: {total} hallazgo(s) bajo un directorio hallazgos/"]

    if total:
        out.append("  por prefijo del ID:")
        for k, v in sorted(data['by_prefix'].items(), key=lambda t: -t[1]):
            out.append(f"    {k:<8} {v:>6}  ({v * 100 // total} % de {total})")
        out.append("  por raiz de trabajo (segmento de la ruta):")
        for k, v in sorted(data['by_root'].items(), key=lambda t: -t[1]):
            out.append(f"    {k:<8} {v:>6}  ({v * 100 // total} % de {total})")
        out.append(f"  triple declaracion coherente: {data['coherent']} de {total}"
                   f"  ({data['coherent'] * 100 // total} %)")
        out.append(f"  incoherentes: {len(data['incoherent'])} de {total}")
        out.append(f"  mediana de lineas por hallazgo: {data['median_lines']}"
                   f"  (n = {total})")
    else:
        out.append("  sin poblacion: no se emite mediana ni porcentaje — un 0 aqui"
                   " no distinguiria «corpus vacio» de «no pude medir».")

    out.append(f"  monolitos (hallazgos-*.rst fuera de un hallazgos/): "
               f"{len(data['monoliths'])}")
    for p, size in data['monoliths'][:5]:
        out.append(f"    {size:>9} B  {p}")
    out.append(f"  hallazgos fuera de un hallazgos/: {len(data['outside_dir'])}")
    for p in data['outside_dir'][:5]:
        out.append(f"    {p}")
    return '\n'.join(out)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--root', default='source/gestion/pm',
                    help='raiz del corpus del CONSUMIDOR (default: source/gestion/pm)')
    ap.add_argument('--json', action='store_true', help='salida legible por maquina')
    args = ap.parse_args(argv)

    root = pathlib.Path(args.root)
    if not root.is_dir():
        print(f"census_findings REHUSA — la raiz {root} no existe.\n"
              "  NO se emite un conteo: un 0 aqui seria un verde falso.",
              file=sys.stderr)
        return 2

    data = census(root)
    if args.json:
        serializable = dict(data)
        serializable['monoliths'] = [[str(p), s] for p, s in data['monoliths']]
        serializable['outside_dir'] = [str(p) for p in data['outside_dir']]
        print(json.dumps(serializable, indent=2, ensure_ascii=False))
    else:
        print(render(data))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
