#!/usr/bin/env bash
# Corre `bun build` sobre las entradas exportadas de un paquete, a una
# carpeta desechable, y deja sus errores sin repuntar ningún manifiesto.
set -uo pipefail
pkg="$1"; out="$2"
root="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$root/src/packages/$pkg" || exit 2
entries=$(PYTHONPATH="$root/src" python3 -c "
import json
from typescript import build_javascript as b
print(' '.join(b.expand_entries(__import__('pathlib').Path('.'), b.source_entries(json.load(open('package.json'))))))")
rootdir=$(PYTHONPATH="$root/src" python3 -c "
from typescript import emit_declarations as e; import pathlib; print(e._project_shape(pathlib.Path('.'))[0])")
tmp="$(mktemp -d "${TMPDIR:-/tmp}/bundle-$pkg.XXXXXX")"
bun build $entries --root "$rootdir" --outdir "$tmp" --target bun --packages external --splitting > "$out/$pkg.log" 2>&1
echo "EXIT=$?" >> "$out/$pkg.log"
rm -rf "${tmp:?}"
