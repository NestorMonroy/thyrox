#!/usr/bin/env bash
# Suite de src/session/headless-pool.sh — la tercera forma de despacho: N
# lecturas con juicio, una conversacion `thyrox -p` por item, repartidas con
# GNU Parallel. No es un subagente (no hereda el piso del orquestador ni ocupa
# su anchura) y no es un proceso determinista (cada item exige un modelo).
#
# El `claude` real no se invoca: HEADLESS_POOL_RUNNER apunta a un falso que
# devuelve en `result` el ultimo renglon de su stdin y las banderas que vio.
# Lo que se mide es el mecanismo —reparto, salida por item, veredicto,
# rechazos—, no al modelo.
set -uo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
POOL="$RAIZ/src/session/headless-pool.sh"
fallos=0; total=0
check() { total=$((total+1)); if [[ "$2" == "$3" ]]; then echo "OK   $1"; else echo "FALLA $1 — esperado '$3', obtenido '$2'"; fallos=$((fallos+1)); fi; }
# Cuenta las reservas del registro de VRAM distinguiendo tres estados: desde
# `ReservationLedger.release` (src/session/resource_admission.py), sin ninguna
# reserva viva el archivo se RETIRA — "en reposo no deja archivo en el árbol",
# así que ausente y "length 0" son el mismo estado y no dos. Un JSON roto no
# cuenta como vacío: se distingue con una cadena no numérica.
ledger_reservation_count() {
  local ledger="$1" n
  [[ -e "$ledger" ]] || { echo 0; return; }
  n="$(jq -r 'length' "$ledger" 2>/dev/null)"
  [[ "$n" =~ ^[0-9]+$ ]] && echo "$n" || echo ilegible
}

F="$(mktemp -d)"; trap 'rm -rf "$F"' EXIT
# El pool de prueba abre su runtime aquí, no en el runtime real del árbol.
export THYROX_RUNTIME_DIR="$F/runtime"
cat > "$F/claude" <<'SH'
#!/usr/bin/env bash
entrada="$(cat)"
modelo=""; persist=si; formato=""; verbose=no; sid=sin; turns=sin
while [[ $# -gt 0 ]]; do
  case "$1" in
    --model) modelo="$2"; shift 2 ;;
    --no-session-persistence) persist=no; shift ;;
    --output-format) formato="$2"; shift 2 ;;
    --verbose) verbose=si; shift ;;
    --session-id) sid="$2"; shift 2 ;;
    --max-turns) turns="$2"; shift 2 ;;
    *) shift ;;
  esac
done
case "$entrada" in *FALLA*) echo "fallo simulado" >&2; exit 1 ;; esac
case "$entrada" in *LENTO*) sleep 5 ;; esac
# RAMPA: como CUDA, asigna TARDE —3 s después de arrancar— y sostiene 1 s. Es
# la ventana en que otro ítem, que sólo mirara lo libre, lo vería entero.
case "$entrada" in *RAMPA*)
  echo "start $(date +%s.%N)" >> "$RAMPA_LOG"; sleep 3
  echo 400 > "$GPU_STATE/used/$$"; sleep 1
  echo "end $(date +%s.%N)" >> "$RAMPA_LOG" ;;
esac
ultima="$(printf '%s\n' "$entrada" | tail -1)"
r="$ultima|modelo=$modelo|persist=$persist|formato=$formato|ttl=${CLAUDE_CODE_PROMPT_CACHE_TTL:-sin}|thx=${THYROX_CODE_PROMPT_CACHE_TTL:-sin}|sock=${ANTHROPIC_UNIX_SOCKET:-sin}|key=${ANTHROPIC_API_KEY:-sin}|auth=${ANTHROPIC_AUTH_TOKEN:-sin}|turns=$turns|sid=$sid"
if [[ "$formato" == stream-json ]]; then
  # Como el ejecutable: stream-json en -p exige --verbose.
  [[ "$verbose" == si ]] || { echo "stream-json requires --verbose" >&2; exit 1; }
  jq -cn '{type:"system",subtype:"init"}'
  jq -cn '{type:"assistant",message:{usage:{cache_read_input_tokens:111,cache_creation_input_tokens:22,cache_creation:{ephemeral_5m_input_tokens:22,ephemeral_1h_input_tokens:0}}}}'
  jq -cn '{type:"assistant",message:{usage:{cache_read_input_tokens:500,cache_creation_input_tokens:3}}}'
  # `type` no va primero y el stream cierra con una linea truncada: el
  # ejecutable no garantiza el orden de las claves, y un timeout corta a medias.
  jq -cn --arg r "$r" '{result:$r,type:"result"}'
  printf '{"type":"res\n'
else
  jq -cn --arg r "$r" '{result:$r}'
fi
SH
chmod +x "$F/claude"
printf 'Lee y resume.\n' > "$F/prompt.md"
export HEADLESS_POOL_RUNNER="$F/claude"

# Cada caso con un historial propio y vacío, salvo que declare `HIST`: sin eso,
# el primero dejaría una fila y todos los siguientes derivarían su TTL de ella.
# GNU Time se DECLARA en cada caso —el falso, el real o ninguno—, nunca se
# hereda del contenedor: heredado, el `/usr/bin/time` de la máquina grababa
# filas reales en el historial y el resultado dependía del host
# (H-THYROX-192). Sin declarar, ninguno.
corre() { SALIDA="$(printf '%s\n' "$@" | HEADLESS_POOL_TIME="${HEADLESS_POOL_TIME:-$F/no-existe}" HEADLESS_POOL_HISTORY_DIR="${HIST:-$(mktemp -d -p "$F")}" bash "$POOL" --prompt "$F/prompt.md" --out "$F/out" --model claude-sonnet-5 --width 2 ${EXTRA:-} 2>&1)"; CODE=$?; }

