#!/usr/bin/env bash
# Suite de parallel_map.sh: repartir un comando sobre N ítems con GNU Parallel
# en primer plano. Lo que el envoltorio añade a un `parallel -j N -k` escrito a
# mano —la anchura derivada de `width_cap`, el orden de salida, la identidad de
# GNU Parallel y la guarda de stdin— es lo que cada caso mide.
set -uo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODULE="${PARALLEL_MAP_MODULE:-$RAIZ/src/session/parallel_map.sh}"
failures=0; total=0
check() {
    total=$((total + 1))
    if [[ "$2" == "$3" ]]; then echo "  ok    $1"; else echo "  FALLA $1: esperado «$3», obtenido «$2»"; failures=$((failures + 1)); fi
}

mkdir -p "$HOME/.cache"
W="$(mktemp -d "$HOME/.cache/thyrox-parallel-map-test.XXXXXX")"
trap 'rm -rf "${W:?}"' EXIT
mkdir -p "$W/fake" "$W/moreutils" "$W/home"
# El doble registra sus argumentos: la anchura y el orden se leen de ahí.
cat > "$W/fake/parallel" <<'FAKE'
#!/usr/bin/env bash
if [[ "${1:-}" == --version ]]; then echo "GNU parallel 20231122"; exit 0; fi
echo "ARGS: $*"
FAKE
cat > "$W/moreutils/parallel" <<'FAKE'
#!/usr/bin/env bash
echo "parallel from moreutils"
FAKE
chmod +x "$W/fake/parallel" "$W/moreutils/parallel"
EXPECTED_WIDTH="$(PYTHONPATH="$RAIZ/src" python3 -c 'from session.parallel import width_cap; print(width_cap())')"

fake() { HOME="$W/home" THYROX_TOOLCHAIN_PARALLEL_BIN="$W/fake/parallel" bash "$MODULE" "$@"; }
real() { HOME="$W/home" bash "$MODULE" "$@"; }
# Un socket como stdin con el otro extremo vivo: la forma de esta herramienta,
# cuyo stdin es un socket del anfitrión. Da EOF sólo si el anfitrión lo cierra,
# y no lo cierra durante el turno: por eso un `parallel` sin fuente giró. El
# envoltorio no clasifica por tipo (medido: un socket con el par cerrado da EOF
# y una tubería con escritor vivo no), así que exige la fuente declarada.
with_socket_stdin() {
    python3 -c 'import socket,subprocess,sys
a, b = socket.socketpair()
try:
    r = subprocess.run(sys.argv[1:], stdin=a, timeout=15, capture_output=True, text=True)
except subprocess.TimeoutExpired:
    print("TIMEOUT"); sys.exit(124)
sys.stdout.write(r.stdout); sys.stderr.write(r.stderr); sys.exit(r.returncode)' "$@"
}

echo "caso 1 — la anchura sale de width_cap y el orden se conserva"
args="$(fake echo {} ::: a b)"
check "pasa -j con width_cap" "$(grep -c -- "-j $EXPECTED_WIDTH " <<<"$args")" "1"
check "pasa -k" "$(grep -c -- " -k " <<<"$args")" "1"

echo "caso 2 — GNU Parallel real conserva el orden; stdin se lee sólo con :::: -"
check "salida en orden" "$(printf '3\n1\n2\n' | real echo {} :::: - | tr '\n' ' ')" "3 1 2 "

echo "caso 3 — --width declarado gana a la derivada"
check "-j 1 declarado" "$(fake --width 1 echo {} ::: a | grep -c -- '-j 1 ')" "1"

echo "caso 4 — una anchura inválida rehúsa con exit 2"
fake --width 0 echo {} ::: a >/dev/null 2>&1; check "--width 0" "$?" "2"
fake --width x echo {} ::: a >/dev/null 2>&1; check "--width no entera" "$?" "2"

echo "caso 5 — sin fuente de ítems declarada, con stdin del anfitrión: rehúsa sin girar"
out="$(with_socket_stdin env HOME="$W/home" THYROX_TOOLCHAIN_PARALLEL_BIN="$W/fake/parallel" bash "$MODULE" echo {} 2>&1)"; code=$?
check "exit 2" "$code" "2"
check "nombra stdin" "$(grep -q 'stdin' <<<"$out" && echo si)" "si"
check "no invoca a parallel" "$(grep -c '^ARGS:' <<<"$out")" "0"

echo "caso 5b — una tubería sin fuente declarada también rehúsa: el criterio no es el tipo"
out="$(printf 'a\n' | fake echo {} 2>&1)"; code=$?
check "exit 2" "$code" "2"
check "no invoca a parallel" "$(grep -c '^ARGS:' <<<"$out")" "0"

echo "caso 6 — con ::: la fuente es explícita y el socket no importa"
out="$(with_socket_stdin env HOME="$W/home" THYROX_TOOLCHAIN_PARALLEL_BIN="$W/fake/parallel" bash "$MODULE" echo {} ::: a 2>&1)"
check "invoca a parallel" "$(grep -c '^ARGS:' <<<"$out")" "1"

