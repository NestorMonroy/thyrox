#!/usr/bin/env bash
# test-toolchain-ready.sh — contrato del preflight en seco de la cadena de
# herramientas.
#
# El sujeto adapta la forma de `verify.sh` de
# `tencentdb-agent-memory: deploy/global-images/verify.sh` (MIT, leido en
# solo lectura). De ahi se toman TRES rasgos y se declara UNA divergencia:
#
#   tomado  · recoger TODOS los fallos y publicarlos juntos, no rehusar al
#             primero (`_lib.sh::require_vars`: «缺一个都不启动，一次性列出
#             所有缺失项»)
#   tomado  · separar error de aviso y contarlos aparte (`verify.sh`:
#             ERRORS / WARNS)
#   tomado  · no cambiar nada: es una verificacion, no un arranque
#   DIVERGE · la referencia colapsa su veredicto en 0/1, asi que un preflight
#             que no PUDO medir publicaria «1 error». Aqui eso es exit 2, que
#             es la forma que este arbol ya ejerce en
#             `check_vocabulario_prosa` y `census_findings`.
#
# El caso que DISCRIMINA la recogida completa es el 3: una implementacion que
# rehusara al primer fallo pasa 1, 2 y 7 y falla el 3. El que discrimina la
# separacion error/aviso es el 5: colapsarlos pasa el 3 y falla el 5.
#
# El control positivo del eje de conducta NO es fabricado: `mawk` esta
# instalado en este contenedor (`/usr/bin/mawk`) y el constructo de la sonda es
# el del episodio real que lo origina (h-docs-1068).
#
# El sujeto se invoca con `env -i`: sourcear `toolchain.sh` aqui exportaria sus
# funciones con `export -f` y la guarda de idempotencia haria que el re-source
# del hijo fuera un no-op — el defecto de H-THYROX-100, medido ayer.
#
# Ciega a: el eje del LOCALE, que `require_gawk` declara y no mide. Un awk que
# compile intervalos y cuente octetos pasa este preflight, y debe pasar: lo que
# se verifica es que la expresion no reviente, no la anchura que reporta.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/verify/check-toolchain-ready.sh"
source "$ROOT/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

# El sujeto corre en un entorno limpio: sin las funciones exportadas de la
# cadena y sin las variables que un caso previo haya dejado puestas.
run_subject() {
  env -i PATH="$PATH" HOME="$HOME" "$@" bash "$SUBJECT" 2>&1
}

MISSING_BIN="thyrox-binario-que-no-existe-$$"

# Caso 1 — el sujeto existe y es ejecutable por bash.
if [[ -f "$SUBJECT" ]]; then
  ok "el sujeto existe: src/verify/check-toolchain-ready.sh"
else
  bad "falta $SUBJECT"
  thyrox_summary; exit 1
fi

# Caso 2 — camino green del eje de conducta: con un awk que SI compila
# intervalos, su sonda sale ok.
green="$(run_subject THYROX_TOOLCHAIN_AWK_BIN=gawk)"; rc_green=$?
if grep -qE '^ok +· +awk' <<<"$green"; then
  ok "con gawk declarado, la sonda de awk sale ok"
else
  bad "esperaba 'ok · awk' con THYROX_TOOLCHAIN_AWK_BIN=gawk; salida: $green"
fi

# Caso 3 — RECOGIDA COMPLETA. Dos sondas rotas a la vez: la salida nombra las
# DOS. Una implementacion que rehusara al primer fallo nombraria una sola.
both="$(run_subject THYROX_TOOLCHAIN_AWK_BIN="$MISSING_BIN" \
                   THYROX_TOOLCHAIN_PARALLEL_BIN="$MISSING_BIN")"
if grep -qE '(error|aviso) +· +awk' <<<"$both" \
   && grep -qE '(error|aviso) +· +parallel' <<<"$both"; then
  ok "recoge TODOS los fallos: nombra awk y parallel en la misma salida"
