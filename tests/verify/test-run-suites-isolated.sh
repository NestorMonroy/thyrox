#!/usr/bin/env bash
# Suite de src/verify/run_suites_isolated.sh — las mitades Python y shell de
# tests/run.sh, repartidas con GNU parallel y con un tope por suite.
#
# Por que existe: las dos mitades corrian en serie y sin tope. Una suite
# colgada —`test-toolchain-manifests.sh` con el `awk` de 77d4bc40— dejaba la
# ejecucion entera esperando para siempre, sin nombre y sin veredicto.
#
# Qué haría fallar a cada caso:
#   0. publicar una cifra sin archivos (rehusa con 2, sin conteo);
#   1. quitar el tope: la suite colgada no termina (el caso 1 lo corre bajo
#      un `timeout` externo y exige `-- TIMEOUT` con su nombre);
#   2. contar el exit 2 como rojo;
#   3. no nombrar la suite roja con `-- FAIL` ni mostrar su salida;
#   4. volver a la serie: dos suites de 2 s no caben en 3.5 s;
#   5. un verde que no publica su denominador.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
RUNNER="$ROOT/src/verify/run_suites_isolated.sh"
failures=0; total=0
check() { total=$((total+1)); if [[ "$2" == "$3" ]]; then echo "OK   $1"; else echo "FALLA $1 — esperado '$3', obtenido '$2'"; failures=$((failures+1)); fi; }

F="$(mktemp -d)"; trap 'rm -rf "$F"' EXIT
printf 'exit 0\n'                       > "$F/test-green.sh"
printf 'echo red-detail; exit 1\n'      > "$F/test-red.sh"
printf 'exit 2\n'                       > "$F/test-refuses.sh"
printf 'sleep 600\n'                    > "$F/test-hangs.sh"
printf 'sleep 2\n'                      > "$F/test-slow-a.sh"
printf 'sleep 2\n'                      > "$F/test-slow-b.sh"

# 0 — sin archivos rehusa con 2 y sin cifra.
out="$(printf '' | bash "$RUNNER" --interpreter bash 2>&1)"; rc=$?
check "0. sin archivos rehusa con 2" "$rc" "2"
[[ "$out" =~ files=[0-9] ]] && seen=yes || seen=no
check "0. sin cifra" "$seen" "no"

# 1 — una suite colgada sale como TIMEOUT con su nombre, dentro del tope.
out="$(printf '%s\n' "$F/test-hangs.sh" "$F/test-green.sh" \
  | timeout 30 bash "$RUNNER" --interpreter bash --timeout 2 2>&1)"; rc=$?
check "1. la colgada no cuelga al corredor" "$([[ $rc -eq 124 ]] && echo hung || echo finished)" "finished"
check "1. y sale en rojo" "$rc" "1"
grep -q -- "-- TIMEOUT $F/test-hangs.sh" <<<"$out" && seen=yes || seen=no
check "1. nombrada como TIMEOUT" "$seen" "yes"

# 2 — exit 2 es «sin medir», no rojo.
out="$(printf '%s\n' "$F/test-refuses.sh" "$F/test-green.sh" | bash "$RUNNER" --interpreter bash 2>&1)"; rc=$?
check "2. exit 2 no es rojo" "$rc" "0"
grep -q -- "-- UNMEASURED (exit 2) $F/test-refuses.sh" <<<"$out" && seen=yes || seen=no
check "2. y se nombra aparte" "$seen" "yes"

# 3 — el rojo se nombra y muestra su salida.
out="$(printf '%s\n' "$F/test-red.sh" | bash "$RUNNER" --interpreter bash 2>&1)"; rc=$?
check "3. rojo sale 1" "$rc" "1"
grep -q -- "-- FAIL $F/test-red.sh" <<<"$out" && grep -q red-detail <<<"$out" && seen=yes || seen=no
check "3. nombrado y con su salida" "$seen" "yes"

# 4 — reparte: dos suites de 2 s con anchura 2 caben en 3.5 s.
t0=$(date +%s%N)
printf '%s\n' "$F/test-slow-a.sh" "$F/test-slow-b.sh" \
  | THYROX_SUITE_WIDTH=2 bash "$RUNNER" --interpreter bash >/dev/null 2>&1
ms=$(( ($(date +%s%N) - t0) / 1000000 ))
check "4. reparte (ms < 3500)" "$([[ $ms -lt 3500 ]] && echo yes || echo "no ($ms ms)")" "yes"

# 5 — el verde publica su denominador.
out="$(printf '%s\n' "$F/test-green.sh" "$F/test-slow-a.sh" | bash "$RUNNER" --interpreter bash 2>&1)"; rc=$?
check "5. verde sale 0" "$rc" "0"
grep -qE 'files=2 failed=0 unmeasured=0 timeout=0' <<<"$out" && seen=yes || seen=no
check "5. con denominador" "$seen" "yes"

echo "$total casos: $((total-failures)) ok, $failures fallos"
[[ $failures -eq 0 ]]
