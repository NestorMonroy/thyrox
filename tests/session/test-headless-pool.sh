#!/usr/bin/env bash
# Suite de src/session/headless-pool.sh — la tercera forma de despacho: N
# lecturas con juicio, una conversacion `claude -p` por item, repartidas con
# GNU Parallel. No es un subagente (no hereda el piso del orquestador ni ocupa
# su anchura) y no es un proceso determinista (cada item exige un modelo).
#
# El `claude` real no se invoca: HEADLESS_POOL_CLAUDE apunta a un falso que
# devuelve en `result` el ultimo renglon de su stdin y las banderas que vio.
# Lo que se mide es el mecanismo —reparto, salida por item, veredicto,
# rechazos—, no al modelo.
set -uo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
POOL="$RAIZ/src/session/headless-pool.sh"
fallos=0; total=0
check() { total=$((total+1)); if [[ "$2" == "$3" ]]; then echo "OK   $1"; else echo "FALLA $1 — esperado '$3', obtenido '$2'"; fallos=$((fallos+1)); fi; }

F="$(mktemp -d)"; trap 'rm -rf "$F"' EXIT
cat > "$F/claude" <<'SH'
#!/usr/bin/env bash
entrada="$(cat)"
modelo=""; persist=si; formato=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --model) modelo="$2"; shift 2 ;;
    --no-session-persistence) persist=no; shift ;;
    --output-format) formato="$2"; shift 2 ;;
    *) shift ;;
  esac
done
case "$entrada" in *FALLA*) echo "fallo simulado" >&2; exit 1 ;; esac
case "$entrada" in *LENTO*) sleep 5 ;; esac
ultima="$(printf '%s\n' "$entrada" | tail -1)"
jq -cn --arg r "$ultima|modelo=$modelo|persist=$persist|formato=$formato|ttl=${CLAUDE_CODE_PROMPT_CACHE_TTL:-sin}" '{result:$r}'
SH
chmod +x "$F/claude"
printf 'Lee y resume.\n' > "$F/prompt.md"
export HEADLESS_POOL_CLAUDE="$F/claude"

corre() { SALIDA="$(printf '%s\n' "$@" | bash "$POOL" --prompt "$F/prompt.md" --out "$F/out" --model claude-sonnet-5 --width 2 ${EXTRA:-} 2>&1)"; CODE=$?; }

# 1 — tres items: exit 0, una salida por item, y el item llega en el prompt.
rm -rf "$F/out"; corre alfa beta gamma
check "tres items: exit 0" "$CODE" "0"
check "tres items: resumen" "$(printf '%s' "$SALIDA" | gawk '/^items=/{print}')" "items=3 ok=3 fallidos=0"
check "una salida json por item" "$(ls "$F/out"/*.json 2>/dev/null | wc -l)" "3"
check "el item llega al final del prompt" "$(cat "$F/out"/*.json | jq -r .result | cut -d'|' -f1 | sort | paste -sd,)" "Item: alfa,Item: beta,Item: gamma"
check "sin sesion persistida y en json" "$(cat "$F/out"/*.json | jq -r .result | cut -d'|' -f3,4 | sort -u)" "persist=no|formato=json"
check "el indice empareja numero e item" "$(gawk -F'\t' '{print $2}' "$F/out/index.tsv" | paste -sd,)" "alfa,beta,gamma"

# 2 — un item que falla: exit 1 y se nombra, los demas siguen contando.
rm -rf "$F/out"; corre alfa FALLA-beta gamma
check "un fallo: exit 1" "$CODE" "1"
check "un fallo: lo nombra" "$(printf '%s' "$SALIDA" | gawk '/^-- FALLIDO FALLA-beta$/{n++} END{print n+0}')" "1"
check "un fallo: resumen" "$(printf '%s' "$SALIDA" | gawk '/^items=/{print}')" "items=3 ok=2 fallidos=1"

# 3 — la cota de tiempo corta al item lento y lo cuenta como fallido.
rm -rf "$F/out"; EXTRA="--timeout 1" corre LENTO-uno dos
check "timeout: exit 1" "$CODE" "1"
check "timeout: nombra al lento" "$(printf '%s' "$SALIDA" | gawk '/^-- FALLIDO LENTO-uno/{n++} END{print n+0}')" "1"

# 4 — un alias no es un modelo: rehusa sin cifra (model-selection-subagents.md).
rm -rf "$F/out"; SALIDA="$(printf 'alfa\n' | bash "$POOL" --prompt "$F/prompt.md" --out "$F/out" --model sonnet 2>&1)"; CODE=$?
check "alias: exit 2" "$CODE" "2"
check "alias: sin resumen" "$(printf '%s' "$SALIDA" | gawk '/^items=/{n++} END{print n+0}')" "0"

# 5 — sin items no hay verde.
SALIDA="$(printf '' | bash "$POOL" --prompt "$F/prompt.md" --out "$F/out" --model claude-sonnet-5 2>&1)"; CODE=$?
check "sin items: exit 2" "$CODE" "2"

