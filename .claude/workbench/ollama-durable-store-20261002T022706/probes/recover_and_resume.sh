#!/usr/bin/env bash
# Espera una ventana sin unidades de tarea vivas (la recuperación de locks las
# rehúsa), detiene la infraestructura con proceso vivo, corre la recuperación
# EXPLÍCITA de locks y vuelve a materializar la infraestructura por el
# bootstrap; después retoma la prueba de durabilidad desde el paso 4.
# Uso: recover_and_resume.sh <volumen-del-store> <volumen-de-anulación> <digest-del-artefacto> <nombre-del-artefacto>
set -uo pipefail
ROOT=/home/user/thyrox
W="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
store="$1" annul="$2" expected="$3" probe="$4"
port="$(source src/lib/infrastructure.sh && echo "$THYROX_INFRA_OLLAMA_PORT")"
step() { printf '\n== %s %s\n' "$(date -u +%H:%M:%S)" "$*"; }
api() {
  bash bin/podman-execution-execute run --task TASK-THYROX-0757 --kind probe --network host -- \
    curl -sS --max-time 600 "http://127.0.0.1:${port}$1" "${@:2}" 2>&1 | grep -v '^execution thyrox-worker'
}
probe_digest() { api /api/tags | jq -r --arg m "$probe" '.models[]? | select(.name == $m) | .digest'; }
mounted() { podman inspect thyrox-ollama --format '{{range .Mounts}}{{if eq .Type "volume"}}{{.Name}}:{{.Destination}}{{end}}{{end}}' 2>/dev/null; }
blob_identity() {
  local data; data="$(podman volume inspect "$1" --format '{{.Mountpoint}}')"
  find "$data/models/blobs" -type f -printf '%f %s %i %T@\n' 2>/dev/null | sort
}

for attempt in $(seq 1 360); do
  live="$(podman ps --filter label=thyrox.owner-kind=task --format '{{.Names}}')"
  if [[ -z "$live" ]]; then
    step "ventana sin unidades vivas (intento $attempt): detener la infraestructura viva y recuperar"
    podman stop thyrox-postgres thyrox-redis >/dev/null 2>&1
    if bash bin/podman_lock_recovery --confirm; then break; fi
    echo "recuperación rehusada; se reintenta"
  fi
  sleep 10
done

step "re-materializar la infraestructura por el bootstrap"
for name in thyrox-postgres thyrox-redis; do bash bin/infrastructure_ensure "$name"; echo "$name exit=$?"; done
THYROX_INFRA_OLLAMA_VOLUME="$store" bash bin/infrastructure_ensure thyrox-ollama; echo "thyrox-ollama exit=$?"
echo "container=$(podman inspect thyrox-ollama --format '{{.Id}}' 2>/dev/null) mount=$(mounted)"

step "5. verificar"
after="$(probe_digest)"
blob_identity "$store" > "$W/outputs/blobs-after.txt"
pulls="$(podman logs thyrox-ollama 2>&1 | grep -ciE 'pulling|download' || true)"
[[ "$(mounted)" == "$store:/root/.ollama" ]] && echo "PASS mismo volumen" || echo "FAIL volumen $(mounted)"
[[ "$after" == "$expected" ]] && echo "PASS artefacto presente con la misma identidad" || echo "FAIL artefacto: despues=$after"
cmp -s "$W/outputs/blobs-before.txt" "$W/outputs/blobs-after.txt" && echo "PASS blobs idénticos (nombre, tamaño, inodo, mtime)" || echo "FAIL blobs cambiaron"
[[ "$pulls" == 0 ]] && echo "PASS sin descarga en el log del contenedor nuevo" || echo "FAIL $pulls líneas de descarga"

step "6. anulación: el mismo bootstrap sobre un volumen sin el store ($annul)"
THYROX_INFRA_OLLAMA_VOLUME="$annul" bash bin/infrastructure_ensure thyrox-ollama; echo "exit=$?"
annulled="$(probe_digest)"
[[ "$annulled" == "$expected" ]] && echo "ANNULMENT-FAIL el artefacto apareció sin su volumen" || echo "ANNULMENT-OK artefacto ausente sin su volumen (digest='$annulled')"

step "7. volver al store declarado"
THYROX_INFRA_OLLAMA_VOLUME="$store" bash bin/infrastructure_ensure thyrox-ollama; echo "exit=$?"
[[ "$(probe_digest)" == "$expected" ]] && echo "PASS restaurado" || echo "FAIL restaurado"
