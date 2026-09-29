#!/usr/bin/env bash
# Suite del cierre de un ítem del pool: no termina porque salió su proceso
# principal, sino cuando su sesión quedó vacía y nadie escribe en sus salidas
# (TASK-THYROX-0546).
#
# El runner falso reproduce la forma real del defecto: deja un hijo en segundo
# plano que sigue escribiendo en el stream del ítem después de que el proceso
# principal salió. La sincronización es por FIFO, no por sleep: el runner
# anuncia que su principal va a salir, y el hijo escribe sólo cuando la prueba
# lo suelta.
#
# Casos:
#   1. con drenaje: mientras el hijo vive, el ítem no tiene `.json` y el hijo
#      aparece como escritor del stream; al soltarlo, la línea tardía queda
#      dentro del stream antes del cierre, y la sesión termina vacía.
#   2. un hijo que nunca sale se retira al vencer la gracia, y el ítem se marca
#      fallido nombrando el motivo: sus salidas no son confiables.
#   3. control de anulación: sin el bloque de drenaje, el pool termina con el
#      hijo todavía vivo y escribiendo en su salida.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
failures=0; total=0
check() { total=$((total+1)); if [[ "$2" == "$3" ]]; then echo "OK   $1"; else echo "FAIL $1 — expected '$3', got '$2'"; failures=$((failures+1)); fi; }

F="$(mktemp -d)"; trap 'rm -rf "${F:?}"' EXIT
cat > "$F/runner" <<'SH'
#!/usr/bin/env bash
cat > /dev/null
jq -cn '{type:"result",subtype:"success",result:"done"}'
# El hijo hereda la salida estándar —el stream del ítem— y escribe cuando la
# prueba lo suelta. Su pid va a un archivo para que la prueba lo mire.
( read -r _ < "$DRAIN_TEST_RELEASE"; jq -cn '{type:"late"}' ) &
echo "$!" > "$DRAIN_TEST_CHILD_PID"
echo main-exiting > "$DRAIN_TEST_MAIN_EXIT"
SH
chmod +x "$F/runner"
printf 'Read.\n' > "$F/prompt.md"

alive() { [[ -e "/proc/$1" ]] && [[ "$(gawk '{print $3}' "/proc/$1/stat" 2>/dev/null)" != Z ]]; }

# start_case <tree> <label> <drain-seconds>: lanza el pool y espera a que el
# principal del ítem anuncie su salida.
start_case() {
  local tree="$1" label="$2" drain="$3"
  mkfifo "$F/$label.main-exit" "$F/$label.release"
  printf 'one\n' | THYROX_ROOT="$ROOT" THYROX_RUNTIME_DIR="$F/$label.runtime" \
      DRAIN_TEST_MAIN_EXIT="$F/$label.main-exit" DRAIN_TEST_RELEASE="$F/$label.release" \
      DRAIN_TEST_CHILD_PID="$F/$label.child-pid" HEADLESS_POOL_ITEM_DRAIN_SECONDS="$drain" \
      HEADLESS_POOL_RUNNER="$F/runner" HEADLESS_POOL_TIME="$F/no-time" \
      HEADLESS_POOL_HISTORY_DIR="$F/$label.history" \
      bash "$tree/src/session/headless-pool.sh" --prompt "$F/prompt.md" --out "$F/$label.out" \
          --model claude-sonnet-5 --width 1 > "$F/$label.log" 2>&1 &
  POOL_PID=$!
  exec {main_exit_fd}<> "$F/$label.main-exit"
  read -r -t 60 _ <&"$main_exit_fd" || { echo "el principal nunca anunció su salida:"; cat "$F/$label.log"; }
  exec {main_exit_fd}<&-
  CHILD_PID="$(cat "$F/$label.child-pid")"
}

release_child() {
  exec {release_fd}<> "$F/$1.release"
  echo go >&"$release_fd"
  exec {release_fd}>&-
}

