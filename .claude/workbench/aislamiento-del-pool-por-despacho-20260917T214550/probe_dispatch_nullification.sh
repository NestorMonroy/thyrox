#!/usr/bin/env bash
# =============================================================================
# probe_dispatch_nullification.sh — control de anulacion del despacho por directorio
# =============================================================================
# QUE MIDE: si el mecanismo bajo prueba —un directorio por despacho, con la
# etiqueta jerarquica `<despacho>/<nombre>`— es lo que sostiene las aserciones
# de `test-run-task-pool-aislamiento.sh`, o si la suite pasaria igual sin el.
#
# El sub-patron D de `metrica-decide-la-conclusion.md`: un verde no distingue
# «el mecanismo funciona» de «el test no pregunta». Se retira la causa y tienen
# que caer EXACTAMENTE las aserciones que dependen de ella, ni una mas.
#
# DOS DEFECTOS DE ESTE MISMO GUION, corregidos tras medirlos — los dos son el
# sub-patron D con la propia sonda como sujeto:
#
#   1. La primera version dejaba en pie el `until mkdir "$RUN_DIR"`. Con
#      `RUN_DIR="$DIR"` el directorio YA existe, asi que `mkdir` sin `-p` fallaba
#      mil veces y el pool salia con exit 4 SIN LANZAR NADA. Cayeron 10 de 11 —
#      pero no por la causa retirada, sino porque el sujeto estaba roto. Una
#      anulacion que impide arrancar no mide el mecanismo: mide su ausencia de
#      arranque. La forma PREVIA al arreglo usaba `mkdir -p`, y eso es lo que
#      hay que reponer para que el sujeto corra plano.
#
#   2. La verificacion de la restauracion usaba `git diff --stat` contra HEAD.
#      HEAD todavia lleva la version PREVIA al arreglo —el arreglo esta sin
#      commitear— asi que ese diff NUNCA puede salir vacio y su lectura como
#      «restauracion exacta» era falsa. Lo que discrimina es `cmp` contra la
#      copia, que es el estado del que se partio.
# =============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SUBJECT="$ROOT/src/session/run-task-pool.sh"
SUITE="$ROOT/tests/session/test-run-task-pool-aislamiento.sh"
BACKUP="$(mktemp)"
trap 'cp "$BACKUP" "$SUBJECT"; rm -f "$BACKUP"' EXIT

cp "$SUBJECT" "$BACKUP"

echo "== 0. verde de partida (el mecanismo presente) =="
bash "$SUITE" 2>&1 | tail -3

echo
echo "== 1. anulacion: se retira el despacho por directorio =="
# Cuatro sustituciones, las cuatro del mismo mecanismo:
#   - el log vuelve al hogar global y plano
#   - el guard atomico cede a `mkdir -p`, que es lo que el sujeto hacia antes
#     (sin esto el pool no arranca y la medicion es de otra cosa)
#   - la etiqueta pierde su prefijo de despacho
#   - la espera deja de acotarse a los hijos de ESTE despacho
sed -i \
    -e 's|^RUN_DIR="\$DIR/\$DISPATCH"$|RUN_DIR="$DIR"|' \
    -e 's|^    RUN_DIR="\$DIR/\$DISPATCH"$|    RUN_DIR="$DIR"|' \
    -e 's|^until mkdir "\$RUN_DIR" 2>/dev/null; do$|mkdir -p "$RUN_DIR"; until true; do|' \
    -e 's|^    LABEL="\$DISPATCH/\$_nombre"$|    LABEL="$_nombre"|' \
    -e 's|wait --timeout "\$TIMEOUT" --only "\$DISPATCH"|wait --timeout "$TIMEOUT"|' \
    "$SUBJECT"
grep -n 'RUN_DIR=\|LABEL=\|wait --timeout\|until true' "$SUBJECT"
bash -n "$SUBJECT" && echo "sintaxis del sujeto mutado: OK"

echo
echo "== 2. la suite con la causa retirada =="
bash "$SUITE" 2>&1 | tail -20

echo
echo "== 3. restauracion, y su verificacion CONTRA LA COPIA =="
cp "$BACKUP" "$SUBJECT"
if cmp -s "$BACKUP" "$SUBJECT"; then
    echo "cmp: identico a la copia — la restauracion fue exacta"
else
    echo "cmp: DIVERGE de la copia — la restauracion NO fue exacta" >&2
fi

echo
echo "== 4. verde de vuelta =="
bash "$SUITE" 2>&1 | tail -3
