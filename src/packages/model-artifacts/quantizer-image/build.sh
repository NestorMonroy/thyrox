#!/usr/bin/env bash
# Construye el runtime del laboratorio de cuantización y registra lo medido.
#
# Uso: build.sh <directorio-de-medición> [tag]
# Escribe en el directorio: build.log, image.json (id, digest, tamaño, capas)
# y build.time (GNU Time del proceso podman build: mide ese proceso y sus
# hijos esperados, NO el cgroup de cada RUN).
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
out="${1:?directorio de medición}"
tag="${2:-localhost/thyrox-model-quantizer:dev}"
mkdir -p "$out"

proxy_args=()
if [ -n "${HTTPS_PROXY:-}" ]; then
  ca="${THYROX_INFRA_PROXY_CA_BUNDLE:-/root/.ccr/ca-bundle.crt}"
  proxy_args=(--build-arg "HTTPS_PROXY=$HTTPS_PROXY" --build-arg "https_proxy=$HTTPS_PROXY")
  if [ -r "$ca" ]; then
    proxy_args+=(--build-arg "PIP_CERT=/etc/ssl/certs/proxy-ca.crt" -v "$ca:/etc/ssl/certs/proxy-ca.crt:ro")
  fi
fi

time_bin="${THYROX_TOOLCHAIN_TIME_BIN:-/usr/bin/time}"
"$time_bin" -v -o "$out/build.time" \
  podman build --network host "${proxy_args[@]}" -t "$tag" "$here" > "$out/build.log" 2>&1

podman image inspect "$tag" --format json > "$out/image.inspect.json"
podman history --format json "$tag" > "$out/image.history.json"
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
