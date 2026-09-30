#!/usr/bin/env bash
# El canal THYROX_SRC de reconcile-agents.sh: el guion le pasa a sus dos
# heredocs de Python dónde está `src/` —el del diagnóstico de vivacidad y el
# de la entrega— y los dos lo leen de `os.environ["THYROX_SRC"]`.
#
# Contrato que se mide: el canal lo fija el guion en la línea que lanza cada
# hijo, a partir de THYROX_ROOT; lo que exporte quien lo invoca no entra.
#
# EL CASO QUE DISCRIMINA es el 2: con un THYROX_SRC exportado que no apunta a
# nada, el roster se clasifica igual. Un guion que heredara el del llamador
# en vez de fijarlo mandaría a los dos hijos a una ruta vacía y el reporte
# caería a `indecidible`. El caso 1 es el control de que el fixture sí llega a
# los dos cubos que el canal alimenta: `terminado` (diagnóstico) y `entrego`
# (entrega).
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="${RECONCILE_AGENTS_SCRIPT:-$ROOT/src/agents/reconcile-agents.sh}"
T="$(mktemp -d)"; trap 'rm -rf "${T:?}"' EXIT
PASSED=0; FAILED=0
check() {
    if [[ "$2" == "$3" ]]; then printf '  ok    %s\n' "$1"; PASSED=$((PASSED + 1))
    else printf '  FALLA %s\n        esperado: %s\n        obtenido: %s\n' "$1" "$3" "$2"; FAILED=$((FAILED + 1)); fi
}

# Un roster con una tarea bash terminada y un subagente que cerró con su
# informe, los dos fuera de la ventana de actividad.
mkdir -p "$T/tasks"
printf 'x\nEXIT=0\n' > "$T/tasks/b.output"
printf '%s\n' '{"type":"user","message":{"content":"hola"}}' \
    '{"type":"assistant","message":{"content":[{"type":"text","text":"informe"}]}}' > "$T/s.jsonl"
ln -s "$T/s.jsonl" "$T/tasks/s.output"
touch -h -d '-2 hours' "$T/tasks/b.output" "$T/s.jsonl"

bucket() { gawk -v b="$1" '$1 == b { print $2; exit }' <<<"$2"; }

echo "== 1. el roster llega a los dos cubos que el canal alimenta =="
OUT="$(env -u THYROX_SRC THYROX_ROOT="$ROOT" RECONCILE_ROSTER="$T/tasks" timeout 60 bash "$SCRIPT" 2>&1)"
check "terminado (diagnóstico de vivacidad)" "$(bucket terminado "$OUT")" "2"
check "entrego (veredicto de entrega)" "$(bucket entrego "$OUT")" "1"
check "indecidible" "$(bucket indecidible "$OUT")" "0"

echo "== 2. un THYROX_SRC exportado por el llamador no desvía a los hijos =="
OUT="$(THYROX_SRC="$T/no-existe" THYROX_ROOT="$ROOT" RECONCILE_ROSTER="$T/tasks" timeout 60 bash "$SCRIPT" 2>&1)"
check "terminado con THYROX_SRC ajeno" "$(bucket terminado "$OUT")" "2"
check "entrego con THYROX_SRC ajeno" "$(bucket entrego "$OUT")" "1"

echo "pasaron $PASSED, fallaron $FAILED"
[[ $FAILED -eq 0 ]]
