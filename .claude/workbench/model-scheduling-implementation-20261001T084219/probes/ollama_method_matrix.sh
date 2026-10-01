#!/usr/bin/env bash
# Sonda: qué métodos HTTP acepta cada endpoint de Ollama 0.35.0 y qué estado
# devuelve. Cuerpo vacío en todos los métodos, para no provocar efectos: una
# lectura que exige POST se ve como 400 (falta el cuerpo), un método no
# servido como 404 o 405.
# Uso: bash ollama_method_matrix.sh <puerto> <directorio-de-trabajo>
set -uo pipefail
port=$1; work=$2
mkdir -p "$work/models"
name="probe-method-matrix-$port"
podman run -d --rm --name "$name" --network host -e "OLLAMA_HOST=127.0.0.1:$port" \
  -v "$work/models:/root/.ollama/models" docker.io/ollama/ollama:0.35.0 >/dev/null || { echo "run=fallo"; exit 1; }
base="http://127.0.0.1:$port"
for _ in $(seq 1 60); do curl -sf "$base/api/version" >/dev/null && break; sleep 1; done
digest=sha256:$(printf 'x' | sha256sum | cut -c1-64)
endpoints="/ /api/version /api/tags /api/ps /api/show /api/blobs/$digest /api/create /api/copy /api/delete /api/pull /api/push /api/generate /api/chat /api/embed /api/embeddings /v1/models /v1/chat/completions"
printf 'endpoint\tGET\tHEAD\tPOST\tPUT\tPATCH\tDELETE\n'
for endpoint in $endpoints; do
  row="${endpoint/$digest/<digest>}"
  for method in GET HEAD POST PUT PATCH DELETE; do
    if test "$method" = HEAD; then code=$(curl -s -o /dev/null -w '%{http_code}' -I "$base$endpoint")
    else code=$(curl -s -o /dev/null -w '%{http_code}' -X "$method" "$base$endpoint"); fi
    row="$row\t$code"
  done
  printf "$row\n"
done
echo "show_by_get=$(curl -s "$base/api/show?model=x" -o /dev/null -w '%{http_code}')"
podman stop -t 2 "$name" >/dev/null
