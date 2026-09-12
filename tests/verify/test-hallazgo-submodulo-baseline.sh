#!/usr/bin/env bash
# Control de la resolucion del baseline del gate de submodulo de hallazgo.
#
# Origen: es h-docs-1107 en su hermano. La mudanza a thyrox (h-docs-1094) movio
# los dos gates juntos; check-hallazgo-sucesor.sh y check_vocabulario_prosa.py
# recibieron la resolucion contra el CONSUMIDOR, y este no. Siguio resolviendo
# `__file__.parent`, que antes era `.claude/scripts/gates/` del consumidor y
# desde `thyrox/src/verify/` es el proveedor, donde el archivo no existe.
#
# Medido al escribir este control: 62 rutas congeladas en el consumidor, y el
# gate publicando «63 fuera de su submodulo, sin baseline · 0 en baseline
# heredado». No distingue deuda heredada de defecto de hoy, que es justo lo
# que el baseline existe para separar.
#
# El control tiene que poder fallar: el caso 3 mide que el gate REHUSE en vez
# de operar con un conjunto vacio — un cero ahi no separa «no hay deuda» de
# «no encontre el archivo» (sub-patron D de metrica-decide-la-conclusion.md).
set -uo pipefail

GATE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../src/verify" && pwd)/check_hallazgo_submodulo.py"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
FAILURES=0
CASES=0

case_start() { CASES=$((CASES + 1)); }
ok()         { echo "  ok    $1"; }
fail()       { FAILURES=$((FAILURES + 1)); echo "  FALLA $1: $2"; }

# Un hallazgo cuyos tres signos NO coinciden: ID=docs, meta=docs, carpeta=api.
# Es deuda REAL de la forma que el gate mide, no un incumplidor inventado.
RUTA='source/gestion/pm/api/iniciativas/probe/hallazgos/hallazgo-H-DOCS-9001-probe.rst'
mkdir -p "$TMP/consumer/$(dirname "$RUTA")" "$TMP/consumer/.claude/baselines"
printf '.. meta::\n   :submodulo: docs\n\nProbe\n=====\n' > "$TMP/consumer/$RUTA"

echo "test-hallazgo-submodulo-baseline"

# --- Caso 1: el baseline del consumidor se encuentra desde el cwd ------------
# Es el caso que hoy falla: el gate busca junto a si mismo, en el proveedor.
case_start
printf '%s\n' "$RUTA" > "$TMP/consumer/.claude/baselines/hallazgo_submodulo_baseline.txt"
OUT="$(cd "$TMP/consumer" && python3 "$GATE" --strict 2>&1)"; EXIT=$?
if [ "$EXIT" -eq 0 ]; then
  ok "el baseline del consumidor congela la ruta (exit 0)"
else
  fail "baseline del consumidor" "exit=$EXIT — la ruta congelada se publico como nueva: $OUT"
fi

# --- Caso 2: la variable de entorno gana sobre todo lo demas -----------------
case_start
printf '%s\n' "$RUTA" > "$TMP/declarado.txt"
OUT="$(cd "$TMP/consumer" && HALLAZGO_SUBMODULO_BASELINE="$TMP/declarado.txt" \
        python3 "$GATE" --strict 2>&1)"; EXIT=$?
if [ "$EXIT" -eq 0 ]; then
  ok "la variable declarada resuelve el baseline (exit 0)"
else
  fail "variable declarada" "exit=$EXIT — $OUT"
fi

# --- Caso 3: sin baseline en ningun sitio, REHUSA y no emite conteo ----------
# Discrimina: hoy el gate devuelve set() en silencio y publica un conteo que
# mezcla heredado con nuevo. Si volviera a hacerlo, este caso lo detecta.
case_start
rm -f "$TMP/consumer/.claude/baselines/hallazgo_submodulo_baseline.txt"
OUT="$(cd "$TMP/consumer" && python3 "$GATE" --quiet 2>&1)"; EXIT=$?
if [ "$EXIT" -eq 2 ] && ! printf '%s' "$OUT" | grep -qE '^[0-9]+$'; then
  ok "rehusa sin baseline (exit 2) y no emite conteo"
else
  fail "rehuso sin baseline" "exit=$EXIT, salida='$OUT' — un conteo aqui no separa heredado de nuevo"
fi

# --- Caso 4: --write-baseline escribe en el consumidor, no en el proveedor ---
case_start
OUT="$(cd "$TMP/consumer" && python3 "$GATE" --write-baseline 2>&1)"; EXIT=$?
DESTINO="$TMP/consumer/.claude/baselines/hallazgo_submodulo_baseline.txt"
if [ -f "$DESTINO" ] && grep -qF "$RUTA" "$DESTINO"; then
  ok "--write-baseline aterriza en el consumidor"
else
  fail "--write-baseline" "no aterrizo en $DESTINO (exit=$EXIT): $OUT"
fi

echo "  $CASES caso(s), $FAILURES falla(s)"
[ "$FAILURES" -eq 0 ]
