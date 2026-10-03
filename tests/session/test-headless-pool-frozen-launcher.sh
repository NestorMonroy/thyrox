#!/usr/bin/env bash
# Suite del lanzador inmutable de headless-pool (TASK-THYROX-0506).
#
# Bash lee un script por partes mientras corre, así que editar
# src/session/headless-pool.sh bajo un pool vivo cambia lo que el pool hace
# después. El pool tiene que correr desde una copia tomada al lanzar.
#
# Cada caso copia la capa de shell (src/session, src/lib) a un árbol de
# trabajo y corre el pool desde ahí, para que la prueba reescriba «su»
# lanzador en su sitio sin tocar este repositorio. Las herramientas de Python
# siguen saliendo del árbol real por THYROX_ROOT.
#
# La sincronización es un par de FIFO, no un sleep: el runner falso anuncia
# que arrancó por una y se bloquea en la otra hasta que la prueba reescribió
# el lanzador.
#
# El control de anulación corre el mismo escenario con el bloque de
# congelado retirado de la copia: la reescritura tiene que llegar entonces al
# pool vivo, lo que prueba que el caso ve el defecto contra el que protege.
set -uo pipefail
# Esta suite mide la mecánica del pool, no la política de ejecución: la declara
# sin restricción (sin ella regiría la versionada del árbol, y la suite dependería de ella).
THYROX_EXECUTION_POLICY="$(cd "$(dirname "${BASH_SOURCE[0]}")/../fixtures" && pwd)/execution_policy_unrestricted.json"
export THYROX_EXECUTION_POLICY
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
failures=0; total=0
check() { total=$((total+1)); if [[ "$2" == "$3" ]]; then echo "OK   $1"; else echo "FAIL $1 — expected '$3', got '$2'"; failures=$((failures+1)); fi; }

F="$(mktemp -d)"; trap 'rm -rf "${F:?}"' EXIT
cat > "$F/runner" <<'SH'
#!/usr/bin/env bash
cat > /dev/null
echo started > "$FROZEN_TEST_STARTED"
read -r _ < "$FROZEN_TEST_RELEASE"
jq -cn '{type:"result",result:"done"}'
SH
chmod +x "$F/runner"
printf 'Read.\n' > "$F/prompt.md"

# scratch_tree <dir>: una copia de la capa de shell que ejecuta el pool.
scratch_tree() {
  mkdir -p "$1/src"
  cp -R "$ROOT/src/session" "$ROOT/src/lib" "$1/src/"
}

# run_case <tree> <label>: lanza el pool desde <tree>, reescribe su lanzador en
# su sitio (mismo inodo, misma longitud) cuando el ítem ya corre, e imprime la
# salida del pool.
run_case() {
  local tree="$1" label="$2" pool pid content
  pool="$tree/src/session/headless-pool.sh"
  mkfifo "$F/$label.started" "$F/$label.release"
  printf 'one\n' | THYROX_ROOT="$ROOT" THYROX_RUNTIME_DIR="$F/$label.runtime" \
      FROZEN_TEST_STARTED="$F/$label.started" FROZEN_TEST_RELEASE="$F/$label.release" \
      HEADLESS_POOL_RUNNER="$F/runner" HEADLESS_POOL_TIME="$F/no-time" \
      HEADLESS_POOL_HISTORY_DIR="$F/$label.history" \
      bash "$pool" --prompt "$F/prompt.md" --out "$F/$label.out" \
          --task-class analisis --width 1 > "$F/$label.log" 2>&1 &
  pid=$!
  # Se abre en lectura y escritura para que un pool que muere antes de que el
  # ítem arranque no deje la prueba bloqueada en la FIFO; el plazo acota la
  # espera.
  exec {started_fd}<> "$F/$label.started"
  if ! read -r -t 60 _ <&"$started_fd"; then
    echo "the item never started:"; cat "$F/$label.log"; kill "$pid" 2>/dev/null
  fi
  exec {started_fd}<&-
  # Mientras el ítem corre, bajo el runtime existe una copia del lanzador.
  find "$F/$label.runtime" -name headless-pool.sh 2>/dev/null | wc -l > "$F/$label.live-copies"
  # Reescritura en su sitio: `cat >` conserva el inodo, así que un pool que lee
  # este archivo ve los bytes nuevos. El reemplazo tiene la misma longitud y
  # cae DESPUÉS de una bifurcación del pool (`close-run`): bash relee el
  # archivo al bifurcar, no al ejecutar un builtin, así que sólo una línea
  # posterior a un comando externo puede medir si la reescritura llega.
  content="$(cat "$pool")"
  printf '%s\n' "${content//memoria: sin GNU time/MEMORIA: sin GNU time}" > "$pool"
  exec {release_fd}<> "$F/$label.release"
  echo go >&"$release_fd"
  exec {release_fd}>&-
  wait "$pid"
  cat "$F/$label.log"
}

# --- caso 1: el pool vivo conserva la conducta con la que arrancó ----------
scratch_tree "$F/frozen"
out="$(run_case "$F/frozen" frozen)"; printf "%s\n" "$out" | sed "s/^/  | /"
check "the live pool keeps the summary of the copy it started with" \
  "$(grep -c '^memoria: sin GNU time' <<< "$out")" 1
check "the rewritten source does not reach the live pool" \
  "$(grep -c '^MEMORIA:' <<< "$out")" 0
check "a frozen copy of the launcher exists while the item runs" \
  "$([[ "$(cat "$F/frozen.live-copies")" -ge 1 ]] && echo yes || echo no)" yes
check "the frozen copy is removed when the pool exits" \
  "$(find "$F/frozen.runtime" -name headless-pool.sh 2>/dev/null | wc -l)" 0

# --- caso 2: control de anulación -----------------------------------------
# Sin el bloque de congelado, la misma reescritura llega al pool vivo. Si este
# caso dejara de reproducirlo, el caso 1 no estaría midiendo la protección.
scratch_tree "$F/unfrozen"
gawk -i inplace '/^# >>> frozen-launcher/{skip=1} !skip{print} /^# <<< frozen-launcher/{skip=0}' \
  "$F/unfrozen/src/session/headless-pool.sh"
check "control: the freeze block was removed from the unfrozen copy" \
  "$(grep -c 'frozen-launcher' "$F/unfrozen/src/session/headless-pool.sh")" 0
out="$(run_case "$F/unfrozen" unfrozen)"
check "control: without the freeze, the rewrite reaches the live pool" \
  "$(grep -c '^MEMORIA: sin GNU time' <<< "$out")" 1

echo "result: $((total - failures)) of $total assertions green"
[[ "$failures" -eq 0 ]]
