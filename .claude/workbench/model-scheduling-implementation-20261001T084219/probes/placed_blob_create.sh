#!/usr/bin/env bash
# Sonda: ¿Ollama 0.35.0 crea un modelo con /api/create cuando el blob GGUF ya está
# en su directorio de modelos (enlace duro desde la caché verificada), sin /api/blobs?
# Uso: bash placed_blob_create.sh <sha256> <puerto> <directorio-de-trabajo>
set -uo pipefail
sha=$1; port=$2; work=$3
cache=$(bash bin/ensure_homes --resolve THYROX_RUNTIME_DIR >/dev/null; printf '%s' "$PWD/.thyrox/models/artifacts")
models="$work/models"; mkdir -p "$models/blobs"
ln "$cache/sha256-$sha.gguf" "$models/blobs/sha256-$sha" || { echo "enlace=fallo"; exit 1; }
name="probe-placed-$sha"
podman run -d --rm --name "$name" --network host -e "OLLAMA_HOST=127.0.0.1:$port" \
  -v "$models:/root/.ollama/models" docker.io/ollama/ollama:0.35.0 >/dev/null || { echo "run=fallo"; exit 1; }
for _ in $(seq 1 60); do curl -sf "http://127.0.0.1:$port/api/version" >/dev/null && break; sleep 1; done
echo "version=$(curl -s http://127.0.0.1:$port/api/version)"
echo "head_blob=$(curl -s -o /dev/null -w '%{http_code}' -I http://127.0.0.1:$port/api/blobs/sha256:$sha)"
echo "create=$(curl -s -X POST http://127.0.0.1:$port/api/create -d "{\"model\":\"probe-model\",\"files\":{\"model.gguf\":\"sha256:$sha\"},\"stream\":false}")"
echo "show_from=$(curl -s -X POST http://127.0.0.1:$port/api/show -d '{"model":"probe-model"}' | python3 -c 'import json,sys; d=json.load(sys.stdin); print([l for l in d.get("modelfile","").splitlines() if l.startswith("FROM")])')"
echo "generate=$(curl -s -X POST http://127.0.0.1:$port/api/generate -d '{"model":"probe-model","prompt":"2+2=","stream":false,"options":{"num_predict":4}}' | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("done"), repr(d.get("response","")[:40]), d.get("error"))')"
podman stop -t 2 "$name" >/dev/null
echo "linked_after=$(stat -c %h "$cache/sha256-$sha.gguf")"
