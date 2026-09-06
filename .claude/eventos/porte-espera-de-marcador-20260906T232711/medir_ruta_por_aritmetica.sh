#!/usr/bin/env bash
# ¿Cuántas de las suites clasificadas OTRO son en realidad RUTA?
#
# El discriminador de la segunda medición del triaje buscaba el literal
# `.claude/scripts` — la ruta previa al traslado. Es ciego a la otra forma de
# citar el sujeto: la ARITMÉTICA de ruta (`dirname($0)/..`), que no nombra
# ninguna ruta vieja y aun así apunta al sitio equivocado desde `tests/legacy/`.
#
# Aquí se mide la forma, no el literal: por cada suite, se extrae el valor que
# asigna a su variable de sujeto y se comprueba si el archivo existe.
set -uo pipefail
cd "$(dirname "$0")/../../.."
for s in "$@"; do
  ruta="tests/legacy/$s"
  [ -f "$ruta" ] || { printf '%-40s (ausente)\n' "$s"; continue; }
  aritmetica=$(grep -cE 'dirname "?\$\{?BASH_SOURCE|dirname "\$0"' "$ruta")
  # El sujeto declarado: primera asignación a SUT/SCRIPT/GATE/BAJO_PRUEBA.
  sujeto=$(grep -m1 -oE '^(SUT|SCRIPT|GATE|BAJO_PRUEBA)=.*' "$ruta" | cut -d= -f2-)
  resuelto=$(cd tests/legacy && eval "BASH_SOURCE=($s); echo $sujeto" 2>/dev/null)
  if [ -n "$resuelto" ] && [ ! -e "$resuelto" ]; then estado="RUTA (sujeto ausente)"
  elif [ -n "$resuelto" ]; then estado="sujeto existe"
  else estado="sin variable de sujeto reconocible"; fi
  printf '%-40s aritmetica=%s  %s\n' "$s" "$aritmetica" "$estado"
done
