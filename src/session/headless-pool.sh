#!/usr/bin/env bash
# =============================================================================
# headless-pool.sh — la TERCERA forma de despacho: N lecturas con juicio, una
# conversacion `claude -p` por item, repartidas con GNU Parallel
# =============================================================================
#
# Por que existe
# --------------
# `trabajo-en-segundo-plano.md` tenia dos formas: el PROCESO (determinista,
# cero tokens: `bg.sh`, `run-task-pool.sh`) y el SUBAGENTE (una conversacion
# con juicio). Entre las dos faltaba la que el ejecutor pidio en H-THYROX-168:
# N items independientes que SI exigen juicio —leer una nota y extraer sus
# conceptos, clasificar un hallazgo— y que no necesitan ni el contexto del
# orquestador ni su anchura de subagentes. Hasta hoy eso solo existia como un
# guion suelto de banco (`notas-ai-course-aplicables-a-thyrox-*/probes/
# extraer-conceptos.sh`), que corrio bien y que nadie mas podia invocar.
#
# Frente a un subagente, cada `claude -p` de aqui:
#   - no hereda la conversacion del orquestador, solo la plantilla y su item;
#   - no ocupa la anchura del tool `Agent`, que RECHAZA el lanzamiento N+1
#     (`model-selection-subagents.md`);
#   - deja su salida en disco, por item, antes de que nadie la resuma.
#
# Contrato
# --------
#   headless-pool.sh --prompt <plantilla> --out <dir> --model <claude-…>
#                    [--width N] [--timeout S] [--tools LISTA] [--max-turns N]
#                    [--cwd DIR] [--memfree TAM]  < items (uno por linea)
#
# `--memfree` pasa la cota por MEMORIA de GNU Parallel (admision: no lanza un
# item si queda menos que TAM; aplicacion: si baja de la mitad, mata al mas
# joven y lo reencola), la misma que `run-task-pool.sh` porta a mano. La
# anchura acota cuantos corren, no cuanta memoria ocupan; y con el pool
# corriendo junto a un `tsc` completo (2.0 GB) en el arbol de medicion
# (`pool_pipeline.py`), la anchura sola no protege a ninguno de los dos.
#
# El prompt de cada item es la plantilla seguida de `Item: <linea>`. Por item
# escribe `<out>/<n>.json` (la salida `--output-format json`) y `<n>.err`;
# `<out>/index.tsv` empareja numero e item, y `<out>/joblog.tsv` es el de
# GNU Parallel. Publica `-- FALLIDO <item>` por cada fallo y una linea final
# `items=N ok=K fallidos=F`. Sale 0 si todos terminaron bien, 1 si alguno no.
#
# Cada `claude -p` corre con `--no-session-persistence`, `--setting-sources
# project` y sus herramientas acotadas (`--tools`, por defecto `Read`): es una
# lectura, no un agente con permisos de escritura.
#
# Rehusa con exit 2, y SIN la linea de resumen, si falta GNU Parallel, falta
# `claude`, falta la plantilla, no hay items o el modelo es un alias: un
# resumen ahi no distinguiria «no hubo fallos» de «no pude despachar».
#
# El modelo va por IDENTIFICADOR COMPLETO: un alias resuelve distinto segun el
# proveedor, y con el no se sabe que tier ni que ventana se pago.
#
# *Ciega a:* la CALIDAD de lo que cada item devuelve. El veredicto es de
# despacho —termino, fallo, se corto—; que el resultado sirva lo juzga quien lo
# agrega.
set -uo pipefail

PARALLEL_BIN="${HEADLESS_POOL_PARALLEL:-parallel}"
CLAUDE_BIN="${HEADLESS_POOL_CLAUDE:-claude}"
PROMPT=""; OUT=""; MODEL=""
WIDTH="$(nproc 2>/dev/null || echo 4)"
TIMEOUT=600; TOOLS="Read"; MAX_TURNS=12; WORKDIR="$PWD"; MEMFREE_SPEC=""

rehusa() { echo "headless-pool: REHUSA — $*" >&2; exit 2; }

