#!/usr/bin/env bash
# Comprueba, sobre el árbol integrado y dentro de un contenedor Podman con el
# repositorio como capa superpuesta (el build no toca el árbol del anfitrión
# ni repunta sus manifiestos), que cada recurso que un módulo lee relativo a sí
# mismo está junto a CADA .js emitido que lo nombra. Con splitting ese .js
# puede ser un chunk en la raíz de dist/, así que la posición espejo del
# fuente no basta (H-THYROX-264). Criterios:
#   1. cada *.prompt.md de tools/src/definitions está junto a todo .js de
#      tools/dist que lo nombra, y ningún prompt queda sin lector emitido;
#   2. agent/dist/models.jsonl existe y agent/dist/models.js carga desde dist;
#   3. bridge.py está junto a todo .js de computer-use-mcp/dist que lo nombra.
# El 4 (control de anulación ON→PASS, OFF→ENOENT) se lee en la prueba del
# parche; el 5 es `git status --short` vacío tras el commit.
set -uo pipefail
R="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
podman run --rm -v "$R:/w:O" -w /w --rootfs /:O bash -c '
  set -uo pipefail
  bun install --frozen-lockfile >/dev/null 2>&1 || { echo "cierre: bun install falló"; exit 1; }
  bash bin/typescript-build-javascript src/packages/* >/dev/null 2>&1 || { echo "cierre: build falló"; exit 1; }
  fails=0
  # $1 paquete, $2 nombre del recurso: imprime cuántos lectores emitidos hay y
  # cuántos NO tienen el recurso a su lado.
  beside() {
    local readers missing=0 total=0 js
    readers=$(grep -rl --include=*.js -F "$2" "src/packages/$1/dist" 2>/dev/null)
    for js in $readers; do total=$((total+1)); [[ -f "$(dirname "$js")/$2" ]] || missing=$((missing+1)); done
    echo "$total $missing"
  }
  ok=0; bad=0; orphan=0
  for p in $(cd src/packages/tools/src && find definitions -name "*.prompt.md" -printf "%f\n" | sort); do
    read -r total missing < <(beside tools "$p")
    if (( total == 0 )); then orphan=$((orphan+1)); echo "  1: $p sin lector emitido"
    elif (( missing > 0 )); then bad=$((bad+1)); echo "  1: $p falta junto a $missing de $total lector(es)"
    else ok=$((ok+1)); fi
  done
  n=$((ok+bad+orphan))
  if (( bad + orphan > 0 )); then echo "1 FALLA: $ok de $n prompt(s) junto a todos sus lectores"; fails=$((fails+1))
  else echo "1 ok: $n de $n prompt(s) junto a todos sus lectores emitidos"; fi
  read -r total missing < <(beside agent models.jsonl)
  if (( total > 0 && missing == 0 )); then echo "2a ok: models.jsonl junto a sus $total lector(es)"
  else echo "2a FALLA: models.jsonl falta junto a $missing de $total lector(es)"; fails=$((fails+1)); fi
  if out=$(bun -e "const m = await import(\"./src/packages/agent/dist/models.js\"); console.log(m.MODEL_IDS.length)" </dev/null 2>&1); then echo "2b ok: models.js desde dist, $out modelos"
  else echo "2b FALLA: $(printf "%s" "$out" | grep -m1 -E "ENOENT|Error")"; fails=$((fails+1)); fi
  read -r total missing < <(beside computer-use-mcp bridge.py)
  if (( total > 0 && missing == 0 )); then echo "3 ok: bridge.py junto a sus $total lector(es)"
  else echo "3 FALLA: bridge.py falta junto a $missing de $total lector(es)"; fails=$((fails+1)); fi
  exit $fails
' </dev/null
