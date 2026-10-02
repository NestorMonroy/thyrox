#!/usr/bin/env bash
# Construye el runtime del laboratorio de cuantización y registra lo medido.
#
# La imagen la construye la primitiva (`build-image` de @thyrox/podman-execution,
# ADR-007 Regla 4): este guion no ejecuta `podman build`. La primitiva pasa el
# proxy de salida y, si existe, su CA como `PROXY_CA` (la Containerfile la
# declara con ese nombre). De `podman` sólo se invoca medida: `image inspect` y
# `history`.
#
# Uso: build.sh <directorio-de-medición> [tag] [tarea]
# Escribe en el directorio: build.log, image.json (id, digest, tamaño, capas)
# y build.time (GNU Time del runner de la primitiva y sus hijos esperados —el
# proceso `podman build` incluido—, NO el cgroup de cada RUN).
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/../../../.." && pwd)"
out="${1:?directorio de medición}"
tag="${2:-localhost/thyrox-model-quantizer:dev}"
task="${3:-TASK-THYROX-0747}"
mkdir -p "$out"
source "$root/src/lib/managed_execution.sh"
mapfile -t runner < <(thyrox_managed_execution_runner_argv)
time_bin="${THYROX_TOOLCHAIN_TIME_BIN:-/usr/bin/time}"
podman_bin="${THYROX_TOOLCHAIN_PODMAN_BIN:-podman}"
"$time_bin" -v -o "$out/build.time" \
  "${runner[@]}" build-image --task "$task" --context "$here" --tag "$tag" --network host > "$out/build.log" 2>&1
"$podman_bin" image inspect "$tag" --format json > "$out/image.inspect.json"
"$podman_bin" history --format json "$tag" > "$out/image.history.json"
python3 - "$out" "$tag" <<'PY'
import json, sys, pathlib
out, tag = pathlib.Path(sys.argv[1]), sys.argv[2]
info = json.loads((out / 'image.inspect.json').read_text())[0]
layers = json.loads((out / 'image.history.json').read_text())
record = {
    'tag': tag,
    'id': info['Id'],
    'digest': info.get('Digest'),
    'size_bytes': info['Size'],
    'layers': [{'size_bytes': l.get('size', 0), 'created_by': (l.get('CreatedBy') or l.get('createdBy') or '')[:160]} for l in layers],
}
(out / 'image.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps({k: record[k] for k in ('id', 'digest', 'size_bytes')}))
PY