# --- caso 1: el ítem espera a su hijo y la línea tardía entra antes del cierre
start_case "$ROOT" drained 30
check "el hijo sigue vivo después de que salió el principal" "$(alive "$CHILD_PID" && echo yes)" yes
# Mientras el ítem vive, su stream está en el runtime, no en la salida.
live_stream="$(compgen -G "$F/drained.runtime/pool/*/1.stream.jsonl")"
check "el hijo es escritor vivo del stream" \
  "$(bash "$ROOT/bin/writer_inspector" "$live_stream" >/dev/null; echo $?)" 1
check "mientras el hijo vive, el ítem no tiene .json" "$([[ -e "$F/drained.out/1.json" ]] && echo yes || echo no)" no
release_child drained
wait "$POOL_PID"; code=$?
check "el pool termina bien" "$code" 0
check "la línea tardía está en el stream" "$(grep -c '"late"' "$F/drained.out/1.stream.jsonl")" 1
check "el .json es la línea result" "$(jq -r .type "$F/drained.out/1.json")" result
check "nadie escribe ya en las salidas del ítem" \
  "$(bash "$ROOT/bin/writer_inspector" "$F/drained.out" >/dev/null; echo $?)" 0
check "el hijo ya no vive" "$(alive "$CHILD_PID" && echo yes || echo no)" no

# --- caso 2: un hijo que no sale se retira al vencer la gracia
start_case "$ROOT" stuck 1
wait "$POOL_PID"; code=$?
check "el pool termina aunque el hijo no saliera" "$code" 1
check "el hijo fue retirado" "$(alive "$CHILD_PID" && echo yes || echo no)" no
check "el ítem declara que tuvo que terminar procesos" "$(grep -c 'drenaje: SIGTERM' "$F/stuck.out/1.err")" 1
check "el resumen cuenta el ítem como fallido" "$(grep -c '^items=1 ok=0 fallidos=1' "$F/stuck.log")" 1
check "nadie escribe ya en las salidas del ítem" \
  "$(bash "$ROOT/bin/writer_inspector" "$F/stuck.out" >/dev/null; echo $?)" 0

# --- caso 3: control de anulación ---------------------------------------------
# Sin el bloque de drenaje, el pool cierra con el hijo vivo y escribiendo en
# los artefactos del ítem. Si este caso dejara de reproducirlo, el caso 1 no
# mediría nada. La segunda defensa (I3 en la publicación) sigue en pie: con
# el hijo escribiendo, el ítem no se publica y su stream queda en el runtime.
mkdir -p "$F/undrained/src"
cp -R "$ROOT/src/session" "$ROOT/src/lib" "$F/undrained/src/"
gawk -i inplace '/^ *# >>> item-drain/{skip=1} !skip{print} /^ *# <<< item-drain/{skip=0}' \
  "$F/undrained/src/session/headless-pool.sh"
check "control: el bloque de drenaje se retiró" \
  "$(grep -c 'item-drain' "$F/undrained/src/session/headless-pool.sh")" 0
start_case "$F/undrained" undrained 30
wait "$POOL_PID"
check "control: sin drenaje el pool cierra con el hijo vivo" "$(alive "$CHILD_PID" && echo yes || echo no)" yes
undrained_stream="$(compgen -G "$F/undrained.runtime/pool/*/1.stream.jsonl")"
check "control: y el hijo sigue escribiendo en el stream del ítem" \
  "$(bash "$ROOT/bin/writer_inspector" "$undrained_stream" >/dev/null; echo $?)" 1
check "control: con el escritor vivo, la publicación rehúsa y el ítem no se cierra" \
  "$(test -e "$F/undrained.out/1.closed" && echo cerrado || echo sin-cerrar)" sin-cerrar
release_child undrained
timeout 10 tail --pid="$CHILD_PID" -f /dev/null

echo "result: $((total - failures)) of $total assertions green"
[[ "$failures" -eq 0 ]]
