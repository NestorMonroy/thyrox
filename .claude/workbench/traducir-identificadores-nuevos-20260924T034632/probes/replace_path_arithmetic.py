#!/usr/bin/env python3
"""Sustituye la aritmetica `parents[N]` que ubica al proveedor por `reach`.

Por archivo: inserta `from paths import reach` tras el ULTIMO import de nivel
superior que precede al primer sitio —asi queda despues de cualquier bootstrap
de `sys.path` que el archivo tenga— y reescribe cada forma declarada. Rehusa
(exit 1) si una forma declarada no aparece: un reemplazo que no ocurrio no se
publica como hecho.
"""
import ast
import pathlib
import sys

FORMS = [
    ('Path(os.environ.get("THYROX_ROOT", Path(__file__).resolve().parents[2]))', 'reach.thyrox_root()'),
    ('pathlib.Path(__file__).resolve().parents[2]', 'reach.thyrox_root()'),
    ('Path(__file__).resolve().parents[2]', 'reach.thyrox_root()'),
    ('Path(loop.__file__).parents[1]', "(reach.thyrox_root() / 'src')"),
]


def fix(path: pathlib.Path) -> None:
    lines = path.read_text(encoding='utf-8').splitlines(keepends=True)
    # La linea del bootstrap (`sys.path.insert(... parents[N] ...)`) es la
    # forma ADMITIDA: es la que hace importable a `paths`, asi que no se toca.
    sites = [i for i, ln in enumerate(lines)
             if 'sys.path.insert' not in ln and any(old in ln for old, _ in FORMS)]
    if not sites:
        sys.exit(f'{path}: ninguna forma declarada fuera del bootstrap')
    for i in sites:
        for old, new in FORMS:
            lines[i] = lines[i].replace(old, new)
    text = ''.join(lines)
    if 'from paths import reach' not in text:
        tree = ast.parse(text)
        first_line = sites[0] + 1
        # El import va tras el ultimo import Y tras el ultimo bootstrap que
        # precedan al primer sitio: antes del bootstrap, `paths` no importa.
        anchors = [n.end_lineno for n in tree.body if n.lineno < first_line and (
            isinstance(n, (ast.Import, ast.ImportFrom))
            or 'sys.path.insert' in ast.get_source_segment(text, n))]
        lines = text.splitlines(keepends=True)
        at = max(anchors) if anchors else first_line - 1
        lines.insert(at, 'from paths import reach  # noqa: E402\n')
        text = ''.join(lines)
    path.write_text(text, encoding='utf-8')
    print(f'{path}: {len(sites)} sitio(s)')


for arg in sys.argv[1:]:
    fix(pathlib.Path(arg))
