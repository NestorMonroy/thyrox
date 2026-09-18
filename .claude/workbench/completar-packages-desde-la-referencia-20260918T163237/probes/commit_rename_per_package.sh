#!/usr/bin/env bash
# Commitea el renombre de alcance paquete por paquete, sin --no-verify: el
# veredicto de cada gate se recoge por separado. Un commit unico de 656
# archivos colapsa doce veredictos en uno.
set -uo pipefail
cd /home/user/thyrox
ORDEN="daemon app-host swarm mcp-runtime output shell config command-runtime agent provider tool-registry cli permission storage memory local-observability bridge headless-sdk updater ide voice teleport server"
for p in $ORDEN; do
  n=$(git status --porcelain -- "src/packages/$p" | wc -l)
  [ "$n" -eq 0 ] && continue
  msg=$(cat <<MSG
Reescribir el alcance de $p a @thyrox

$n archivo(s): el especificador de modulo pasa de
\`@claude-code-how-works/*\` —el alcance del monorepo del que se copio el
codigo— al de este arbol. No es deuda que documentar: es el paso que
completa la copia, porque 24 de los 26 subpaquetes citados ya existen en
\`src/packages/\` y sin el renombre ninguno resuelve.

Dos condiciones, cada una con su control de anulacion en el banco: la
ocurrencia no cae dentro de un rango de comentario (por AST, no por
heuristica de linea) y abre comilla. Retirada la primera entran 10 de mas
—comentarios que citan un especificador de la FUENTE y que el renombre
volveria falsos—; retirada la segunda, 23 —cadenas de mensaje en tiempo
de ejecucion, que no son especificadores—.

Refs: TASK-THYROX-0169
MSG
)
  for i in 1 2 3 4 5; do
    out=$(printf '%s' "$msg" | git commit -q -F - -- "src/packages/$p" 2>&1) && { echo "OK   $p ($n)"; break; }
    if printf '%s' "$out" | grep -q 'index.lock'; then sleep 1; continue; fi
    echo "FALLA $p ($n)"; printf '%s\n' "$out" | grep -E "^[a-z-]+:|error TS" | tail -8 | sed 's/^/     | /'
    break
  done
done
echo "=== restante sin commitear ==="
git status --porcelain -- src/packages | wc -l