else
  bad "solo nombro uno de los both fallos; salida: $both"
fi

# Caso 4 — NO PUDO MEDIR. Sin la biblioteca de la cadena, exit 2 y SIN conteo.
# Un 0 o un 1 aqui confundiria «no hay defectos» con «no pude medir»: es el
# sub-patron D de `metrica-decide-la-conclusion.md`, y es la unica divergencia
# declarada frente a la referencia.
without_lib="$(run_subject THYROX_LIB_TOOLCHAIN="/no/existe/toolchain.sh")"; rc_without=$?
if [[ $rc_without -eq 2 ]]; then
  ok "rehusa con exit 2 cuando no alcanza src/lib/toolchain.sh"
else
  bad "esperaba exit 2 sin la biblioteca, dio $rc_without; salida: $without_lib"
fi
if ! grep -q 'alcance medido' <<<"$without_lib"; then
  ok "la negativa NO emite conteo"
else
  bad "emitio conteo pese a no poder medir: $without_lib"
fi

# Caso 5 — error y aviso son veredictos DISTINTOS. `parallel` ausente degrada
# el pool a serie: es aviso, no error. Colapsarlos daria exit 1 sin --strict.
only_parallel="$(run_subject THYROX_TOOLCHAIN_PARALLEL_BIN="$MISSING_BIN")"; rc_parallel=$?
if [[ $rc_parallel -eq 0 ]]; then
  ok "un aviso solo no tumba el veredicto (exit 0)"
else
  bad "parallel ausente dio exit $rc_parallel, esperaba 0; salida: $only_parallel"
fi
only_parallel_strict="$(run_subject THYROX_TOOLCHAIN_PARALLEL_BIN="$MISSING_BIN" \
                   bash "$SUBJECT" --strict 2>&1)"
rc_parallel_strict=$(env -i PATH="$PATH" HOME="$HOME" \
  THYROX_TOOLCHAIN_PARALLEL_BIN="$MISSING_BIN" bash "$SUBJECT" --strict \
  >/dev/null 2>&1; echo $?)
if [[ $rc_parallel_strict -eq 1 ]]; then
  ok "--strict promueve el aviso a fallo (exit 1)"
else
  bad "--strict con parallel ausente dio exit $rc_parallel_strict, esperaba 1"
fi

# Caso 6 — el conteo publica su DENOMINADOR. Un conteo sin el no es resultado:
# un instrumento ciego y uno correcto publican la misma cifra.
if grep -qE 'alcance medido: [0-9]+ de [0-9]+ sonda' <<<"$green"; then
  ok "publica el denominador junto al conteo"
else
  bad "no publica 'alcance medido: N de M sondas'; salida: $green"
fi

# Caso 7 — CONTROL POSITIVO REAL del eje de conducta. `mawk` esta instalado:
# resuelve (eje 1 pasa) y NO compila el constructo (eje 2 falla). El rechazo
# tiene que relevar el remedio de la sonda —nombrar THYROX_TOOLCHAIN_AWK_BIN—
# y no el remedio de presencia, que aqui no arreglaria nada.
if command -v mawk >/dev/null 2>&1; then
  with_mawk="$(run_subject THYROX_TOOLCHAIN_AWK_BIN=mawk)"; rc_mawk=$?
  if [[ $rc_mawk -eq 1 ]]; then
    ok "mawk presente pero sin intervalos: exit 1 (error, no aviso)"
  else
    bad "con mawk dio exit $rc_mawk, esperaba 1; salida: $with_mawk"
  fi
  if grep -q 'THYROX_TOOLCHAIN_AWK_BIN' <<<"$with_mawk"; then
    ok "releva el remedio de la sonda, no compone uno propio"
  else
    bad "el rechazo no nombra THYROX_TOOLCHAIN_AWK_BIN: $with_mawk"
  fi
else
  bad "mawk no esta instalado: el control positivo del eje de conducta no se pudo ejercer"
fi

thyrox_summary
