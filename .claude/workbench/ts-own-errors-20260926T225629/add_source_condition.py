"""Añade la condición `source` a los paquetes cuyo repunte rehúsa (sin dist/).

Sólo toca entradas de `exports` que ya son condiciones con `default` en
cadena; una entrada en cadena ya es fuente y no tiene doble identidad.
"""
import json
import sys
from pathlib import Path

for d in sys.argv[1:]:
    path = Path(d) / "package.json"
    manifest = json.loads(path.read_text(encoding="utf8"))
    exports = manifest.get("exports")
    touched = 0
    if isinstance(exports, dict):
        for key, entry in list(exports.items()):
            if isinstance(entry, dict) and isinstance(entry.get("default"), str) and "source" not in entry:
                exports[key] = {"source": entry["default"], **entry}
                touched += 1
    path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
    print(d, touched)
