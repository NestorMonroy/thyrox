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
jq -cn --arg r "$ultima|modelo=$modelo|persist=$persist|formato=$formato" '{result:$r}'
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

echo
echo "aserciones: $((total - fallos)) de $total · fallos: $fallos"
exit $((fallos > 0))
