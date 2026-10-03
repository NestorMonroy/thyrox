#!/usr/bin/env bash
# Prueba de durabilidad de thyrox-postgres por la única vía permitida:
# escribir una fila (en una unidad) -> forzar que la primitiva RECREE el
# contenedor (bin/infrastructure_ensure con una configuración distinta) ->
# leerla (en otra unidad) -> volver a la declaración y comprobar que se
# conserva. Ningún `podman run/create/rm` fuera de la primitiva.
set -uo pipefail
ROOT=/home/user/thyrox
W="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
MARKER="durability-$(date -u +%Y%m%dT%H%M%S)-$$"
in_unit() {
    local port_env=()
    [[ -n "${THYROX_INFRA_POSTGRES_PORT:-}" ]] && port_env=(--env THYROX_INFRA_POSTGRES_PORT)
    bash bin/podman-execution-execute run --task TASK-THYROX-0741 --kind test --network host \
        --secret-from-env THYROX_INFRA_POSTGRES_PASSWORD "${port_env[@]}" -- \
        bash -c 'source src/lib/toolchain.sh && thyrox_toolchain_require_bun >/dev/null && exec "${THYROX_TOOLCHAIN_BUN_BIN:-bun}" run "$0" "$@"' \
        "$W/probes/marker.ts" "$@" 2>&1 | grep -vE '^execution thyrox-worker'
    return "${PIPESTATUS[0]}"
}
step() { printf '\n== %s\n' "$*"; }

step "1. escribir la fila marcadora en una unidad"
in_unit write "$MARKER"; echo "exit=$?"
# El plazo de salud NO fuerza recreación: no es propiedad del contenedor
# (configDigest no lo incluye; medido en outputs/durability-health-timeout-kept.log).
# El puerto publicado sí: está en la huella de configuración.
step "2. recrear por la primitiva: puerto declarado distinto (55433)"
THYROX_INFRA_POSTGRES_PORT=55433 bash bin/infrastructure_ensure thyrox-postgres; echo "exit=$?"
step "3. leer la fila tras la recreación, por el puerto nuevo"
THYROX_INFRA_POSTGRES_PORT=55433 in_unit read "$MARKER"; echo "exit=$?"
step "4. volver a la declaración"
bash bin/infrastructure_ensure thyrox-postgres; echo "exit=$?"
step "5. leer la fila otra vez"
in_unit read "$MARKER"; echo "exit=$?"
step "6. ensure sin cambios conserva"
bash bin/infrastructure_ensure thyrox-postgres; echo "exit=$?"
step "7. control: un marcador que nunca se escribió no aparece"
in_unit read "never-written-$$"; echo "exit=$?"