# 1 — tres items: exit 0, una salida por item, y el item llega en el prompt.
rm -rf "$F/out"; corre alfa beta gamma
check "tres items: exit 0" "$CODE" "0"
check "tres items: resumen" "$(printf '%s' "$SALIDA" | gawk '/^items=/{print}')" "items=3 ok=3 fallidos=0"
check "una salida json por item" "$(ls "$F/out"/*.json 2>/dev/null | wc -l)" "3"
check "el item llega al final del prompt" "$(cat "$F/out"/*.json | jq -r .result | cut -d'|' -f1 | sort | paste -sd,)" "Item: alfa,Item: beta,Item: gamma"
check "sin sesion persistida y en stream-json" "$(cat "$F/out"/*.json | jq -r .result | cut -d'|' -f3,4 | sort -u)" "persist=no|formato=stream-json"
check "el .json es la linea result del stream, sola" "$(cat "$F/out"/*.json | jq -r .type | sort -u)" "result"
check "un stream por item, una linea por peticion" "$(cat "$F/out"/*.stream.jsonl 2>/dev/null | jq -rR 'fromjson? | select(.type=="assistant") | .message.usage.cache_read_input_tokens' | sort | uniq -c | gawk '{print $1"x"$2}' | paste -sd,)" "3x111,3x500"
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
SALIDA="$(printf 'alfa\n' | HEADLESS_POOL_RUNNER=/no/existe/thyrox bash "$POOL" --prompt "$F/prompt.md" --out "$F/out" --model claude-sonnet-5 2>&1)"; CODE=$?
check "sin ejecutor: exit 2" "$CODE" "2"
# La variable que declaraba `claude` como ejecutor rehúsa entera y nombra la
# bandera que la reemplaza.
SALIDA="$(printf 'alfa\n' | HEADLESS_POOL_CLAUDE=claude HEADLESS_POOL_HISTORY_DIR="$F/hist-legacy" bash "$POOL" --prompt "$F/prompt.md" --out "$F/out" --model claude-sonnet-5 2>&1)"; CODE=$?
check "HEADLESS_POOL_CLAUDE retirada: exit 2" "$CODE" "2"
check "HEADLESS_POOL_CLAUDE retirada: nombra --runner claude" \
  "$(printf '%s' "$SALIDA" | gawk '/HEADLESS_POOL_CLAUDE/ && /--runner claude/{n++} END{print n+0}')" "1"
check "HEADLESS_POOL_CLAUDE retirada: sin resumen" "$(printf '%s' "$SALIDA" | gawk '/^items=/{n++} END{print n+0}')" "0"
SALIDA="$(printf 'alfa\n' | bash "$POOL" --prompt "$F/no-existe.md" --out "$F/out" --model claude-sonnet-5 2>&1)"; CODE=$?
check "sin plantilla: exit 2" "$CODE" "2"
# Sin ejecutor declarado, el ítem corre con `thyrox -p` (`bin/cli`), no con
# `thyrox -p`: el pool es del proveedor. Un Parallel falso deja ver con qué
# binario se lanzaría, sin lanzarlo.
printf '#!/usr/bin/env bash\nprintf "%%s\\n" "$HP_RUNNER" > "%s/runner.txt"\n' "$F" > "$F/parallel-runner"
chmod +x "$F/parallel-runner"
rm -rf "$F/out" "$F/runner.txt"
printf 'alfa\n' | env -u HEADLESS_POOL_RUNNER HEADLESS_POOL_PARALLEL="$F/parallel-runner" HEADLESS_POOL_TIME="$F/no-existe" \
  HEADLESS_POOL_HISTORY_DIR="$F/historial-runner" bash "$POOL" --prompt "$F/prompt.md" --out "$F/out" --model claude-sonnet-5 >/dev/null 2>&1
check "sin ejecutor declarado: thyrox -p (bin/cli)" "$(cat "$F/runner.txt" 2>/dev/null)" "$RAIZ/bin/cli"

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

