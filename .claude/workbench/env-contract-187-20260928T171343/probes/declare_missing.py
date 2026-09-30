"""Declara en `.env.example` las claves que el gate lista SIN DECLARAR.

Agrupa por el archivo que las lee primero —el mismo que el gate nombra—, así
que cada clave queda junto a la cita de quién la consume. Anexa al final; no
reescribe lo ya declarado.
"""
import collections
import pathlib
import re
import sys

report, env_example = map(pathlib.Path, sys.argv[1:3])
by_file: dict[str, list[str]] = collections.defaultdict(list)
for line in report.read_text().splitlines():
    match = re.match(r"\s*SIN DECLARAR\s+(\S+)\s+<-\s+(\S+)", line)
    if match:
        by_file[match.group(2)].append(match.group(1))

lines = [
    "",
    "# --- Claves leídas por el código, sin valor propio del consumidor --------",
    "# Cada grupo lleva el archivo que la lee primero. Vacío = rige el default que",
    "# ese archivo declara; se rellena sólo para corregirlo. La mayor parte son los",
    "# conmutadores del cliente portado, renombrados de CLAUDE_CODE_* a THYROX_CODE_*",
    "# (src/verify/renameEnvPrefix.ts). Las credenciales de cliente OAuth van vacías:",
    "# thyrox no publica los identificadores embebidos de terceros.",
]
for path in sorted(by_file):
    lines.append(f"# {path}")
    lines.extend(f"{key}=" for key in sorted(by_file[path]))
env_example.write_text(env_example.read_text().rstrip("\n") + "\n" + "\n".join(lines) + "\n")
print(f"{sum(map(len, by_file.values()))} clave(s) en {len(by_file)} grupo(s)")