echo "caso 7 — sin GNU Parallel y sin opt-in, rehúsa con exit 2"
HOME="$W/home" THYROX_TOOLCHAIN_PARALLEL_BIN="$W/absent/parallel" THYROX_INSTALL_PARALLEL=0 \
    bash "$MODULE" echo {} ::: a >/dev/null 2>&1
check "exit 2" "$?" "2"

echo "caso 8 — un parallel que no es GNU rehúsa con exit 2"
HOME="$W/home" THYROX_TOOLCHAIN_PARALLEL_BIN="$W/moreutils/parallel" bash "$MODULE" echo {} ::: a >/dev/null 2>&1
check "exit 2" "$?" "2"

echo "caso 9 — el código de salida es el de GNU Parallel: cuántos ítems fallaron"
# GNU Parallel une los argumentos en UNA cadena de shell: `sh -c 'exit {}'`
# se ejecutaría como `sh -c exit 1` y saldría 0. El comando va entero.
real 'exit {}' ::: 0 1 1 >/dev/null 2>&1
check "dos fallos" "$?" "2"

echo "caso 10 — con GNU Time cada ítem se mide y la ejecución deja una fila"
export THYROX_PARALLEL_MAP_HISTORY_DIR="$W/history" THYROX_RAM_ADMISSION_LEDGER="$W/ram.json"
out="$(real 'echo {} >/dev/null' ::: a b c 2>&1 >/dev/null)"
check "sin ejecución previa lo dice" "$(grep -q 'sin ejecución previa' <<<"$out" && echo si)" "si"
rows="$(cat "$W"/history/command-*/runs.jsonl 2>/dev/null | wc -l)"
check "una fila en el historial del comando" "$rows" "1"
check "con los tres ítems medidos" "$(grep -c '"items_measured": 3' "$W"/history/command-*/runs.jsonl 2>/dev/null)" "1"

echo "caso 11 — la siguiente ejecución reserva antes de correr cada ítem y suelta al terminar"
# El ítem lee el registro mientras corre: su reserva tiene que estar viva.
real "cat $W/ram.json > $W/seen.{}" ::: x >/dev/null 2>&1
real "cat $W/ram.json > $W/seen.{}" ::: y >/dev/null 2>&1
check "el ítem ve una reserva viva" "$(grep -c '[0-9]' "$W/seen.y" 2>/dev/null)" "1"
check "al terminar no queda reserva viva" "$(PYTHONPATH="$RAIZ/src" python3 -c "
from session.resource_admission import ReservationLedger
print(len(ReservationLedger('$W/ram.json').live()))")" "0"

echo "caso 12 — nunca pasa --memfree: medir no es reservar"
check "sin --memfree" "$(fake 'echo {} >/dev/null' ::: a b c | grep -c -- '--memfree')" "0"

echo "caso 13 — sin sitio en RAM y con plazo 0, el ítem no corre y lo dice"
real 'echo {} >/dev/null' ::: a b c >/dev/null 2>&1
printf 'MemTotal: 1000 kB\nMemAvailable: 0 kB\n' > "$W/meminfo-empty"
out="$(THYROX_RAM_ADMISSION_MEMINFO="$W/meminfo-empty" THYROX_PARALLEL_MAP_ADMISSION_TIMEOUT=0 \
       real 'echo {} >/dev/null' ::: a b c 2>&1)"; code=$?
check "los tres fallan" "$code" "3"
check "nombra la admisión" "$(grep -q 'admisi' <<<"$out" && echo si)" "si"

echo "caso 13b — sin tope de RAM medible, la reserva por ítem se lee igual: un campo vacío no corre los demás"
out="$(THYROX_RAM_ADMISSION_MEMINFO="$W/absent-meminfo" THYROX_PARALLEL_MAP_ADMISSION_TIMEOUT=0 \
       real 'echo {} >/dev/null' ::: a 2>&1 >/dev/null)"
check "anuncia la reserva en kB" "$(grep -cE 'reserva [0-9]+ kB por ítem' <<<"$out")" "1"

echo "caso 14 — sin GNU Time corre igual, lo dice y no graba historial"
out="$(THYROX_TOOLCHAIN_TIME_BIN="$W/absent/time" THYROX_PARALLEL_MAP_HISTORY_DIR="$W/history-none" \
       real 'echo {}' ::: a 2>&1)"
check "el ítem corre" "$(grep -c '^a$' <<<"$out")" "1"
check "dice que no mide" "$(grep -q 'sin GNU Time' <<<"$out" && echo si)" "si"
check "sin historial" "$(test -e "$W/history-none" && echo si || echo no)" "no"
unset THYROX_PARALLEL_MAP_HISTORY_DIR THYROX_RAM_ADMISSION_LEDGER

echo "parallel_map: $((total - failures))/$total"
[[ $failures -eq 0 ]]