# 6 — sin GNU parallel, sin claude o sin plantilla: rehusa nombrando la falta.
SALIDA="$(printf 'alfa\n' | HEADLESS_POOL_PARALLEL=/no/existe/parallel bash "$POOL" --prompt "$F/prompt.md" --out "$F/out" --model claude-sonnet-5 2>&1)"; CODE=$?
check "sin parallel: exit 2" "$CODE" "2"
check "sin parallel: lo nombra" "$(printf '%s' "$SALIDA" | gawk '/parallel/{n++} END{print (n>0)}')" "1"
SALIDA="$(printf 'alfa\n' | HEADLESS_POOL_CLAUDE=/no/existe/claude bash "$POOL" --prompt "$F/prompt.md" --out "$F/out" --model claude-sonnet-5 2>&1)"; CODE=$?
check "sin claude: exit 2" "$CODE" "2"
SALIDA="$(printf 'alfa\n' | bash "$POOL" --prompt "$F/no-existe.md" --out "$F/out" --model claude-sonnet-5 2>&1)"; CODE=$?
check "sin plantilla: exit 2" "$CODE" "2"

# --memfree: la cota llega a GNU Parallel, y una ilegible rehusa sin resumen.
cat > "$F/parallel" <<'SH'
#!/usr/bin/env bash
printf '%s\n' "$*" > "$(dirname "$0")/parallel.args"
exec parallel "$@"
SH
chmod +x "$F/parallel"
rm -rf "$F/out"; EXTRA="--memfree 1G" HEADLESS_POOL_PARALLEL="$F/parallel" corre alfa
check "memfree: exit 0" "$CODE" "0"
check "memfree: la cota llega a parallel" "$(grep -c -- '--memfree 1G' "$F/parallel.args")" "1"
rm -rf "$F/out"; EXTRA="--memfree mucho" corre alfa
check "memfree ilegible: exit 2" "$CODE" "2"
check "memfree ilegible: sin resumen" "$(printf '%s' "$SALIDA" | gawk '/^items=/{n++} END{print n+0}')" "0"

# --cache-ttl: el TTL de la caché llega a cada `claude -p` por
# CLAUDE_CODE_PROMPT_CACHE_TTL; sin la opción no se fija (decide el cliente),
# y un valor fuera de 5m|1h rehúsa sin resumen.
ttl_de() { cat "$F/out"/*.json | jq -r .result | gawk -F"|" '{print $5}' | sort -u | paste -sd,; }
rm -rf "$F/out"; EXTRA="--cache-ttl 5m" corre alfa beta
check "cache-ttl 5m: exit 0" "$CODE" "0"
check "cache-ttl 5m: llega a cada item" "$(ttl_de)" "ttl=5m"
rm -rf "$F/out"; EXTRA="" CLAUDE_CODE_PROMPT_CACHE_TTL= corre alfa
check "sin cache-ttl: no se fija" "$(ttl_de)" "ttl=sin"
rm -rf "$F/out"; EXTRA="--cache-ttl 2h" corre alfa
check "cache-ttl ilegible: exit 2" "$CODE" "2"
check "cache-ttl ilegible: sin resumen" "$(printf '%s' "$SALIDA" | gawk '/^items=/{n++} END{print n+0}')" "0"

# --- la memoria de cada item, con GNU Time --------------------------------------
# Un GNU time falso: consume `-f FMT -o ARCHIVO`, escribe una medida fija y
# corre el comando conservando su codigo, como el real.
cat > "$F/gnu-time" <<'SH'
#!/usr/bin/env bash
[[ "${1:-}" == --version ]] && { echo "time (GNU Time) UNKNOWN"; exit 0; }
out=""
while [[ "${1:-}" == -* ]]; do
  case "$1" in -o) out="$2"; shift 2 ;; -f) shift 2 ;; *) shift ;; esac
done
"$@"; rc=$?
printf "%s\n" "12345 1.50 0.40 0.10" > "$out"
exit $rc
SH
chmod +x "$F/gnu-time"
rm -rf "$F/out"; EXTRA="" HEADLESS_POOL_TIME="$F/gnu-time" corre alfa FALLA-beta
check "con GNU time: un .time por item" "$(ls "$F/out"/*.time 2>/dev/null | wc -l)" "2"
check "con GNU time: memoria pico, pared, usuario y sistema" "$(cat "$F/out/1.time")" "12345 1.50 0.40 0.10"
check "con GNU time: el fallo del item sigue siendo fallo" "$(printf '%s' "$SALIDA" | gawk '/^items=/{print}')" "items=2 ok=1 fallidos=1"
rm -rf "$F/out"; EXTRA="" HEADLESS_POOL_TIME="$F/no-existe" corre alfa
check "sin GNU time: ningun .time" "$(ls "$F/out"/*.time 2>/dev/null | wc -l)" "0"
check "sin GNU time: lo declara en vez de callar" "$(printf '%s' "$SALIDA" | gawk '/sin GNU time/{n++} END{print n+0}')" "1"

echo
echo "aserciones: $((total - fallos)) de $total · fallos: $fallos"
exit $((fallos > 0))
