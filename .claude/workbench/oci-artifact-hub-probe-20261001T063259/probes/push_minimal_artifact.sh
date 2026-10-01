#!/usr/bin/env bash
# Sonda: ¿acepta Docker Hub un artefacto OCI genérico subido directo como
# blobs por el protocolo de distribución, sin imagen ni tar intermedio?
# Sube un blob de datos y un config vacío, publica un manifest con
# artifactType, y lo vuelve a leer de forma anónima por digest.
# Lee la credencial del publicador del entorno; nunca la imprime.
set -euo pipefail
repo="${THYROX_REGISTRY_PUBLISHER_USERNAME:?}/thyrox-artifact-probe"
reg=https://registry-1.docker.io
work="$(mktemp -d)"; trap 'rm -rf "${work:?}"' EXIT

token() {  # $1 = scope; $2 = "auth" para usar la credencial
  local auth=()
  [[ "${2:-}" == auth ]] && auth=(-u "$THYROX_REGISTRY_PUBLISHER_USERNAME:$THYROX_REGISTRY_PUBLISHER_TOKEN")
  curl -fsS "${auth[@]}" "https://auth.docker.io/token?service=registry.docker.io&scope=repository:$repo:$1" \
    | python3 -c 'import json,sys;print(json.load(sys.stdin)["token"])'
}

push_blob() {  # $1 = archivo; imprime su digest
  local file="$1" digest location
  digest="sha256:$(sha256sum "$file" | cut -d' ' -f1)"
  location="$(curl -fsS -D - -o /dev/null -X POST -H "Authorization: Bearer $PUSH" "$reg/v2/$repo/blobs/uploads/" | tr -d '\r' | sed -n 's/^[Ll]ocation: //p')"
  [[ "$location" == http* ]] || location="$reg$location"
  sep='?'; [[ "$location" == *\?* ]] && sep='&'
  curl -fsS -o /dev/null -X PUT -H "Authorization: Bearer $PUSH" -H 'Content-Type: application/octet-stream' \
    --data-binary @"$file" "$location${sep}digest=$digest"
  echo "$digest"
}

PUSH="$(token pull,push auth)"
printf 'thyrox oci artifact probe %s\n' "$(date -u +%Y-%m-%dT%H:%M:%S)" > "$work/data.txt"
printf '{}' > "$work/config.json"
data_digest="$(push_blob "$work/data.txt")"
config_digest="$(push_blob "$work/config.json")"
cat > "$work/manifest.json" <<JSON
{"schemaVersion":2,"mediaType":"application/vnd.oci.image.manifest.v1+json","artifactType":"application/vnd.thyrox.probe.v1",
 "config":{"mediaType":"application/vnd.oci.empty.v1+json","digest":"$config_digest","size":2},
 "layers":[{"mediaType":"text/plain","digest":"$data_digest","size":$(stat -c%s "$work/data.txt"),"annotations":{"org.opencontainers.image.title":"data.txt"}}]}
JSON
manifest_digest="sha256:$(sha256sum "$work/manifest.json" | cut -d' ' -f1)"
code="$(curl -sS -o "$work/put.out" -w '%{http_code}' -X PUT -H "Authorization: Bearer $PUSH" \
  -H 'Content-Type: application/vnd.oci.image.manifest.v1+json' --data-binary @"$work/manifest.json" "$reg/v2/$repo/manifests/probe")"
echo "manifest PUT http=$code digest=$manifest_digest"
[[ "$code" == 201 ]] || { cat "$work/put.out"; exit 1; }

PULL="$(token pull)"
got="$(curl -fsS -H "Authorization: Bearer $PULL" -H 'Accept: application/vnd.oci.image.manifest.v1+json' "$reg/v2/$repo/manifests/$manifest_digest" | sha256sum | cut -d' ' -f1)"
blob="$(curl -fsSL -H "Authorization: Bearer $PULL" "$reg/v2/$repo/blobs/$data_digest" | sha256sum | cut -d' ' -f1)"
echo "lectura anónima: manifest $( [[ "sha256:$got" == "$manifest_digest" ]] && echo idéntico || echo DISTINTO ) · blob $( [[ "sha256:$blob" == "$data_digest" ]] && echo idéntico || echo DISTINTO )"
echo "referencia: docker.io/$repo@$manifest_digest"
