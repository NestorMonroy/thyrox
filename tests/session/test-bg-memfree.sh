#!/usr/bin/env bash
# Suite de `bg.sh start --memfree`: la cota por MEMORIA ENTRE lanzamientos
# independientes.
#
# `run-task-pool.sh --memfree` ya porta las dos mitades de GNU Parallel, pero
# sólo entre los trabajos de UN pool. El episodio que obliga a esta suite: el
# lazo tsc cero y un censo del programa completo, lanzados con dos `bg.sh
# start`, agotaron una máquina de 16 GB sin swap y el kernel mató con SIGKILL
# a los proponentes del lazo. Ninguno de los dos lanzamientos sabía del otro.
#
#   admision   — con otro trabajo `--memfree` vivo, no se lanza mientras la
#                memoria disponible esté bajo la cota; se espera, y al vencer
#                la espera se rehúsa sin lanzar.
#   aplicacion — si cae bajo la MITAD de la cota con dos o más vivos, se mata
#                al más joven; nunca al último.
#
# La memoria no se consume: `THYROX_POOL_MEMINFO_PATH` apunta a un meminfo
# sintético que la suite reescribe, igual que la suite del pool.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BG="$ROOT/bin/thyrox-bg"
T="$(mktemp -d)"
cleanup() { pkill -f "[m]emfree-probe-$$" 2>/dev/null; rm -rf "$T"; }
trap cleanup EXIT
export THYROX_POOL_MEMINFO_PATH="$T/meminfo" THYROX_BG_MEMFREE_DIR="$T/memfree"
export THYROX_BG_MEMFREE_POLL=0.2
# Los runs de la familia `jobs` van al temporal, no al árbol.
export THYROX_JOBS_DIR="$T/jobs"
mem() { printf 'MemTotal: 16000000 kB\nMemAvailable: %s kB\n' "$1" > "$T/meminfo"; }
passed=0; failed=0
check() {
    if [[ "$2" == "$3" ]]; then passed=$((passed+1)); echo "  ok    $1"
    else failed=$((failed+1)); echo "  FALLA $1 — esperado $2, obtenido $3"; fi
}
alive() { kill -0 "$1" 2>/dev/null && echo vivo || echo muerto; }
pid_of() { grep '^PID=' <<<"$1" | cut -d= -f2; }
echo "test-bg-memfree:"

# 1. Sin otro trabajo --memfree vivo se admite aunque falte memoria: si no, un
#    trabajo mayor que la cota no arrancaría nunca.
mem 100000
OUT="$(bash "$BG" start first --dir "$T/logs" --grace 0 --memfree 1G -- bash -c "sleep 30" memfree-probe-$$)"
P1="$(pid_of "$OUT")"
check "el único trabajo se admite aunque falte memoria" vivo "$(alive "$P1")"

# 2. Con uno vivo y la memoria bajo la cota, el segundo espera y, al vencer la
#    espera, rehúsa sin lanzar.
OUT="$(bash "$BG" start second --dir "$T/logs" --grace 0 --memfree 1G --memfree-wait 1 -- bash -c "sleep 30" memfree-probe-$$ 2>&1)"
RC=$?
check "sin memoria, el segundo rehúsa al vencer la espera" 3 "$RC"
check "y no lanza nada" "" "$(pid_of "$OUT")"

# 3. Si la memoria sube durante la espera, se admite.
( sleep 0.6; mem 8000000 ) &
OUT="$(bash "$BG" start third --dir "$T/logs" --grace 0 --memfree 1G --memfree-wait 10 -- bash -c "sleep 30" memfree-probe-$$)"
P3="$(pid_of "$OUT")"
check "con memoria liberada durante la espera, se admite" vivo "$(alive "$P3")"

# 4. Bajo la mitad de la cota con dos vivos: muere el más joven, no el mayor.
mem 100000
for _ in $(seq 1 40); do [[ "$(alive "$P3")" == muerto ]] && break; sleep 0.2; done
check "bajo la mitad de la cota se mata al más joven" muerto "$(alive "$P3")"
check "y el mayor sigue vivo" vivo "$(alive "$P1")"
check "la muerte se declara en su log" 1 "$(grep -c 'memfree' "$T/logs/third.log")"

# 5. Nunca al último: con uno solo vivo, sobrevive aunque falte memoria.
sleep 1
check "el último trabajo vivo no se mata" vivo "$(alive "$P1")"

echo "test-bg-memfree: $((passed+failed)) aserciones — $passed ok, $failed falla(s)"
exit $((failed > 0))
