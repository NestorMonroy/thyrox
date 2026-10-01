#!/usr/bin/env bash
# THYROX_JOBS_ARCHIVE_DIR: dónde deja `wait-jobs archive` el `.tar.gz` del
# ledger.
#
# Contrato: la clave propia gana sobre la heredada del consumidor
# (KX_TRABAJOS_ARCHIVO_DIR), y sin ninguna el archivo va a `.claude/jobs` del
# árbol. El caso que DISCRIMINA es el 1: con las dos declaradas, el archivo
# tiene que caer en la propia. Un guion que leyera sólo la heredada pasaría el
# caso 2 y fallaría aquí. El default no se ejercita: escribiría en el árbol.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$ROOT/src/session/wait-jobs.sh"
T="$(mktemp -d)"; trap 'rm -rf "${T:?}"' EXIT
PASSED=0; FAILED=0
check() {
    if [[ "$2" == "$3" ]]; then printf '  ok    %s\n' "$1"; PASSED=$((PASSED + 1))
    else printf '  FALLA %s\n        esperado: %s\n        obtenido: %s\n' "$1" "$3" "$2"; FAILED=$((FAILED + 1)); fi
}

# Un ledger aislado con un trabajo registrado, y ningún otro hogar heredado.
run() {
    env -u THYROX_JOBS_ARCHIVE_DIR -u KX_TRABAJOS_ARCHIVO_DIR -u KX_TRABAJOS_DIR \
        THYROX_SESSION_LEDGER_DIR="$T/ledger" "$@"
}
register() { touch "$T/job.log"; run bash "$SCRIPT" register probe "$T/job.log" >/dev/null 2>&1; }

echo "== 1. la clave propia gana sobre la heredada =="
register
run THYROX_JOBS_ARCHIVE_DIR="$T/own" KX_TRABAJOS_ARCHIVO_DIR="$T/legacy" \
    bash "$SCRIPT" archive probe-id >/dev/null 2>&1
check "el archivo cae en THYROX_JOBS_ARCHIVE_DIR" \
    "$([[ -f "$T/own/probe-id.tar.gz" ]] && echo si || echo no)" "si"
check "la heredada no recibe nada" \
    "$([[ -e "$T/legacy/probe-id.tar.gz" ]] && echo si || echo no)" "no"
check "el .tar.gz lleva el .job" \
    "$(tar -tzf "$T/own/probe-id.tar.gz" 2>/dev/null | grep -c 'probe.job')" "1"

echo "== 2. sin la propia, la heredada sigue valiendo =="
register
run KX_TRABAJOS_ARCHIVO_DIR="$T/legacy" bash "$SCRIPT" archive probe-id >/dev/null 2>&1
check "el archivo cae en KX_TRABAJOS_ARCHIVO_DIR" \
    "$([[ -f "$T/legacy/probe-id.tar.gz" ]] && echo si || echo no)" "si"

echo "pasaron $PASSED, fallaron $FAILED"
[[ $FAILED -eq 0 ]]