# --cache-ttl: el TTL de la caché llega a cada `thyrox -p` por
# THYROX_CODE_PROMPT_CACHE_TTL; sin la opción no se fija (decide el cliente),
# y un valor fuera de 5m|1h rehúsa sin resumen.
ttl_de() { cat "$F/out"/*.json | jq -r .result | gawk -F"|" '{print $6}' | sort -u | paste -sd,; }
rm -rf "$F/out"; EXTRA="--cache-ttl 5m" corre alfa beta
check "cache-ttl 5m: exit 0" "$CODE" "0"
check "cache-ttl 5m: llega a cada item" "$(ttl_de)" "thx=5m"
rm -rf "$F/out"; EXTRA="" THYROX_CODE_PROMPT_CACHE_TTL='' corre alfa
check "sin cache-ttl: no se fija" "$(ttl_de)" "thx=sin"
rm -rf "$F/out"; EXTRA="--cache-ttl 2h" corre alfa
check "cache-ttl ilegible: exit 2" "$CODE" "2"
check "cache-ttl ilegible: sin resumen" "$(printf '%s' "$SALIDA" | gawk '/^items=/{n++} END{print n+0}')" "0"

# El entorno THYROX_* por encima de --cache-ttl, como `QCt` en 2.1.282: la
# variable gana a la decisión calculada, y forzar 5m gana a la variable. El
# ítem la recibe sólo como THYROX_CODE_PROMPT_CACHE_TTL: el pool corre
# `thyrox -p` y nada más, así que CLAUDE_CODE_* no tiene lector (campo ttl=sin).
thx_de() { cat "$F/out"/*.json | jq -r .result | gawk -F"|" '{print $5"|"$6}' | sort -u | paste -sd,; }
rm -rf "$F/out"; EXTRA="" THYROX_CODE_PROMPT_CACHE_TTL=1h corre alfa
check "variable sin --cache-ttl: llega sólo como THYROX_*" "$(thx_de)" "ttl=sin|thx=1h"
check "variable: el pool nombra la razón" "$(printf '%s' "$SALIDA" | gawk '/^cache-ttl: 1h \(env\)$/{n++} END{print n+0}')" "1"
rm -rf "$F/out"; EXTRA="--cache-ttl 5m" THYROX_CODE_PROMPT_CACHE_TTL=1h corre alfa
check "la variable gana a --cache-ttl" "$(thx_de)" "ttl=sin|thx=1h"
rm -rf "$F/out"; EXTRA="--cache-ttl 1h" THYROX_FORCE_PROMPT_CACHING_5M=1 THYROX_CODE_PROMPT_CACHE_TTL=1h corre alfa
check "forzar 5m gana a la variable y a la opción" "$(thx_de)" "ttl=sin|thx=5m"
rm -rf "$F/out"; EXTRA="--cache-ttl 5m" corre alfa
check "sólo --cache-ttl: su razón es la opción" "$(printf '%s' "$SALIDA" | gawk '/^cache-ttl: 5m \(option\)$/{n++} END{print n+0}')" "1"
# Activar 1h: la regla 5 de `QCt`, por debajo de la opción y de la variable.
rm -rf "$F/out"; EXTRA="" THYROX_ENABLE_PROMPT_CACHING_1H=1 corre alfa
check "activar 1h sin opción ni variable: 1h" "$(thx_de)" "ttl=sin|thx=1h"
check "activar 1h: el pool nombra la razón" "$(printf '%s' "$SALIDA" | gawk '/^cache-ttl: 1h \(enable_1h_env\)$/{n++} END{print n+0}')" "1"
rm -rf "$F/out"; EXTRA="--cache-ttl 5m" THYROX_ENABLE_PROMPT_CACHING_1H=1 corre alfa
check "la opción gana a activar 1h" "$(thx_de)" "ttl=sin|thx=5m"
rm -rf "$F/out"; EXTRA="" THYROX_FORCE_PROMPT_CACHING_5M=1 THYROX_ENABLE_PROMPT_CACHING_1H=1 corre alfa
check "forzar 5m gana a activar 1h" "$(thx_de)" "ttl=sin|thx=5m"
# La mitad Bedrock de la regla 5 (`SPt`, 2.1.283): su variable propia sólo
# decide cuando el proveedor ES Bedrock, y el pool lo lee de la misma variable
# con que el proveedor lo elige.
rm -rf "$F/out"; EXTRA="" THYROX_ENABLE_PROMPT_CACHING_1H_BEDROCK=1 CLAUDE_CODE_USE_BEDROCK=1 corre alfa
check "activar 1h en Bedrock, con Bedrock: 1h" "$(thx_de)" "ttl=sin|thx=1h"
check "activar 1h en Bedrock: la razón es la misma regla" "$(printf '%s' "$SALIDA" | gawk '/^cache-ttl: 1h \(enable_1h_env\)$/{n++} END{print n+0}')" "1"
rm -rf "$F/out"; EXTRA="" THYROX_ENABLE_PROMPT_CACHING_1H_BEDROCK=1 corre alfa
check "activar 1h en Bedrock sin Bedrock: no decide" "$(printf '%s' "$SALIDA" | gawk '/^cache-ttl: /{n++} END{print n+0}')" "0"
rm -rf "$F/out"; EXTRA="" THYROX_CODE_PROMPT_CACHE_TTL=30m corre alfa
check "variable ilegible: exit 2" "$CODE" "2"
check "variable ilegible: la nombra, sin resumen" "$(printf '%s' "$SALIDA" | gawk '/THYROX_CODE_PROMPT_CACHE_TTL/{v++} /^items=/{n++} END{print (v>0), n+0}')" "1 0"

# --- el proxy de credencial: los items ven un socket y el marcador, nunca la credencial ---
# El proxy falso anuncia su socket, anota la credencial que recibió y su pid,
# y espera a que lo maten. Los items leen lo que el pool les dejó en el entorno.
cat > "$F/credential-proxy" <<'SH'
#!/usr/bin/env bash
while [[ $# -gt 0 ]]; do case "$1" in --socket) sock="$2"; shift 2 ;; *) shift ;; esac; done
printf '%s|%s\n' "${ANTHROPIC_API_KEY:-sin}" "$$" > "$(dirname "$sock")/../proxy-saw"
echo "socket=$sock"
exec sleep 300
SH
chmod +x "$F/credential-proxy"
printf '#!/usr/bin/env bash\necho "sin credencial" >&2\nexit 2\n' > "$F/credential-proxy-refuses"
chmod +x "$F/credential-proxy-refuses"
cred_de() { cat "$F/out"/*.json | jq -r .result | gawk -F"|" '{print $7"|"$8"|"$9}' | sort -u | paste -sd,; }
rm -rf "$F/out" "$F/proxy-saw"; EXTRA="--credential-proxy" ANTHROPIC_API_KEY=sk-user HEADLESS_POOL_CREDENTIAL_PROXY="$F/credential-proxy" corre alfa beta
check "con proxy: el item ve el socket y el marcador, sin credencial" "$(cred_de)" "sock=$F/out/.credential-proxy.sock|key=ssh-placeholder|auth=sin"
check "con proxy: la credencial la recibe el proxy" "$(cut -d'|' -f1 "$F/proxy-saw" 2>/dev/null)" "sk-user"
check "con proxy: al terminar el pool el proxy ya no vive" "$(kill -0 "$(cut -d'|' -f2 "$F/proxy-saw" 2>/dev/null)" 2>/dev/null && echo vive || echo muerto)" "muerto"
rm -rf "$F/out"; EXTRA="--credential-proxy" ANTHROPIC_API_KEY=sk-user HEADLESS_POOL_CREDENTIAL_PROXY="$F/credential-proxy-refuses" corre alfa
check "proxy que no arranca: exit 2, sin resumen, y lo nombra" "$CODE $(printf '%s' "$SALIDA" | gawk '/^items=/{n++} /proxy de credencial/{p++} END{print n+0, (p>0)}')" "2 0 1"
rm -rf "$F/out"; EXTRA="" ANTHROPIC_API_KEY=sk-user corre alfa
check "sin --credential-proxy el item conserva su entorno" "$(cred_de)" "sock=sin|key=sk-user|auth=sin"

# --- la memoria de cada item, con GNU Time --------------------------------------
# Un GNU time falso: consume `-f FMT -o ARCHIVO`, escribe una medida fija y
# corre el comando conservando su codigo, como el real.
cat > "$F/gnu-time" <<'SH'
#!/usr/bin/env bash
[[ "${1:-}" == --version ]] && { echo "time (GNU Time) UNKNOWN"; exit 0; }
out=""; quiet=""
while [[ "${1:-}" == -* ]]; do
  case "$1" in -o) out="$2"; shift 2 ;; -f) shift 2 ;; -q) quiet=1; shift ;; *) shift ;; esac
done
"$@"; rc=$?
# Como el real: sin `-q`, a la medida de un comando fallido le antepone esta
# linea, y un lector de la primera palabra la toma por la medida.
{ [[ $rc -ne 0 && -z "$quiet" ]] && echo "Command exited with non-zero status $rc"
  printf "%s\n" "12345 1.50 0.40 0.10"; } > "$out"
exit $rc
SH
chmod +x "$F/gnu-time"
rm -rf "$F/out"; EXTRA="" HEADLESS_POOL_TIME="$F/gnu-time" corre alfa FALLA-beta
check "con GNU time: un .time por item" "$(ls "$F/out"/*.time 2>/dev/null | wc -l)" "2"
check "con GNU time: memoria pico, pared, usuario y sistema" "$(cat "$F/out/1.time")" "12345 1.50 0.40 0.10"
# El item que FALLA es el que mas importa medir, y un consumidor que copio el
# lector (`int(campos[0])`) revienta con la linea de «Command exited…».
check "con GNU time: el .time del item fallido es solo la medida" "$(cat "$F/out/2.time")" "12345 1.50 0.40 0.10"
check "con GNU time: el fallo del item sigue siendo fallo" "$(printf '%s' "$SALIDA" | gawk '/^items=/{print}')" "items=2 ok=1 fallidos=1"
# El GNU Time REAL, resuelto por el toolchain como en producción: la medida es
# de verdad (memoria pico > 0 y cuatro campos numéricos), no la fija del falso.
if [[ "$(/usr/bin/time --version 2>&1)" == *"GNU Time"* ]]; then
  rm -rf "$F/out"; EXTRA="" HEADLESS_POOL_TIME=/usr/bin/time corre alfa
  check "GNU time real: el .time trae cuatro cifras" \
    "$(gawk 'NF == 4 && $1 ~ /^[0-9]+$/ && $1 > 0 {n++} END{print n+0}' "$F/out/1.time" 2>/dev/null)" "1"
  check "GNU time real: no declara que falte" "$(printf '%s' "$SALIDA" | gawk '/sin GNU time/{n++} END{print n+0}')" "0"
else
  echo "SIN MEDIR: /usr/bin/time no es GNU Time; el caso del GNU Time real no corre"
fi
rm -rf "$F/out"; EXTRA="" HEADLESS_POOL_TIME="$F/no-existe" corre alfa
check "sin GNU time: ningun .time" "$(ls "$F/out"/*.time 2>/dev/null | wc -l)" "0"
check "sin GNU time: lo declara en vez de callar" "$(printf '%s' "$SALIDA" | gawk '/sin GNU time/{n++} END{print n+0}')" "1"

# --- la VRAM de cada item, con nvidia-smi ---------------------------------------
# Un nvidia-smi falso: declara 400 MiB para el proceso del `claude` falso y un
# uso de 77 %. Anclado a `^bash`: sin ancla casa tambien con el `timeout` y el
# GNU Time que lo envuelven, que un nvidia-smi real no lista (sonda:
# `.claude/workbench/gpu-vram-*/probe-pgrep-anchor.out`). Y
# uso de GPU de 77 %. El item LENTO dura lo bastante para que el monitor lo
# muestree; el rapido puede terminar antes de la primera muestra.
cat > "$F/nvidia-smi" <<'SH'
#!/usr/bin/env bash
case "$*" in
  *--query-compute-apps=pid,used_memory*) pgrep -f "^bash $HEADLESS_POOL_RUNNER -p" | gawk '{print $1 ", 400"}' ;;
  *--query-gpu=index,utilization.gpu*)    echo "0, 77" ;;
  *--query-gpu=index,memory.free*)        echo "0, ${FAKE_FREE_VRAM:-100000}" ;;
  *) exit 9 ;;
esac
SH
chmod +x "$F/nvidia-smi"
rm -rf "$F/out"; EXTRA="" HEADLESS_POOL_NVIDIA_SMI="$F/nvidia-smi" corre LENTO-alfa
check "con nvidia-smi: el item deja su .gpu" "$(ls "$F/out"/*.gpu 2>/dev/null | wc -l)" "1"
check "con nvidia-smi: VRAM pico y uso pico del item" "$(gawk '{print $1, $3}' "$F/out/1.gpu" 2>/dev/null)" "400 77"
check "con nvidia-smi: lo declara" "$(printf '%s' "$SALIDA" | gawk '/^gpu: se mide la VRAM/{n++} END{print n+0}')" "1"
rm -rf "$F/out"; EXTRA="" HEADLESS_POOL_NVIDIA_SMI="$F/no-existe" corre alfa
check "sin nvidia-smi: ningun .gpu" "$(ls "$F/out"/*.gpu 2>/dev/null | wc -l)" "0"
check "sin nvidia-smi: lo declara en vez de callar" "$(printf '%s' "$SALIDA" | gawk '/^gpu: sin nvidia-smi/{n++} END{print n+0}')" "1"

# --- la anchura efectiva: min(configurada, RAM, VRAM), y la admision por VRAM ---
# El historial compartido de estos casos toma su pico de VRAM (400 MiB) de la
# primera ejecucion; con margen 2 cada item pide 800 MiB.
HIST="$F/historial-gpu"
rm -rf "$F/out"; EXTRA="" HEADLESS_POOL_TIME="$F/gnu-time" HEADLESS_POOL_NVIDIA_SMI="$F/nvidia-smi" corre LENTO-alfa
# La admision va justo despues de la ejecucion LENTA: manda la ULTIMA fila, y un
# item que no llega a arrancar no deja medida que la reemplace.
rm -rf "$F/out"; EXTRA="--timeout 2" FAKE_FREE_VRAM=500 HEADLESS_POOL_TIME="$F/gnu-time" HEADLESS_POOL_NVIDIA_SMI="$F/nvidia-smi" corre alfa
check "admision: sin VRAM para su pico el item no arranca" "$(printf '%s' "$SALIDA" | gawk '/^items=/{print}')" "items=1 ok=0 fallidos=1"
check "admision: la causa queda en su .err" "$(gawk '/admision por VRAM/{n++} END{print n+0}' "$F/out/1.err")" "1"
# Lo comprometido por OTRO pool cuenta: 1000 libres, y un dueño vivo (este
# shell, cuyo árbol no usa GPU) ya reservó 900. Sin el registro el ítem vería
# 1000 >= 800 y arrancaría: es la carrera de comprobar-y-usar entre dos pools.
printf '{"%s": 900}' "$$" > "$HIST/vram-reservations.json"
# Sin GNU Time: si el ítem arrancara por error, no dejaría una fila que cambie
# la anchura de los casos siguientes.
rm -rf "$F/out"; EXTRA="--timeout 2" FAKE_FREE_VRAM=1000 HEADLESS_POOL_TIME="$F/no-existe" HEADLESS_POOL_NVIDIA_SMI="$F/nvidia-smi" corre alfa
check "admision: lo reservado por otro pool vivo no se vuelve a dar" "$(printf '%s' "$SALIDA" | gawk '/^items=/{print}')" "items=1 ok=0 fallidos=1"
check "admision: la reserva ajena sigue en el registro" "$(jq -r --arg p "$$" '.[$p]' "$HIST/vram-reservations.json" 2>/dev/null)" "900"
rm -f "$HIST/vram-reservations.json"
# Un error de la admisión no es un plazo vencido: con el registro en un sitio
# donde no se puede escribir, el .err dice que la admisión FALLÓ y con qué
# código, no «no hubo sitio» —eso afirmaría una medida que no ocurrió—.
rm -rf "$F/out"; EXTRA="--timeout 2" HEADLESS_POOL_VRAM_LEDGER=/proc/no-se-puede/vram.json HEADLESS_POOL_NVIDIA_SMI="$F/nvidia-smi" corre alfa
check "admisión con error: el ítem falla" "$(printf '%s' "$SALIDA" | gawk '/^items=/{print}')" "items=1 ok=0 fallidos=1"
check "admisión con error: el .err dice que falló, no que venció" \
  "$(gawk '/la admision por VRAM fallo \(exit [0-9]+\)/{a++} /admision por VRAM vencida/{b++} END{print a+0, b+0}' "$F/out/1.err")" "1 0"
# Un solo ítem: la fila midió uno, así que está calibrada para lanzar uno (con
# dos, la dispersión de uno no los representa y pediría la GPU entera).
rm -rf "$F/out"; EXTRA="--width 4" FAKE_FREE_VRAM=1000 HEADLESS_POOL_PARALLEL="$F/parallel" HEADLESS_POOL_TIME="$F/no-existe" HEADLESS_POOL_NVIDIA_SMI="$F/nvidia-smi" corre alfa
check "VRAM: 1000 libres / 800 por item -> anchura 1 aunque se configuraron 4" \
  "$(printf '%s' "$SALIDA" | gawk '/^anchura: 1 \(configurada 4/{n++} END{print n+0}')" "1"
# Lo que discrimina no es el mensaje sino el -j que llega a Parallel: un aviso
# impreso sin aplicar la anchura pasaria la linea de arriba.
check "VRAM: Parallel se lanza con -j 1" "$(gawk '{for (i = 1; i < NF; i++) if ($i == "-j") print $(i+1)}' "$F/parallel.args")" "1"
# Cada ítem admitido reserva y, al terminar, suelta: tras la ejecución el
# registro no guarda nada suyo. Sin el `release` quedaría una fila por ítem.
rm -rf "$F/out"; EXTRA="" HEADLESS_POOL_NVIDIA_SMI="$F/nvidia-smi" corre alfa beta
check "reserva: los items admitidos arrancan" "$(printf '%s' "$SALIDA" | gawk '/^items=/{print}')" "items=2 ok=2 fallidos=0"
check "reserva: el registro queda vacio al terminar" "$(ledger_reservation_count "$HIST/vram-reservations.json")" "0"
# El JSON roto no es "vacío": un registro presente pero ilegible tiene que
# distinguirse del reposo (archivo ausente), no confundirse con él.
printf '{roto' > "$HIST/vram-reservations.json"
check "reserva: registro ilegible no cuenta como vacio" "$(ledger_reservation_count "$HIST/vram-reservations.json")" "ilegible"
rm -f "$HIST/vram-reservations.json"
# La última fila midió UN ítem; lanzar dos a la vez con ella es extrapolar su
# dispersión. Calibrado exige min(anchura, ítems) medidos.
rm -rf "$F/out"; EXTRA="--width 4" HEADLESS_POOL_TIME="$F/no-existe" HEADLESS_POOL_NVIDIA_SMI="$F/nvidia-smi" corre alfa beta
check "calibrado exige tantos ítems medidos como van a la vez" \
  "$(printf '%s' "$SALIDA" | gawk 'index($0, "1 ítems medidos para lanzar 2"){n++} END{print n+0}')" "1"
# Una edad máxima declarada deja fuera una fila más vieja: con 0 h, cualquiera.
rm -rf "$F/out"; EXTRA="" HEADLESS_POOL_HISTORY_MAX_AGE_HOURS=0 HEADLESS_POOL_TIME="$F/no-existe" HEADLESS_POOL_NVIDIA_SMI="$F/nvidia-smi" corre alfa
check "la edad máxima declarada deja fuera la fila" \
  "$(printf '%s' "$SALIDA" | gawk '/^historial:.*límite/{n++} END{print n+0}')" "1"
rm -rf "$F/out"; EXTRA="" HEADLESS_POOL_HISTORY_MAX_AGE_HOURS=muchas corre alfa
check "edad máxima ilegible: exit 2" "$CODE" "2"
# --- dos pools DISTINTOS a la vez, sobre una GPU simulada con estado ---------
# Integración, no componente: dos `headless-pool` —dos GNU Parallel, cada uno
# con su -j— comparten la base del historial y por tanto el registro. GPU de
# 1000 MiB, cada ítem pide 800 y asigna 3 s tarde. Mirando sólo lo libre los
# dos verían 1000 y correrían juntos; con el registro, uno espera al otro.
export GPU_STATE="$F/gpu-state" RAMPA_LOG="$F/rampa.log"
mkdir -p "$GPU_STATE/used"; echo 1000 > "$GPU_STATE/total"; : > "$RAMPA_LOG"
printf '#!/usr/bin/env bash\nexec bash "%s" "$@"\n' "$RAIZ/tests/session/fakes/stateful-nvidia-smi.sh" > "$F/smi-estado"
chmod +x "$F/smi-estado"
# El historial es DE este ítem: una ejecución sola, medida con GNU Time y la
# GPU simulada, deja su pico (400 MiB -> pide 800). Heredar el de otro ítem lo
# falseaba: un pico 0 de una ejecución rápida hacía que no se pidiera nada, y
# los dos pools corrían juntos sin que la admisión llegara a actuar.
HIST="$F/historial-dos-pools"
printf 'RAMPA-medida\n' | HEADLESS_POOL_HISTORY_DIR="$HIST" HEADLESS_POOL_TIME="$F/gnu-time" \
  HEADLESS_POOL_NVIDIA_SMI="$F/smi-estado" bash "$POOL" --prompt "$F/prompt.md" --out "$F/out-medida" \
  --model claude-sonnet-5 --width 2 --timeout 20 > "$F/pool-medida.salida" 2>&1
: > "$RAMPA_LOG"
check "dos pools: la ejecución de medida deja el pico del ítem" \
  "$(gawk '{print $1}' "$F/out-medida/1.gpu" 2>/dev/null)" "400"
dos_pools() {
  for p in a b; do
    rm -rf "$F/out-$p"
    printf 'RAMPA-%s\n' "$p" | HEADLESS_POOL_HISTORY_DIR="$HIST" HEADLESS_POOL_TIME="$F/gnu-time" \
      HEADLESS_POOL_NVIDIA_SMI="$F/smi-estado" bash "$POOL" --prompt "$F/prompt.md" --out "$F/out-$p" \
      --model claude-sonnet-5 --width 2 --timeout 20 > "$F/pool-$p.salida" 2>&1 &
  done
  wait
}
dos_pools
check "dos pools: los dos items terminan" \
  "$(cat "$F/pool-a.salida" "$F/pool-b.salida" | gawk '/^items=/{print}' | sort -u)" "items=1 ok=1 fallidos=0"
# Cuántos ítems corrieron a la vez, de los instantes de arranque y fin.
check "dos pools: nunca corren juntos (máximo simultáneo 1)" \
  "$(sort -k2,2n "$RAMPA_LOG" | gawk '$1=="start"{n++; if (n>m) m=n} $1=="end"{n--} END{print m+0}')" "1"
check "dos pools: el registro queda vacío" "$(ledger_reservation_count "$HIST/vram-reservations.json")" "0"
check "dos pools: la ejecución concurrente también se mide (una fila por pool)" \
  "$(gawk 'END{print NR}' "$HIST"/*/runs.jsonl 2>/dev/null)" "3"
# H-THYROX-192 en producción, no en el montaje del test: el historial trae un
# pico 0 de ítems demasiado cortos para haber sido vistos, y NO hay ejecución
# de medida antes. Sin calibrar, cada ítem pide la GPU entera: los dos pools
# no corren juntos. Antes, el 0 hacía que no se pidiera nada.
HIST="$F/historial-cero"
HIST_DIR="$(HEADLESS_POOL_HISTORY_DIR="$HIST" bash "$RAIZ/bin/pool_history" dir "$F/prompt.md")"
mkdir -p "$HIST_DIR"
printf '{"items_measured": 2, "items_gpu_measured": 2, "min_wall_s": 0.1, "max_wall_s": 0.1, "peak_kb": 1000, "peak_vram_mib": 0, "runner": "%s"}\n' \
  "$HEADLESS_POOL_RUNNER" > "$HIST_DIR/runs.jsonl"
: > "$RAMPA_LOG"
dos_pools
check "pico 0 sin calibrar: los dos terminan" \
  "$(cat "$F/pool-a.salida" "$F/pool-b.salida" | gawk '/^items=/{print}' | sort -u)" "items=1 ok=1 fallidos=0"
check "pico 0 sin calibrar: nunca corren juntos" \
  "$(sort -k2,2n "$RAMPA_LOG" | gawk '$1=="start"{n++; if (n>m) m=n} $1=="end"{n--} END{print m+0}')" "1"
check "pico 0 sin calibrar: lo dice" "$(gawk '/hasta calibrar/{n++} END{print n+0}' "$F/pool-a.salida")" "1"
unset GPU_STATE RAMPA_LOG
unset HIST
# RAM: MemAvailable 30000 KB y el item pico 12345 KB x 2 -> cabe 1.
printf 'MemTotal: 100000 kB\nMemAvailable: 30000 kB\n' > "$F/meminfo"
HIST="$F/historial-ram"
rm -rf "$F/out"; EXTRA="" HEADLESS_POOL_TIME="$F/gnu-time" corre alfa
rm -rf "$F/out"; EXTRA="--width 4" THYROX_POOL_MEMINFO_PATH="$F/meminfo" HEADLESS_POOL_PARALLEL="$F/parallel" HEADLESS_POOL_TIME="$F/gnu-time" corre alfa beta
check "RAM: 30000 KB disponibles / (12345 x 2) -> anchura 1" \
  "$(printf '%s' "$SALIDA" | gawk '/^anchura: 1 \(configurada 4/{n++} END{print n+0}')" "1"
check "RAM: Parallel se lanza con -j 1" "$(gawk '{for (i = 1; i < NF; i++) if ($i == "-j") print $(i+1)}' "$F/parallel.args")" "1"
unset HIST

# --- el historial: cada ejecución deja su medida y la siguiente deriva de ella --
# `HIST` es el mismo en los cuatro casos: el primero no tiene historial, los
# siguientes leen la fila que dejó. La medida del GNU time falso es fija
# (12345 KB, 1.50 s): pared de 1.5 s -> turnos seguidos -> 5m; 12345 KB x 2
# -> 25M hacia arriba.
HIST="$F/historial-compartido"
rm -rf "$F/out"; EXTRA="" HEADLESS_POOL_TIME="$F/gnu-time" corre alfa
check "historial vacío: lo declara" "$(printf '%s' "$SALIDA" | gawk '/sin ejecución previa/{n++} END{print n+0}')" "1"
check "historial vacío: no inventa TTL" "$(thx_de)" "ttl=sin|thx=sin"
check "la ejecución deja una fila" "$(find "$HIST" -name runs.jsonl -exec cat {} + 2>/dev/null | wc -l)" "1"
check "la fila nombra el binario que corrió los ítems" \
  "$(find "$HIST" -name runs.jsonl -exec cat {} + 2>/dev/null | jq -r .runner)" "$HEADLESS_POOL_RUNNER"
check "la fila nombra el modelo que corrió los ítems" \
  "$(find "$HIST" -name runs.jsonl -exec cat {} + 2>/dev/null | jq -r .item_model)" "claude-sonnet-5"
check "la fila lleva la huella del CONTENIDO de la plantilla" \
  "$(find "$HIST" -name runs.jsonl -exec cat {} + 2>/dev/null | jq -r .template_digest)" \
  "$(sha256sum "$F/prompt.md" | gawk '{print $1}')"
rm -rf "$F/out"; EXTRA="" HEADLESS_POOL_TIME="$F/gnu-time" corre alfa
check "con historial: el TTL sale de la pared medida" "$(thx_de)" "ttl=sin|thx=5m"
check "con historial: declara de dónde salió el TTL" "$(printf '%s' "$SALIDA" | gawk '/^cache-ttl: 5m \(history\)/{n++} END{print n+0}')" "1"
check "con historial: --memfree sale de la memoria medida" "$(printf '%s' "$SALIDA" | gawk '/^memfree: 25M \(history\)/{n++} END{print n+0}')" "1"
rm -rf "$F/out"; EXTRA="--cache-ttl 1h --memfree 1G" HEADLESS_POOL_TIME="$F/gnu-time" corre alfa
check "lo declarado gana al historial: TTL" "$(thx_de)" "ttl=sin|thx=1h"
check "lo declarado gana al historial: memfree" "$(printf '%s' "$SALIDA" | gawk '/^memfree: 1G \(option\)/{n++} END{print n+0}')" "1"
rm -rf "$F/out"; EXTRA="" THYROX_ENABLE_PROMPT_CACHING_1H=1 HEADLESS_POOL_TIME="$F/gnu-time" corre alfa
check "el entorno gana al historial" "$(thx_de)" "ttl=sin|thx=1h"
rm -rf "$F/out"; EXTRA="" HEADLESS_POOL_MEMFREE_RESERVE=1G HEADLESS_POOL_TIME="$F/gnu-time" corre alfa
check "la reserva del vecino se suma a lo medido" "$(printf '%s' "$SALIDA" | gawk '/^memfree: 1049M \(history\)/{n++} END{print n+0}')" "1"
check "una plantilla, un solo historial" "$(find "$HIST" -name runs.jsonl | wc -l)" "1"
unset HIST
# La cota es del binario: una fila medida con OTRO (`thyrox -p` frente a
# `thyrox -p`, #48) no fija la de este, aunque sea la última.
HIST="$F/historial-otro-binario"
HIST_DIR="$(HEADLESS_POOL_HISTORY_DIR="$HIST" bash "$RAIZ/bin/pool_history" dir "$F/prompt.md")"
mkdir -p "$HIST_DIR"
printf '{"items_measured": 1, "min_wall_s": 1.0, "max_wall_s": 1.0, "peak_kb": 900000, "runner": "claude"}\n' \
  > "$HIST_DIR/runs.jsonl"
rm -rf "$F/out"; EXTRA="" HEADLESS_POOL_TIME="$F/gnu-time" corre alfa
check "otro binario: no deriva memfree de su fila" \
  "$(printf '%s' "$SALIDA" | gawk '/^memfree: .*\(history\)/{n++} END{print n+0}')" "0"
check "otro binario: lo dice" \
  "$(printf '%s' "$SALIDA" | gawk -v b="$HEADLESS_POOL_RUNNER" 'index($0, "sin ejecución previa de " b){n++} END{print n+0}')" "1"
unset HIST
# La cota es también del modelo: la misma plantilla con otro modelo es otra
# carga, y su fila no fija la de éste aunque el binario coincida.
HIST="$F/historial-otro-modelo"
HIST_DIR="$(HEADLESS_POOL_HISTORY_DIR="$HIST" bash "$RAIZ/bin/pool_history" dir "$F/prompt.md")"
mkdir -p "$HIST_DIR"
printf '{"items_measured": 1, "min_wall_s": 1.0, "max_wall_s": 1.0, "peak_kb": 900000, "runner": "%s", "item_model": "claude-opus-5"}\n' \
  "$HEADLESS_POOL_RUNNER" > "$HIST_DIR/runs.jsonl"
rm -rf "$F/out"; EXTRA="" HEADLESS_POOL_TIME="$F/gnu-time" corre alfa
check "otro modelo: no deriva memfree de su fila" \
  "$(printf '%s' "$SALIDA" | gawk '/^memfree: .*\(history\)/{n++} END{print n+0}')" "0"
check "otro modelo: lo dice" \
  "$(printf '%s' "$SALIDA" | gawk 'index($0, "ninguna con el modelo claude-sonnet-5"){n++} END{print n+0}')" "1"
unset HIST
rm -rf "$F/out"; EXTRA="" HEADLESS_POOL_MEMFREE_RESERVE=1G corre alfa
check "sin historial, la reserva sola es la cota" "$(printf '%s' "$SALIDA" | gawk '/^memfree: 1024M \(history\)/{n++} END{print n+0}')" "1"
rm -rf "$F/out"; EXTRA="" HEADLESS_POOL_MEMFREE_RESERVE=mucha corre alfa
check "reserva ilegible: exit 2" "$CODE" "2"

# 30 — `--runner claude`: el ítem corre con el `claude` del PATH, con la
# misma línea de comando, y cada uno con su propio --session-id. Un
# `claude -p` hijo hereda la sesión de quien lo lanza si no se le da otra
# (.claude/workbench/claude-p-from-shell-20260928T234121).
mkdir -p "$F/path-claude"; cp "$F/claude" "$F/path-claude/claude"
run_with_claude() { SALIDA="$(printf '%s\n' "$@" | env -u HEADLESS_POOL_RUNNER PATH="$F/path-claude:$PATH" HEADLESS_POOL_TIME="$F/no-existe" HEADLESS_POOL_HISTORY_DIR="$(mktemp -d -p "$F")" bash "$POOL" --prompt "$F/prompt.md" --out "$F/out" --model claude-sonnet-5 --width 2 --runner claude ${EXTRA:-} 2>&1)"; CODE=$?; }
rm -rf "$F/out"; run_with_claude alfa beta
check "runner claude: exit 0" "$CODE" "0"
check "runner claude: resumen" "$(printf '%s' "$SALIDA" | gawk '/^items=/{print}')" "items=2 ok=2 fallidos=0"
check "runner claude: sin sesión persistida y en stream-json" "$(cat "$F/out"/*.json | jq -r .result | cut -d'|' -f3,4 | sort -u)" "persist=no|formato=stream-json"
sids="$(cat "$F/out"/*.json | jq -r .result | gawk -F'sid=' '{print $2}')"
check "runner claude: cada ítem trae un --session-id con forma de uuid" \
  "$(printf '%s\n' "$sids" | grep -cE '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')" "2"
check "runner claude: los --session-id son distintos" "$(printf '%s\n' "$sids" | sort -u | wc -l)" "2"
rm -rf "$F/out"; corre alfa
check "runner thyrox por defecto: sin --session-id" "$(jq -r .result "$F/out/1.json" | gawk -F'sid=' '{print $2}')" "sin"
# Sin --max-turns el pool no inventa un tope: el ítem lo acota su --timeout.
turns_of() { jq -r .result "$F/out/1.json" | gawk -F'|' '{for (i=1;i<=NF;i++) if ($i ~ /^turns=/) print substr($i,7)}'; }
check "sin --max-turns: el ítem corre sin tope de turnos" "$(turns_of)" "sin"
rm -rf "$F/out"; EXTRA="--max-turns 7" corre alfa
check "--max-turns declarado llega al ítem" "$(turns_of)" "7"
rm -rf "$F/out"; run_with_claude alfa
check "runner claude sin --max-turns: sin tope" "$(turns_of)" "sin"
SALIDA="$(printf 'alfa\n' | env -u HEADLESS_POOL_RUNNER PATH="$F/sin-claude:/usr/bin:/bin" HEADLESS_POOL_HISTORY_DIR="$(mktemp -d -p "$F")" bash "$POOL" --prompt "$F/prompt.md" --out "$F/out" --model claude-sonnet-5 --runner claude 2>&1)"; CODE=$?
check "runner claude sin claude en el PATH: exit 2" "$CODE" "2"
check "runner claude sin claude en el PATH: lo nombra" "$(printf '%s' "$SALIDA" | gawk '/REHUSA/ && /claude/{n++} END{print n+0}')" "1"
rm -rf "$F/out"; EXTRA="--runner otro" corre alfa
check "runner desconocido: exit 2" "$CODE" "2"
# El TTL llega con la variable que lee cada cliente: la de claude, no la de
# thyrox (las dos declaradas en _references/claude-code-bin/2.1.283).
rm -rf "$F/out"; EXTRA="--cache-ttl 5m" run_with_claude alfa
check "runner claude con --cache-ttl: exit 0" "$CODE" "0"
check "runner claude con --cache-ttl: la variable de claude, no la de thyrox" \
  "$(jq -r .result "$F/out/1.json" | cut -d'|' -f5,6)" "ttl=5m|thx=sin"
# El proxy de credencial funciona igual con claude: el ítem recibe el socket
# y el marcador, y la credencial se queda en el proxy.
rm -rf "$F/out" "$F/proxy-saw"; EXTRA="--credential-proxy" ANTHROPIC_API_KEY=sk-user HEADLESS_POOL_CREDENTIAL_PROXY="$F/credential-proxy" run_with_claude alfa beta
check "runner claude con proxy: exit 0" "$CODE" "0"
check "runner claude con proxy: el ítem ve el socket y el marcador, sin credencial" "$(cred_de)" "sock=$F/out/.credential-proxy.sock|key=ssh-placeholder|auth=sin"
check "runner claude con proxy: la credencial la recibe el proxy" "$(cut -d'|' -f1 "$F/proxy-saw" 2>/dev/null)" "sk-user"

# Un `parallel` que muere sin correr ningún ítem —el disco lleno lo hizo— deja
# el joblog con la cabecera sola. El total sale del índice, no del joblog: un
# ítem sin fila no tiene veredicto, y eso es un fallo, no un cero.
cat > "$F/parallel-dies" <<'SH'
#!/usr/bin/env bash
while [[ $# -gt 0 ]]; do [[ "$1" == --joblog ]] && { printf 'Seq\tHost\tStarttime\tJobRuntime\tSend\tReceive\tExitval\tSignal\tCommand\n' > "$2"; }; shift; done
exit 0
SH
chmod +x "$F/parallel-dies"
rm -rf "$F/out"; HEADLESS_POOL_PARALLEL="$F/parallel-dies" corre alfa beta gamma
check "sin filas en el joblog: no sale 0" "$([[ $CODE -ne 0 ]] && echo si || echo no)" "si"
check "sin filas en el joblog: el total es el del índice" \
  "$(printf '%s' "$SALIDA" | gawk '/^items=/{print}')" "items=3 ok=0 fallidos=0 sin-veredicto=3"

# Un pool de prueba vive en su propio runtime: ninguna ejecución del runtime
# real puede publicar en la salida de esta suite.
real_runtime="$(env -u THYROX_RUNTIME_DIR THYROX_ROOT="$RAIZ" python3 -c 'import sys; sys.path.insert(0, sys.argv[1]); import pool_lifecycle; print(pool_lifecycle.runtime_root())' "$RAIZ/src/session")"
check "el runtime real no recibe ejecuciones de la suite" \
  "$(grep -ls "\"out_dir\": \"$F/" "$real_runtime"/pool/*/run.json 2>/dev/null | wc -l)" "0"

echo
echo "aserciones: $((total - fallos)) de $total · fallos: $fallos"
exit $((fallos > 0))
