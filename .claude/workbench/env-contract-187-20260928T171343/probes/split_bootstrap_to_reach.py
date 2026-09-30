"""Reemplaza el bootstrap partido (variable y luego inserción) por la forma admitida.

`ROOT = <X>.parents[N]` seguido de `sys.path.insert(0, str(ROOT / "src"))` pasa a
ser la inserción de UNA línea, el import del localizador y `ROOT` derivado de
`reach.thyrox_root()`. Rehúsa si el archivo no tiene exactamente esa forma.
"""
import re
import sys
from pathlib import Path

PATTERN = re.compile(
    r'^ROOT = (?P<expr>.+\.parents\[\d+\])\n'
    r'sys\.path\.insert\(0, str\(ROOT / "src"\)\)\n', re.M)
for name in sys.argv[1:]:
    path = Path(name)
    text = path.read_text()
    matches = PATTERN.findall(text)
    if len(PATTERN.findall(text)) != 1 or "from paths import reach" in text:
        sys.exit(f"{name}: forma inesperada ({len(matches)} coincidencias)")
    text = PATTERN.sub(lambda m: (
        f'sys.path.insert(0, str({m["expr"]} / "src"))\n'
        'from paths import reach  # noqa: E402\n\n'
        'ROOT = reach.thyrox_root()\n'), text)
    path.write_text(text)
    print(f"{name}: reescrito")
