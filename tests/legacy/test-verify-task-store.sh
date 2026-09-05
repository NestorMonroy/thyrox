#!/bin/bash
# =============================================================================
# test-verify-task-store.sh — caso de prueba de regresión para H-DOCS-120
# =============================================================================
#
# Qué protege
# ------------
# `verify-task-store-in-cli-js.sh` abortaba con SIGPIPE (141) en su séptimo
# check por `find ... | head -1` bajo `set -euo pipefail`, sin imprimir su
# línea RESULTADO. El fallo es DEPENDIENTE DE LA CARGA: con pocos archivos
# `find` termina de recorrer antes de que `head` cierre la tubería, y no hay
# señal. Por eso pasó verde con 32 tareas y abortó con 247.
#
# Un fix sin test aquí no vale: quien reintroduzca `| head -1` lo verá pasar
# en un board pequeño. Este test fabrica un board GRANDE para forzar la
# condición.
#
# Las dos mitades del test (la segunda es la que lo hace creíble)
# ----------------------------------------------------------------
#   POSITIVO — el guion actual, contra un board de $N_FILES tareas, sale 0 y
#              emite RESULTADO + la línea `campos:` de la sección 7.
#   CONTROL  — una copia MUTADA del guion, con el `find | head -1` original
#              restaurado, DEBE fallar contra el mismo board.
#
# Sin el control, un test que sólo afirma "pasa" no distingue un guion
# correcto de un test ciego: es la trampa que `hallazgo-abierto-genera-sucesor.md`
# documenta tres veces para sus propios gates ("probarlo contra un positivo
# conocido, no contra un incumplidor fabricado por quien escribió el patrón").
#
# Uso:
#   bash .claude/scripts/test-verify-task-store.sh
#   N_FILES=5000 bash .claude/scripts/test-verify-task-store.sh   # más margen
#
# Exit 0 si ambas mitades se comportan como se espera; 1 si alguna no.
# =============================================================================
set -uo pipefail

# El SUT vive un nivel arriba: los tests son un directorio hermano del
# código, no viven junto a él (forma medida en ``ccb: daemon/src/__tests__/``).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="$SCRIPT_DIR/gates/verify-task-store-in-cli-js.sh"
N_FILES="${N_FILES:-2000}"
fail=0

ok()   { echo "  OK   $*"; }
bad()  { echo "  FAIL $*"; fail=1; }

cleanup() { [[ -n "${TMP:-}" ]] && rm -rf "$TMP"; }
trap cleanup EXIT

TMP="$(mktemp -d)"
FIXTURE="$TMP/tasks"
TEAM="$FIXTURE/00000000-0000-0000-0000-000000000000"
mkdir -p "$TEAM"

echo "=== Fixture: board sintético de $N_FILES tareas ==="
# Un JSON con el mismo esquema que el board real, para que la seccion 7 tenga
# algo que inspeccionar con jq.
for i in $(seq 1 "$N_FILES"); do
  printf '{"id":"%s","subject":"t%s","description":"d","activeForm":"a","status":"pending","blocks":[],"blockedBy":[]}\n' \
    "$i" "$i" > "$TEAM/$i.json"
done
echo "  creados: $(find "$TEAM" -name '*.json' | wc -l) archivos en $TEAM"
echo

# ---------------------------------------------------------------------------
# POSITIVO — el guion actual debe completar
# ---------------------------------------------------------------------------
echo "=== POSITIVO: el guion actual contra el board grande ==="
OUT_OK="$TMP/positivo.out"
TASKS_ROOT="$FIXTURE" bash "$TARGET" > "$OUT_OK" 2>&1
rc=$?

[[ "$rc" -eq 0 ]] \
  && ok "exit 0" \
  || bad "exit $rc (141 = SIGPIPE — el bug de H-DOCS-120 esta de vuelta)"

grep -q '^RESULTADO:' "$OUT_OK" \
  && ok "emite la linea RESULTADO (no aborta antes del veredicto)" \
  || bad "sin linea RESULTADO — el guion murio antes de emitir veredicto"

grep -q '  campos: ' "$OUT_OK" \
  && ok "la seccion 7 imprime el esquema real" \
  || bad "la seccion 7 no imprimio nada (es donde abortaba)"

grep -q 'blockedBy' "$OUT_OK" \
  && ok "el esquema incluye blockedBy (leyo un JSON de verdad)" \
  || bad "el esquema no parece venir de un JSON real"
echo

# ---------------------------------------------------------------------------
# CONTROL — la version con el bug DEBE fallar
# ---------------------------------------------------------------------------
echo "=== CONTROL: copia mutada con el 'find | head -1' original ==="
MUTANT="$TMP/mutante.sh"
sed "s#^FIRST_JSON=.*#FIRST_JSON=\$(find \"\$TASKS_ROOT\" -maxdepth 2 -name '*.json' 2>/dev/null | head -1)#" \
  "$TARGET" > "$MUTANT"

if ! grep -q 'head -1' "$MUTANT"; then
  bad "la mutacion no se aplico — el test no puede probar nada"
else
  OUT_BAD="$TMP/control.out"
  TASKS_ROOT="$FIXTURE" bash "$MUTANT" > "$OUT_BAD" 2>&1
  rc_bad=$?

  if [[ "$rc_bad" -ne 0 ]] || ! grep -q '^RESULTADO:' "$OUT_BAD"; then
    ok "el mutante falla como se espera (exit $rc_bad, RESULTADO=$(grep -c '^RESULTADO:' "$OUT_BAD"))"
  else
    bad "el mutante PASO — este test es ciego al bug que dice proteger"
  fi
fi
echo

if [[ "$fail" -eq 0 ]]; then
  echo "RESULTADO: el fix esta protegido — el guion pasa y su version con el bug no."
else
  echo "RESULTADO: hay comprobaciones fallidas — ver FAIL arriba."
fi
exit "$fail"