while [[ $# -gt 0 ]]; do
    case "$1" in
        --prompt) PROMPT="${2:-}"; shift 2 ;;
        --out) OUT="${2:-}"; shift 2 ;;
        --model) MODEL="${2:-}"; shift 2 ;;
        --width) WIDTH="${2:-}"; shift 2 ;;
        --timeout) TIMEOUT="${2:-}"; shift 2 ;;
        --tools) TOOLS="${2:-}"; shift 2 ;;
        --max-turns) MAX_TURNS="${2:-}"; shift 2 ;;
        --cwd) WORKDIR="${2:-}"; shift 2 ;;
        --memfree) MEMFREE_SPEC="${2:-}"; shift 2 ;;
        -h|--help) sed -n '2,45p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) rehusa "opcion desconocida: $1" ;;
    esac
done

command -v "$PARALLEL_BIN" >/dev/null 2>&1 \
    || rehusa "falta GNU parallel ($PARALLEL_BIN). Se instala con THYROX_INSTALL_PARALLEL=1 via src/lib/toolchain.sh."
command -v "$CLAUDE_BIN" >/dev/null 2>&1 || rehusa "falta \`claude\` ($CLAUDE_BIN)."
[[ -n "$PROMPT" && -f "$PROMPT" ]] || rehusa "la plantilla de prompt no existe: ${PROMPT:-(sin --prompt)}"
[[ -n "$OUT" ]] || rehusa "falta --out"
case "$MODEL" in
    claude-*) ;;
    *) rehusa "--model va por identificador completo (claude-…), no alias: ${MODEL:-(vacio)}" ;;
esac
[[ -d "$WORKDIR" ]] || rehusa "--cwd no existe: $WORKDIR"

mapfile -t ITEMS < <(gawk 'NF')
[[ ${#ITEMS[@]} -gt 0 ]] || rehusa "no recibio ningun item por stdin."

mkdir -p "$OUT"
: > "$OUT/index.tsv"
for i in "${!ITEMS[@]}"; do
    printf '%d\t%s\n' "$((i + 1))" "${ITEMS[$i]}" >> "$OUT/index.tsv"
done

# Un item por trabajo. El cuerpo va en una funcion exportada para que GNU
# Parallel no tenga que citar el prompt: recibe numero e item como argumentos.
_headless_item() {
    local n="$1" item="$2"
    { cat "$HP_PROMPT"; printf '\nItem: %s\n' "$item"; } \
      | (cd "$HP_WORKDIR" && timeout "$HP_TIMEOUT" "$HP_CLAUDE" -p \
            --model "$HP_MODEL" --setting-sources project \
            --tools "$HP_TOOLS" --allowedTools "$HP_TOOLS" \
            --max-turns "$HP_MAX_TURNS" --no-session-persistence \
            --output-format json) \
      > "$HP_OUT/$n.json" 2> "$HP_OUT/$n.err"
}
export -f _headless_item
export HP_PROMPT="$(cd "$(dirname "$PROMPT")" && pwd)/$(basename "$PROMPT")"
export HP_OUT="$(cd "$OUT" && pwd)" HP_WORKDIR="$WORKDIR" HP_TIMEOUT="$TIMEOUT"
export HP_CLAUDE="$(command -v "$CLAUDE_BIN")" HP_MODEL="$MODEL"
export HP_TOOLS="$TOOLS" HP_MAX_TURNS="$MAX_TURNS"

MEMFREE_ARGS=()
if [[ -n "$MEMFREE_SPEC" ]]; then
    # La cota se valida con el mismo parser que `run-task-pool.sh` y `bg.sh`:
    # una cota ilegible no se deja a la interpretacion de Parallel.
    source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../lib/memory.sh"
    parse_binary_size "$MEMFREE_SPEC" >/dev/null 2>&1 || rehusa "--memfree ilegible: '$MEMFREE_SPEC' (ej. 2G, 512M)"
    MEMFREE_ARGS=(--memfree "$MEMFREE_SPEC")
fi

"$PARALLEL_BIN" -j "$WIDTH" "${MEMFREE_ARGS[@]}" --colsep '\t' --joblog "$OUT/joblog.tsv" \
    _headless_item {1} {2} :::: "$OUT/index.tsv" >/dev/null 2>&1

# El veredicto sale del joblog (columna Exitval), emparejado con el indice por
# numero: no depende del orden en que terminaron.
gawk -F'\t' '
    NR == FNR { item[$1] = $2; next }
    FNR == 1 { next }
    { split($9, a, " "); n = a[2]; total++
      if ($7 == 0) ok++; else { printf "-- FALLIDO %s\n", item[n]; mal++ } }
    END { printf "items=%d ok=%d fallidos=%d\n", total, ok, mal; exit (mal > 0) }
' "$OUT/index.tsv" "$OUT/joblog.tsv"
