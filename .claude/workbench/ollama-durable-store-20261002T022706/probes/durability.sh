#!/usr/bin/env bash
# Durabilidad del store de thyrox-ollama por la única vía de creación permitida
# (bin/infrastructure_ensure -> InfrastructureBootstrap -> primitiva):
#   materializar un artefacto reconocible -> retirar SÓLO el contenedor ->
#   bootstrap -> otro contenedor, el mismo volumen, el mismo artefacto, sin
#   descarga. La anulación declara un volumen sin el store y la prueba cae.
# Uso: durability.sh <volumen-del-store> <volumen-de-anulación>
set -uo pipefail
ROOT=/home/user/thyrox
W="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
store="${1:?volumen del store}" annul="${2:?volumen de anulación}"
stamp="$(date -u +%Y%m%dT%H%M%S)"
probe="thyrox-durability-probe:${stamp,,}"
port="$(source src/lib/infrastructure.sh && echo "$THYROX_INFRA_OLLAMA_PORT")"
step() { printf '\n== %s\n' "$*"; }
api() {  # una llamada a la API de Ollama desde una unidad de la primitiva
  bash bin/podman-execution-execute run --task TASK-THYROX-0757 --kind probe --network host -- \
    curl -sS --max-time 600 "http://127.0.0.1:${port}$1" "${@:2}" 2>&1 | grep -v '^execution thyrox-worker'
}
container_id() { podman inspect thyrox-ollama --format '{{.Id}}' 2>/dev/null || echo absent; }
mounted() { podman inspect thyrox-ollama --format '{{range .Mounts}}{{if eq .Type "volume"}}{{.Name}}:{{.Destination}}{{end}}{{end}}' 2>/dev/null; }
blob_identity() {  # nombre, tamaño, inodo y mtime de cada blob: una descarga nueva los cambia
  local data; data="$(podman volume inspect "$1" --format '{{.Mountpoint}}')"
  find "$data/models/blobs" -type f -printf '%f %s %i %T@\n' 2>/dev/null | sort
}
probe_digest() { api /api/tags | jq -r --arg m "$probe" '.models[]? | select(.name == $m) | .digest' ; }

step "1. bootstrap declara thyrox-ollama sobre el store ($store)"
THYROX_INFRA_OLLAMA_VOLUME="$store" bash bin/infrastructure_ensure thyrox-ollama; echo "exit=$?"
echo "container=$(container_id) mount=$(mounted)"

step "2. materializar un artefacto reconocible: $probe (desde qwen3:4b, sin descargar nada)"
api /api/create -d "{\"model\":\"$probe\",\"from\":\"qwen3:4b\",\"system\":\"thyrox durability $stamp\",\"stream\":false}"; echo
before_digest="$(probe_digest)"; echo "probe_digest=$before_digest"
blob_identity "$store" > "$W/outputs/blobs-before.txt"; wc -l < "$W/outputs/blobs-before.txt"
first="$(container_id)"

step "3. retirar SÓLO el contenedor; el volumen no se toca"
podman rm -f thyrox-ollama >/dev/null; echo "rm_exit=$?"
podman volume exists "$store" && echo "volume_after_rm=present" || echo "volume_after_rm=ABSENT"

step "4. bootstrap otra vez"
THYROX_INFRA_OLLAMA_VOLUME="$store" bash bin/infrastructure_ensure thyrox-ollama; echo "exit=$?"
second="$(container_id)"; echo "container=$second mount=$(mounted)"

step "5. verificar"
after_digest="$(probe_digest)"
blob_identity "$store" > "$W/outputs/blobs-after.txt"
pulls="$(podman logs thyrox-ollama 2>&1 | grep -ciE 'pulling|download' || true)"
[[ "$first" != "$second" ]] && echo "PASS otro contenedor" || echo "FAIL mismo contenedor"
[[ "$(mounted)" == "$store:/root/.ollama" ]] && echo "PASS mismo volumen" || echo "FAIL volumen $(mounted)"
[[ -n "$before_digest" && "$after_digest" == "$before_digest" ]] && echo "PASS artefacto presente con la misma identidad" || echo "FAIL artefacto: antes=$before_digest despues=$after_digest"
cmp -s "$W/outputs/blobs-before.txt" "$W/outputs/blobs-after.txt" && echo "PASS blobs idénticos (nombre, tamaño, inodo, mtime)" || echo "FAIL blobs cambiaron"
[[ "$pulls" == 0 ]] && echo "PASS sin descarga en el log del contenedor nuevo" || echo "FAIL $pulls líneas de descarga"

step "6. anulación: el mismo bootstrap sobre un volumen sin el store ($annul)"
THYROX_INFRA_OLLAMA_VOLUME="$annul" bash bin/infrastructure_ensure thyrox-ollama; echo "exit=$?"
annulled="$(probe_digest)"
[[ "$annulled" == "$before_digest" ]] && echo "ANNULMENT-FAIL el artefacto apareció sin su volumen" || echo "ANNULMENT-OK artefacto ausente sin su volumen (digest='$annulled')"

step "7. volver al store declarado"
THYROX_INFRA_OLLAMA_VOLUME="$store" bash bin/infrastructure_ensure thyrox-ollama; echo "exit=$?"
[[ "$(probe_digest)" == "$before_digest" ]] && echo "PASS restaurado" || echo "FAIL restaurado"
