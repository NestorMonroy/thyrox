"""Imprime los errores PROPIOS de un paquete (los que `classify_errors` cuenta como own)."""
import os
import sys
from pathlib import Path

from typescript.emit_declarations import _LOCATED_ERROR, check_package

package = Path(sys.argv[1]).resolve()
result = check_package(package)
for match in _LOCATED_ERROR.finditer(result.output):
    raw = match.group("file").strip()
    path = os.path.normpath(raw if os.path.isabs(raw) else os.path.join(package, raw))
    if "node_modules" in path.split(os.sep) or not path.startswith(str(package) + os.sep):
        continue
    line = result.output[match.start():result.output.find("\n", match.start())]
    print(f"{package.name}\t{line}")
print(f"{package.name}\tTOTAL own={result.own_errors} sibling={result.sibling_errors} escaped={result.escaped_errors}", file=sys.stderr)
