#!/usr/bin/env bash
# Sonda: el flujo público completo de Ollama 0.35.0 para una unidad de residencia,
# sin tocar su formato de almacenamiento: HEAD/POST /api/blobs, /api/create,
# /api/show, /api/generate (carga residente) y /api/ps. Mide también si POST
# /api/blobs rechaza un contenido que no corresponde a su digest.
# Uso: bash public_api_flow.sh <sha256> <puerto> <directorio-de-trabajo>
set -uo pipefail
sha=$1; port=$2; work=$3
gguf="$PWD/.thyrox/models/artifacts/sha256-$sha.gguf"
models="$work/models"; mkdir -p "$models"
name="probe-public-api-$sha"
podman run -d --rm --name "$name" --network host -e "OLLAMA_HOST=127.0.0.1:$port" \
  -v "$models:/root/.ollama/models" docker.io/ollama/ollama:0.35.0 >/dev/null || { echo "run=fallo"; exit 1; }
base="http://127.0.0.1:$port"
for _ in $(seq 1 60); do curl -sf "$base/api/version" >/dev/null && break; sleep 1; done
echo "version=$(curl -s $base/api/version)"
echo "head_before=$(curl -s -o /dev/null -w '%{http_code}' -I $base/api/blobs/sha256:$sha)"
wrong=$(printf 'no-es-el-gguf' | sha256sum | cut -c1-64)
echo "post_mismatch=$(printf 'otro-contenido' | curl -s -o /dev/null -w '%{http_code}' -X POST --data-binary @- $base/api/blobs/sha256:$wrong)"
start=$(date +%s.%N)
echo "post_blob=$(curl -s -o /dev/null -w '%{http_code}' -X POST -T "$gguf" $base/api/blobs/sha256:$sha)"
echo "post_seconds=$(echo "$(date +%s.%N) - $start" | bc)"
echo "head_after=$(curl -s -o /dev/null -w '%{http_code}' -I $base/api/blobs/sha256:$sha)"
echo "create=$(curl -s -X POST $base/api/create -d "{\"model\":\"probe-model\",\"files\":{\"model.gguf\":\"sha256:$sha\"},\"stream\":false}")"
echo "show_from=$(curl -s -X POST $base/api/show -d '{"model":"probe-model"}' | python3 -c 'import json,sys; d=json.load(sys.stdin); print([l for l in d.get("modelfile","").splitlines() if l.startswith("FROM")], d.get("details",{}).get("quantization_level"))')"
echo "load=$(curl -s -X POST $base/api/generate -d '{"model":"probe-model","keep_alive":-1}' | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("done"), d.get("done_reason"), d.get("error"))')"
echo "ps=$(curl -s $base/api/ps | python3 -c 'import json,sys; d=json.load(sys.stdin); print([(m["name"], m.get("digest","")[:12], m.get("expires_at","")[:4]) for m in d.get("models",[])])')"
echo "generate=$(curl -s -X POST $base/api/generate -d '{"model":"probe-model","prompt":"2+2=","stream":false,"options":{"num_predict":4}}' | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("done"), repr(d.get("response","")[:40]), d.get("error"))')"
echo "unit_models_bytes=$(du -sb "$models" | cut -f1)"
echo "cache_links=$(stat -c %h "$gguf")"
podman stop -t 2 "$name" >/dev/null
