#!/usr/bin/env bash
# Suite de `run-task-pool.sh --memfree`: la cota por MEMORIA, portada de
# `--memfree` de GNU Parallel 20231122 (`/usr/bin/parallel`, lineas 4113-4118
# y 6972-7005).
#
# Mide las dos mitades de la referencia, porque cada una atrapa un defecto que
# la otra no ve:
#
#   admision   — no se lanza un trabajo si la memoria disponible esta por
#                debajo de la cota. Mide la memoria AL ADMITIR.
#   aplicacion — si la memoria cae por debajo de la MITAD de la cota con
#                trabajos ya corriendo, se mata al mas joven y se reencola.
#                Existe porque la admision es ciega al crecimiento posterior:
#                un `tsc` arranca cerca de cero y llega a 2 GB despues.
#
# La memoria no se consume de verdad: `THYROX_POOL_MEMINFO_PATH` apunta a un
# `/proc/meminfo` sintetico que la suite reescribe. Asi el control no depende
# de la carga de la maquina que lo corre.
set -uo pipefail

_thyrox_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
while [[ "$_thyrox_root" != "/" && ! -f "$_thyrox_root/src/paths/reach.py" ]]; do
    _thyrox_root="$(dirname "$_thyrox_root")"
done
# Por el envoltorio: exporta `PYTHONPATH`, que una invocacion por ruta al
# fuente no hace (`trabajo-en-segundo-plano.md`).
POOL="$_thyrox_root/bin/run-task-pool"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
export THYROX_JOBS_DIR="$T/ledger"
PASSED=0; FAILED=0

assert_eq() { # assert_eq <descripcion> <esperado> <obtenido>
    if [ "$2" = "$3" ]; then PASSED=$((PASSED+1)); printf '  ok   %s\n' "$1"
    else FAILED=$((FAILED+1)); printf '  FALLA %s — esperado «%s», obtenido «%s»\n' "$1" "$2" "$3"; fi
}

write_meminfo() { # write_meminfo <ruta> <kB disponibles>
    printf 'MemTotal:       16000000 kB\nMemFree:          100000 kB\nMemAvailable:   %s kB\n' "$2" > "$1.tmp"
    mv "$1.tmp" "$1"
}

peak_concurrency() { # peak_concurrency <archivo de eventos> -> maximo simultaneo
    sort -k2,2n "$1" | awk '$1=="start"{n++; if(n>m)m=n} $1=="end"{n--} END{print m+0}'
}

# Tres trabajos de un segundo que registran su inicio y su fin.
timed_commands() { # timed_commands <eventos> -> tres lineas de comando
    for i in 1 2 3; do
        printf 'job%s\techo start $(date +%%s%%N) >> %s; sleep 1; echo end $(date +%%s%%N) >> %s\n' "$i" "$1" "$1"
    done
}

echo "test-run-task-pool-memfree:"

# 1. Una cota ilegible rehusa ANTES de lanzar: exit 4 y cero logs.
printf 'true\n' > "$T/one.txt"
BG_DIR="$T/bad" bash "$POOL" --memfree abc "$T/one.txt" >/dev/null 2>&1
assert_eq "--memfree ilegible sale 4" 4 $?
assert_eq "y no lanzo ningun trabajo" 0 "$(ls "$T"/bad/*/*.log 2>/dev/null | wc -l)"

# 1-bis. La sonda usa el awk DECLARADO (`THYROX_TOOLCHAIN_AWK_BIN`), el mismo
#    que `thyrox_toolchain_require_gawk` protege, y no el `awk` del PATH: en
#    Debian ese nombre suele resolver a mawk. Con el nombre declarado apuntando
#    a un binario inexistente, la memoria no se puede medir y la cota rehusa.
#    Si la sonda usara el `awk` del PATH, mediria igual y saldria 0.
write_meminfo "$T/declared.meminfo" 8000000
THYROX_TOOLCHAIN_AWK_BIN="$T/no-such-awk" THYROX_POOL_MEMINFO_PATH="$T/declared.meminfo" \
    BG_DIR="$T/declared" bash "$POOL" --memfree 1G "$T/one.txt" >/dev/null 2>&1
assert_eq "la sonda usa el awk declarado" 4 $?

