#!/usr/bin/env bash
# Anulación de TASK-THYROX-0928: retira cada mitad y mide qué cae.
set -u
cd "$(git rev-parse --show-toplevel)"
F=src/session/local_control_plane_ready.sh
annul() {
  local name="$1" saved; saved="$(mktemp)"; cp "$F" "$saved"
  OLD="$2" NEW="$3" bash bin/replace_literal "$F" >/dev/null || { echo "$name: no aplicó"; cp "$saved" "$F"; return; }
  echo "== $name"; timeout 120 bash tests/session/test-local-control-plane-ready.sh 2>&1 | grep -E "FALLO|casos:" | grep -v "^ *esperado\|^ *obtenido"
  cp "$saved" "$F"; rm -f "$saved"
}
annul help-read-only '    --help) usage ;;' '    --help) converge "$@" ;;'
annul status-read-only '    --status) report_status ;;' '    --status) converge ;;'
annul runtime-steps '  converge_runtime
}' '}'
git diff --stat -- "$F"
