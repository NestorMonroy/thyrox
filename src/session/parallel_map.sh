#!/usr/bin/env bash
# Reparte un comando sobre N ítems con GNU Parallel, en primer plano.
#
# Es la forma que `detect_parallel_opportunity` sugiere para un `for` o un
# `while read` con iteraciones independientes. Escrita a mano, `parallel -j N
# -k` deja tres decisiones a quien la teclea, y las tres ya salieron mal:
#
# - la anchura: se elegía de memoria (-j5, -j7 en una máquina cuyo tope medido
#   es 2). Aquí sale de `session.parallel.width_cap`, la fórmula del
#   ejecutable; `--width N` la declara explícitamente;
# - la identidad: `moreutils` instala otro `parallel` sin `--jobs`. Se resuelve
#   con `thyrox_toolchain_require_parallel`, que lo rechaza;
# - la fuente de ítems: sin `:::`, `::::` ni `-a`, GNU Parallel lee stdin.
#   Bajo el anfitrión, stdin es un socket cuyo otro extremo sigue vivo todo el
#   turno, y la lectura no termina. El tipo de stdin no predice el EOF (medido:
#   un socket con el par cerrado da EOF al instante, una tubería con escritor
#   vivo no lo da nunca), así que no se clasifica: la fuente se declara
#   siempre, y `:::: -` es la forma de leer stdin a propósito.
#
# El orden de la salida es el de la entrada (`-k`). El código de salida es el
# de GNU Parallel: el número de ítems que fallaron.
#
# Uso:
#   parallel_map [--width N] <comando con {}> (::: ítems | :::: archivo | :::: -)
#
# Sale 2, sin lanzar nada, si falta GNU Parallel, si la anchura no es un
# entero positivo o si no se declaró la fuente de ítems.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"

refuse() { echo "parallel_map: REHUSA — $*" >&2; exit 2; }

width=""
if [[ "${1:-}" == --width ]]; then
    [[ $# -ge 2 ]] || refuse "--width requiere un valor."
    width="$2"; shift 2
    [[ "$width" =~ ^[1-9][0-9]*$ ]] || refuse "--width debe ser un entero positivo, no «$width»."
fi
[[ $# -gt 0 ]] || refuse "falta el comando."

declares_input_source() {
    local arg
    for arg in "$@"; do
        case "$arg" in
            :::|::::|:::+|::::+|-a|--arg-file|--arg-file=*) return 0 ;;
        esac
    done
    return 1
}
declares_input_source "$@" || refuse "no se declaró la fuente de ítems (::: ítems, :::: archivo o :::: - para stdin).
  Sin ella GNU Parallel lee stdin implícito; el de esta herramienta es un socket
  del anfitrión que no se cierra durante el turno, y la lectura no termina."

parallel_bin="$(source "$ROOT/src/lib/toolchain.sh"
                thyrox_toolchain_require_parallel >/dev/null 2>&1 \
                    && printf '%s' "${THYROX_TOOLCHAIN_PARALLEL_BIN:-parallel}")" || true
[[ -n "$parallel_bin" ]] || refuse "falta GNU Parallel (${THYROX_TOOLCHAIN_PARALLEL_BIN:-parallel}); se instala con
  THYROX_INSTALL_PARALLEL=1 via src/lib/toolchain.sh::thyrox_toolchain_require_parallel."
parallel_home="$(source "$ROOT/src/lib/toolchain.sh"; thyrox_toolchain_parallel_home)"

if [[ -z "$width" ]]; then
    width="$(PYTHONPATH="$ROOT/src" python3 -c 'from session.parallel import width_cap; print(width_cap())')" \
        || refuse "no se pudo derivar la anchura de session.parallel.width_cap."
fi

time_bin="$(source "$ROOT/src/lib/toolchain.sh"
            thyrox_toolchain_require_gnu_time >/dev/null 2>&1 && thyrox_toolchain_gnu_time_bin)" || time_bin=""
if [[ -z "$time_bin" ]]; then
    echo "parallel_map: sin GNU Time, no se mide la memoria de los ítems ni se reserva" \
         "(thyrox_toolchain_require_gnu_time)" >&2
    PARALLEL_HOME="$parallel_home" exec "$parallel_bin" -j "$width" -k "$@"
fi

# El texto del comando —lo que precede a la fuente de ítems— indexa su
# historial: el mismo comando con otros ítems comparte medida.
command_words=()
for arg in "$@"; do
    case "$arg" in :::|::::|:::+|::::+|-a|--arg-file|--arg-file=*) break ;; esac
    command_words+=("$arg")
done
export PYTHONPATH="$ROOT/src${PYTHONPATH:+:$PYTHONPATH}"
history="$(python3 -m session.parallel_map_history dir "${command_words[*]}")" \
    || refuse "no se pudo resolver el historial del comando (THYROX_PARALLEL_MAP_HISTORY_DIR)."
# El tabulador es espacio en blanco para `read`: colapsaría los campos vacíos
# y correría los siguientes. El separador de unidad no lo es.
derived="$(python3 -m session.parallel_map_history derive "$history")"
IFS=$'\x1f' read -r _memfree _ram_cap need_kb why <<<"${derived//$'\t'/$'\x1f'}"
if [[ -n "$need_kb" ]]; then
    echo "parallel_map: memoria: reserva $need_kb kB por ítem ($why)" >&2
else
    echo "parallel_map: memoria: $why; no se reserva" >&2
fi

mkdir -p "$history"
run_dir="$(mktemp -d "$history/run.XXXXXX")"
trap 'rm -rf "$run_dir"' EXIT
# GNU Parallel ejecuta cada ítem como `$PARALLEL_SHELL -c "<comando>"` y exporta
# PARALLEL_SEQ: el ítem se mide y se admite sin reescribir su comando, que es
# una sola cadena de shell y no admite argumentos antepuestos.
cat > "$run_dir/item-shell" <<'SHELL'
#!/usr/bin/env bash
if [[ -n "$PARALLEL_MAP_NEED_KB" ]]; then
    if ! python3 -m session.resource_admission admit-ram "$PARALLEL_MAP_NEED_KB" --owner $$ \
            --timeout "${THYROX_PARALLEL_MAP_ADMISSION_TIMEOUT:-600}"; then
        echo "parallel_map: el ítem $PARALLEL_SEQ no obtuvo admisión de RAM" \
             "($PARALLEL_MAP_NEED_KB kB) en el plazo; no se ejecuta" >&2
        exit 75
    fi
fi
"$PARALLEL_MAP_TIME" -f '%M %e %U %S' -o "$PARALLEL_MAP_RUN/$PARALLEL_SEQ.time" bash "$@"
code=$?
# Muerto el dueño, su reserva caduca sola; soltarla aquí además cierra la
# reutilización del pid, que la suite no reproduce (anularla no tumba nada).
[[ -z "$PARALLEL_MAP_NEED_KB" ]] || python3 -m session.resource_admission release --owner $$
exit "$code"
SHELL
chmod +x "$run_dir/item-shell"

PARALLEL_MAP_NEED_KB="$need_kb" PARALLEL_MAP_TIME="$time_bin" PARALLEL_MAP_RUN="$run_dir" \
PARALLEL_SHELL="$run_dir/item-shell" PARALLEL_HOME="$parallel_home" \
    "$parallel_bin" -j "$width" -k "$@"
code=$?
python3 -m session.parallel_map_history record "$history" "$run_dir" \
    || echo "parallel_map: no se pudo grabar la medida de esta ejecución" >&2
exit "$code"