# 1-ter. La declaracion tambien llega desde el `.env`, no solo del proceso: un
#    clon declara su awk una vez en su `.env` y no en cada invocacion. Aqui la
#    variable NO se exporta; solo la nombra el `.env` que `THYROX_ENV_FILE`
#    apunta. Si el pool leyera solo el entorno del proceso, mediria con el
#    `awk` del PATH y saldria 0.
printf 'THYROX_TOOLCHAIN_AWK_BIN=%s\n' "$T/no-such-awk" > "$T/declared.env"
env -u THYROX_TOOLCHAIN_AWK_BIN THYROX_ENV_FILE="$T/declared.env" \
    THYROX_POOL_MEMINFO_PATH="$T/declared.meminfo" \
    BG_DIR="$T/declared-env" bash "$POOL" --memfree 1G "$T/one.txt" >/dev/null 2>&1
assert_eq "la sonda usa el awk que declara el .env" 4 $?

# 2. ADMISION con memoria escasa: 100 MB disponibles contra 1 GiB de cota.
#    Con anchura 3 los tres irian a la vez; la cota los pone en serie. El
#    primero entra aunque no haya memoria porque no hay nadie corriendo: sin
#    esa excepcion un trabajo mayor que la cota bloquearia el pool para siempre.
write_meminfo "$T/low.meminfo" 100000
timed_commands "$T/low.events" > "$T/low.txt"
THYROX_POOL_MEMINFO_PATH="$T/low.meminfo" BG_DIR="$T/low" \
    bash "$POOL" --width 3 --memfree 1G "$T/low.txt" >/dev/null 2>&1
assert_eq "con memoria escasa el pool termina" 0 $?
assert_eq "con memoria escasa corre uno a la vez" 1 "$(peak_concurrency "$T/low.events")"

# 3. CONTROL del caso 2: la misma carga con memoria de sobra. Si el caso 2
#    diera 1 tambien aqui, no mediria la cota sino otra cosa.
write_meminfo "$T/high.meminfo" 8000000
timed_commands "$T/high.events" > "$T/high.txt"
THYROX_POOL_MEMINFO_PATH="$T/high.meminfo" BG_DIR="$T/high" \
    bash "$POOL" --width 3 --memfree 1G "$T/high.txt" >/dev/null 2>&1
assert_eq "con memoria de sobra corren los tres a la vez" 3 "$(peak_concurrency "$T/high.events")"

# 4. APLICACION: la memoria cae por debajo de la mitad de la cota con los tres
#    corriendo. Se mata al mas joven, se reencola y termina igual; el mas viejo
#    no se toca, porque matar al ultimo vivo no libera nada que el siguiente
#    pueda usar.
write_meminfo "$T/drop.meminfo" 8000000
for i in 1 2 3; do
    printf 'job%s\techo x >> %s/attempts-%s; sleep 3; echo x >> %s/done-%s\n' \
        "$i" "$T" "$i" "$T" "$i"
done > "$T/drop.txt"
( sleep 1; write_meminfo "$T/drop.meminfo" 200000
  sleep 2; write_meminfo "$T/drop.meminfo" 8000000 ) &
DRIVER=$!
OUT="$(THYROX_POOL_MEMINFO_PATH="$T/drop.meminfo" BG_DIR="$T/drop" \
    bash "$POOL" --width 3 --memfree 1G "$T/drop.txt" 2>&1)"
POOL_EXIT=$?
wait "$DRIVER"
assert_eq "tras la caida el pool termina en verde" 0 "$POOL_EXIT"
assert_eq "cada trabajo termina exactamente una vez" "1 1 1" \
    "$(for i in 1 2 3; do wc -l < "$T/done-$i" 2>/dev/null || echo 0; done | xargs)"
assert_eq "el mas viejo no se reencola" 1 "$(wc -l < "$T/attempts-1")"
assert_eq "al menos un trabajo se reencolo" si \
    "$([ "$(cat "$T"/attempts-* | wc -l)" -gt 3 ] && echo si || echo no)"
assert_eq "el reencolado se anuncia" si \
    "$(printf '%s' "$OUT" | grep -q 'reencolado' && echo si || echo no)"

echo "test-run-task-pool-memfree: $((PASSED+FAILED)) aserciones — $PASSED ok, $FAILED falla(s)"
[ "$FAILED" -eq 0 ]
