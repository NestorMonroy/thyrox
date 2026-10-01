#!/usr/bin/env bash
# Diagnóstico del rechazo del ítem, dentro de un contenedor Podman cuyo árbol es
# una capa superpuesta desechable del repositorio: aplica (o no) el parche,
# instala, construye y carga @thyrox/agent, e imprime el primer error. El árbol
# del anfitrión no cambia. Uso: diagnose-podman.sh base|patch
set -uo pipefail
R=/home/user/thyrox; B="$(cd "$(dirname "$0")" && pwd)"; mode="$1"
podman run --rm -v "$R:/w:O" -w /w --rootfs /:O bash -c "
  git checkout -q -- . 2>/dev/null
  [[ $mode == patch ]] && { git apply '${B#$R/}/outputs/1.patch' || echo 'PARCHE NO APLICA'; }
  bun install --frozen-lockfile >/dev/null 2>&1
  bash bin/typescript-build-javascript src/packages/* 2>&1 | tail -1
  bun -e \"await import('@thyrox/agent')\" </dev/null 2>&1 | grep -m3 -E 'Error|error|at ' || echo 'agent carga'
" </dev/null
