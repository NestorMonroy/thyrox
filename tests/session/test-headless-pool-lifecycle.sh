#!/usr/bin/env bash
# Suite del ciclo de vida de un pool sobre un banco versionado
# (TASK-THYROX-0618): el ítem vive en el runtime, fuera de git, y llega a la
# salida sólo publicado, con `<n>.closed` al final.
#
# El runner falso se detiene en una FIFO antes de escribir su resultado, así
# que la prueba observa el pool EN CURSO sin sleep.
#
# Casos:
#   1. (prueba 1, I1) con el pool en curso, `git status` del banco no cambia y
#      la salida no tiene nada del ítem; al cerrar, `<n>.closed`, `run.closed`
#      y un manifiesto coherente.
#   2. (prueba 9) los consumidores exigen `<n>.closed`: `pool_integrate` no
#      aplica un ítem sin cerrar, ni uno cuyo artefacto ya no coincide.
#   3. (prueba 13) un pool cancelado a mitad conserva su runtime; `reconcile`
#      lo declara recuperable y no borra nada, y la salida sigue sin el ítem.
#   4. la recuperación toma el ítem en curso con una generación nueva: el pool
#      conserva la anterior y su publicación se rehúsa.
#   5. (I4) con aislamiento por worktree, el pool desplazado no toma la foto de
#      su generación: ni ref, ni reemplazo del registro de foto del nuevo dueño.
#   6. (TASK-THYROX-0622) con THYROX_POOL_SNAPSHOT_INTERVAL_SECONDS, el ítem en
#      curso tiene foto antes de terminar, con el trabajo que lleva hecho; la
#      foto final la avanza y conserva lo último.
#   7. (TASK-THYROX-0640) la admisión por disco del worktree la declara la
#      suite, no el disco del anfitrión: con una reserva imposible y espera 0,
#      el pool rehúsa el ítem al instante en vez de esperar los 600 s del
#      default.
#   8. (TASK-THYROX-0672) el ítem recibe el buzón de la ejecución y su
#      dirección, su prompt empieza por el párrafo del buzón, un mensaje
#      enviado antes de que lea aparece como pendiente para él, y el
#      orquestador recibe un sobre por cada cambio del ciclo de vida.
#   Controles de anulación:
#   1c. con el runtime dentro del banco, el mismo pool ensucia `git status`.
#   2c. sin la guarda de `pool_integrate`, el ítem sin cerrar se aplica.
#   7c. con la espera declarada en segundos, el mismo rechazo tarda esa espera.
set -uo pipefail
# Esta suite mide la mecánica del pool, no la política de ejecución: la declara
# sin restricción (sin ella regiría la versionada del árbol, que no admite respaldo).
THYROX_EXECUTION_POLICY="$(cd "$(dirname "${BASH_SOURCE[0]}")/../fixtures" && pwd)/execution_policy_unrestricted.json"
export THYROX_EXECUTION_POLICY
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
failures=0; total=0
check() { total=$((total+1)); if [[ "$2" == "$3" ]]; then echo "OK   $1"; else echo "FAIL $1 — expected '$3', got '$2'"; failures=$((failures+1)); fi; }

F="$(mktemp -d)"; trap 'rm -rf "${F:?}"' EXIT
cat > "$F/runner" <<'SH'
#!/usr/bin/env bash
cat > "${LIFECYCLE_TEST_PROMPT:-/dev/null}"
jq -cn '{type:"system",subtype:"init"}'
[[ -z "${LIFECYCLE_TEST_WRITE:-}" ]] || echo "trabajo a mitad" > "$LIFECYCLE_TEST_WRITE"
echo started > "$LIFECYCLE_TEST_STARTED"
read -r _ < "$LIFECYCLE_TEST_RELEASE"
if [[ -n "${LIFECYCLE_TEST_INBOX:-}" ]]; then
  printf '%s\t%s\n' "${THYROX_MAILBOX_DIR:-sin}" "${THYROX_POOL_ITEM_ADDRESS:-sin}" > "$LIFECYCLE_TEST_INBOX.env"
  bash "$THYROX_ROOT/bin/inbox" --dir "$THYROX_MAILBOX_DIR" pending --as "$THYROX_POOL_ITEM_ADDRESS" \
    > "$LIFECYCLE_TEST_INBOX" 2>/dev/null
fi
jq -cn '{type:"result",subtype:"success",result:"done"}'
SH
chmod +x "$F/runner"
printf 'Read.\n' > "$F/prompt.md"

# La admisión por disco de un worktree se declara aquí y no se hereda del
# anfitrión: con su default (reserva 1024 MiB, espera 600 s) cada caso con
# worktree esperaba hasta diez minutos en una máquina con poco disco libre.
export THYROX_ITEM_WORKTREE_DISK_RESERVE_MB=0 THYROX_ITEM_WORKTREE_DISK_WAIT_SECONDS=0

# Un repositorio con un banco versionado y el runtime ignorado, como el árbol.
REPO="$F/repo"
BENCH=".claude/workbench/b"
git init -q "$REPO"
mkdir -p "$REPO/$BENCH"
printf 'banco\n' > "$REPO/$BENCH/README.md"
printf '/.thyrox/runtime/\n' > "$REPO/.gitignore"
git -C "$REPO" add -A && git -C "$REPO" -c user.name=t -c user.email=t@t commit -qm seed

# start_pool <label> <runtime-dir> [opciones del pool]: lanza el pool en una
# sesión propia y espera a que el ítem arranque.
start_pool() {
  local label="$1" runtime="$2"
  shift 2
  mkfifo "$F/$label.started" "$F/$label.release"
  printf 'one\n' | THYROX_ROOT="$ROOT" THYROX_RUNTIME_DIR="$runtime" \
      LIFECYCLE_TEST_STARTED="$F/$label.started" LIFECYCLE_TEST_RELEASE="$F/$label.release" \
      HEADLESS_POOL_RUNNER="$F/runner" HEADLESS_POOL_TIME="$F/no-time" \
      HEADLESS_POOL_HISTORY_DIR="$F/$label.history" HEADLESS_POOL_ITEM_DRAIN_SECONDS=5 \
      setsid bash "$ROOT/src/session/headless-pool.sh" --prompt "$F/prompt.md" \
          --out "$REPO/$BENCH/$label" --task-class analisis --width 1 "$@" > "$F/$label.log" 2>&1 &
  POOL_PID=$!
  exec {started_fd}<> "$F/$label.started"
  read -r -t 60 _ <&"$started_fd" || { echo "el ítem nunca arrancó:"; cat "$F/$label.log"; }
  exec {started_fd}<&-
}

release() {
  exec {release_fd}<> "$F/$1.release"
  echo go >&"$release_fd"
  exec {release_fd}>&-
}

bench_status() { git -C "$REPO" status --porcelain --untracked-files=all -- "$BENCH/$1" | wc -l; }
# El runtime del ítem 1 de una ejecución. Si el ítem no arrancó, la suite se
# detiene aquí: un `dirname` de una cadena vacía es `.`, y lo que se escribiera
# ahí caería en el directorio de trabajo, fuera del arnés.
live_dir() {
  local match
  match="$(compgen -G "$1/pool/*/1.stream.jsonl")" || { echo "ABORT: el ítem no dejó runtime en $1"; exit 1; }
  dirname "$match"
}

# --- caso 1: en curso no se publica nada; al cerrar, todo coherente ----------
start_pool run1 "$REPO/.thyrox/runtime"
check "en curso, git status del banco no cambia" "$(bench_status run1)" 0
check "en curso, la salida no tiene artefactos del ítem" \
  "$(compgen -G "$REPO/$BENCH/run1/1.*" | wc -l)" 0
check "en curso, el stream vive en el runtime" \
  "$(compgen -G "$REPO/.thyrox/runtime/pool/*/1.stream.jsonl" | wc -l)" 1
check "en curso, ningún consumidor ve el ítem" \
  "$(bash "$ROOT/bin/pool_lifecycle" closed-items "$REPO/$BENCH/run1" | wc -l)" 0
# El dueño registrado tiene que vivir lo que vive el ítem: si es un proceso
# efímero, `reconcile` declara abandonado a un ítem que sigue trabajando.
check "en curso, reconcile no toca al ítem vivo" \
  "$(THYROX_RUNTIME_DIR="$REPO/.thyrox/runtime" bash "$ROOT/bin/pool_lifecycle" reconcile | cut -f3)" "sin cambios (RUNNING)"
release run1
wait "$POOL_PID"; code=$?
check "el pool termina bien" "$code" 0
check "el ítem quedó cerrado" "$(bash "$ROOT/bin/pool_lifecycle" closed-items "$REPO/$BENCH/run1")" 1
check "su manifiesto coincide con la salida" \
  "$(bash "$ROOT/bin/pool_lifecycle" verify "$REPO/$BENCH/run1" 1)" coherente
check "la ejecución dejó run.closed" "$([[ -f "$REPO/$BENCH/run1/run.closed" ]] && echo yes)" yes
check "el runtime de la ejecución se retiró" "$(compgen -G "$REPO/.thyrox/runtime/pool/*/run.json" | wc -l)" 0
check "el resultado es el del ítem" "$(jq -r .result "$REPO/$BENCH/run1/1.json")" "done"

# --- caso 1c: control — el runtime dentro del banco ensucia git status -------
start_pool run1c "$REPO/$BENCH/runtime-inside"
check "control: con el runtime en el banco, git status cambia en curso" \
  "$([[ "$(git -C "$REPO" status --porcelain --untracked-files=all -- "$BENCH/runtime-inside" | wc -l)" -gt 0 ]] && echo yes)" yes
release run1c
wait "$POOL_PID"

# --- caso 2: los consumidores exigen <n>.closed (prueba 9) ------------------
TARGET="$F/target"
git init -q "$TARGET"
printf 'base\n' > "$TARGET/file.txt"
git -C "$TARGET" add -A && git -C "$TARGET" -c user.name=t -c user.email=t@t commit -qm base
make_unclosed_output() {
  local out="$1"
  mkdir -p "$out"
  printf '1\tone\n' > "$out/index.tsv"
  printf 'verificado\n' > "$out/1.verdict"
  printf 'file.txt\n' > "$out/1.files"
  (cd "$TARGET" && printf 'cambio\n' > file.txt && git diff > "$out/1.patch" && git checkout -q file.txt)
}
make_unclosed_output "$F/unclosed"
bash "$ROOT/src/session/pool_integrate.sh" "$F/unclosed" --repo "$TARGET" > /dev/null
check "pool_integrate no aplica un ítem sin cerrar" "$(cut -f2 "$F/unclosed/integration.tsv")" sin-cerrar
check "el árbol destino no cambió" "$(cat "$TARGET/file.txt")" base
# Un ítem cerrado cuyo artefacto se alteró después ya no es el que se cerró.
live="$(THYROX_RUNTIME_DIR="$F/rt2" bash "$ROOT/bin/pool_lifecycle" open-run "$F/tampered" --owner $$)"
THYROX_RUNTIME_DIR="$F/rt2" bash "$ROOT/bin/pool_lifecycle" begin "$live" "$F/tampered" 1 --owner $$ > /dev/null
make_unclosed_output "$F/staging"
cp "$F/staging/1.verdict" "$F/staging/1.files" "$F/staging/1.patch" "$live/"
THYROX_RUNTIME_DIR="$F/rt2" bash "$ROOT/bin/pool_lifecycle" publish "$live" "$F/tampered" 1 --exit 0
cp "$F/staging/index.tsv" "$F/tampered/"
printf 'otro\n' >> "$F/tampered/1.patch"
bash "$ROOT/src/session/pool_integrate.sh" "$F/tampered" --repo "$TARGET" > /dev/null
check "pool_integrate no aplica un ítem incoherente" "$(cut -f2 "$F/tampered/integration.tsv")" incoherente

# --- caso 2c: control — sin la guarda, el ítem sin cerrar se aplica ---------
mkdir -p "$F/ungated"
cp "$ROOT/src/session/pool_integrate.sh" "$F/ungated/pool_integrate.sh"
gawk -i inplace '/# >>> closed-gate/{skip=1} !skip{print} /# <<< closed-gate/{skip=0}' "$F/ungated/pool_integrate.sh"
check "control: la guarda se retiró" "$(grep -c 'closed-gate' "$F/ungated/pool_integrate.sh")" 0
make_unclosed_output "$F/unclosed2"
THYROX_ROOT="$ROOT" bash "$F/ungated/pool_integrate.sh" "$F/unclosed2" --repo "$TARGET" > /dev/null
check "control: sin la guarda, el ítem sin cerrar se aplica" "$(cut -f2 "$F/unclosed2/integration.tsv")" aplicado
git -C "$TARGET" checkout -q file.txt

# --- caso 3: un pool cancelado conserva su runtime (prueba 13) ---------------
start_pool run3 "$REPO/.thyrox/runtime"
live3="$(live_dir "$REPO/.thyrox/runtime")" || exit 1
kill -TERM -- "-$POOL_PID"
wait "$POOL_PID"
check "cancelado: la salida no tiene artefactos del ítem" \
  "$(compgen -G "$REPO/$BENCH/run3/1.*" | wc -l)" 0
check "cancelado: el runtime conserva el stream parcial" \
  "$(grep -c '"init"' "$live3/1.stream.jsonl")" 1
# El ítem corre en su propia sesión: se suelta para que salga y deje de escribir.
release run3
for pid in $(pgrep -f "$F/[r]unner"); do timeout 10 tail --pid="$pid" -f /dev/null; done
report="$(THYROX_RUNTIME_DIR="$REPO/.thyrox/runtime" bash "$ROOT/bin/pool_lifecycle" reconcile)"
check "reconcile declara el ítem recuperable" \
  "$(grep -c "	1	ABANDONED_RECOVERABLE" <<< "$report")" 1
check "reconcile no borró el runtime" "$([[ -f "$live3/1.stream.jsonl" ]] && echo yes)" yes
check "la salida sigue sin el ítem" "$(bash "$ROOT/bin/pool_lifecycle" closed-items "$REPO/$BENCH/run3" | wc -l)" 0

# --- caso 4: la recuperación toma el ítem en curso; el pool ya no lo publica -
# Mientras el ítem corre, otro actor lo declara abandonado y lo toma con una
# generación nueva. El pool conserva la anterior: su publicación se rehúsa.
start_pool run4 "$F/runtime4"
live4="$(live_dir "$F/runtime4")" || exit 1
THYROX_RUNTIME_DIR="$F/runtime4" bash "$ROOT/bin/pool_lifecycle" transition "$live4" 1 ABANDONED_RECOVERABLE
gen4="$(THYROX_RUNTIME_DIR="$F/runtime4" bash "$ROOT/bin/pool_lifecycle" claim "$live4" "$REPO/$BENCH/run4" 1 --owner $$)"
check "tomar el ítem en curso le da la generación 2" "$gen4" 2
release run4
wait "$POOL_PID"; code4=$?
check "el pool no termina bien" "$([[ "$code4" -ne 0 ]] && echo yes)" yes
check "el pool no publicó el ítem que ya no es suyo" \
  "$(bash "$ROOT/bin/pool_lifecycle" closed-items "$REPO/$BENCH/run4" | wc -l)" 0
check "el rechazo nombra la generación" \
  "$(grep -c 'generación 1 ya no puede actuar' "$live4/1.lifecycle.err")" 1
check "el ítem sigue a nombre del nuevo dueño" \
  "$(jq -r '"\(.generation) \(.owner_pid)"' "$live4/1.state.json")" "2 $$"

# --- caso 5 (I4): el pool desplazado no toma la foto de su generación --------
# El nuevo dueño ya registró su foto; el pool de la generación 1 sale después.
start_pool run5 "$F/runtime5" --isolation worktree --cwd "$REPO"
live5="$(live_dir "$F/runtime5")" || exit 1
THYROX_RUNTIME_DIR="$F/runtime5" bash "$ROOT/bin/pool_lifecycle" transition "$live5" 1 ABANDONED_RECOVERABLE
gen5="$(THYROX_RUNTIME_DIR="$F/runtime5" bash "$ROOT/bin/pool_lifecycle" claim "$live5" "$REPO/$BENCH/run5" 1 --owner $$)"
check "tomar el ítem con worktree le da la generación 2" "$gen5" 2
printf '{"generation": 2}\n' > "$live5/1.snapshot.json"
release run5
wait "$POOL_PID"
check "el registro de foto del nuevo dueño sigue intacto" "$(cat "$live5/1.snapshot.json")" '{"generation": 2}'
check "el pool desplazado no creó la ref de su generación" \
  "$(git -C "$REPO" for-each-ref --format='%(refname)' "refs/thyrox/snapshots/${live5##*/}/1/1")" ""
check "el pool declara que no toma la foto" \
  "$(grep -c 'no se toma su foto' "$live5/1.err")" 1

# --- caso 6: fotos periódicas mientras el ítem corre --------------------------
# El ítem deja trabajo en su worktree y se detiene en la FIFO. Con el intervalo
# declarado, la ref de su generación aparece antes de liberarlo.
LIFECYCLE_TEST_WRITE=mid-run.txt THYROX_POOL_SNAPSHOT_INTERVAL_SECONDS=1 \
  start_pool run6 "$F/runtime6" --isolation worktree --cwd "$REPO"
live6="$(live_dir "$F/runtime6")" || exit 1
ref6="refs/thyrox/snapshots/${live6##*/}/1/1"
mid6=""
for _ in $(seq 1 40); do
  mid6="$(git -C "$REPO" rev-parse --verify --quiet "$ref6")" && break
  sleep 0.25
done
check "en curso, el ítem ya tiene foto" "$([[ -n "$mid6" ]] && echo yes)" yes
check "la foto en curso trae el trabajo a mitad" \
  "$(git -C "$REPO" show "$mid6:mid-run.txt" 2>/dev/null)" "trabajo a mitad"
release run6
wait "$POOL_PID"
final6="$(git -C "$REPO" rev-parse --verify --quiet "$ref6")"
check "la foto final existe" "$([[ -n "$final6" ]] && echo yes)" yes
check "la foto final conserva el trabajo" "$(git -C "$REPO" show "$final6:mid-run.txt" 2>/dev/null)" "trabajo a mitad"
check "el manifiesto de la foto describe la final" \
  "$(THYROX_RUNTIME_DIR="$F/runtime6" bash "$ROOT/bin/snapshot_store" show "${live6##*/}" 1 1 | jq -r .snapshot_commit)" "$final6"

# --- caso 7 (TASK-THYROX-0640): la admisión por disco la declara la suite ---
# Con una reserva que ningún anfitrión tiene y la espera en 0, el pool rehúsa el
# ítem al instante: el veredicto sale de lo declarado, no del disco libre.
# refused_pool <label> [variables]: corre un pool con worktree en primer plano
# bajo una reserva imposible e imprime los segundos que tardó.
refused_pool() {
  local label="$1" started="$SECONDS"
  shift
  printf 'one\n' | env THYROX_ROOT="$ROOT" THYROX_RUNTIME_DIR="$F/$label.runtime" \
      LIFECYCLE_TEST_STARTED="$F/$label.started" LIFECYCLE_TEST_RELEASE="$F/$label.release" \
      HEADLESS_POOL_RUNNER="$F/runner" HEADLESS_POOL_TIME="$F/no-time" \
      HEADLESS_POOL_HISTORY_DIR="$F/$label.history" THYROX_ITEM_WORKTREE_DISK_RESERVE_MB=1000000000 "$@" \
      timeout 120 bash "$ROOT/src/session/headless-pool.sh" --prompt "$F/prompt.md" \
          --out "$REPO/$BENCH/$label" --task-class analisis --width 1 --isolation worktree --cwd "$REPO" \
          > "$F/$label.log" 2>&1
  echo $((SECONDS - started))
}
elapsed7="$(refused_pool run7)"
check "sin disco declarado, el ítem se rehúsa sin esperar" "$([[ "$elapsed7" -lt 10 ]] && echo yes)" yes
check "el rechazo nombra la admisión por disco" "$(grep -c 'no hay disco para el worktree' "$REPO/$BENCH/run7/1.err")" 1
check "el ítem rehusado quedó publicado" "$(bash "$ROOT/bin/pool_lifecycle" closed-items "$REPO/$BENCH/run7")" 1

# --- caso 7c: control — con la espera declarada, el rechazo tarda esa espera -
elapsed7c="$(refused_pool run7c THYROX_ITEM_WORKTREE_DISK_WAIT_SECONDS=6)"
check "control: con espera de 6 s, el rechazo tarda al menos 6 s" "$([[ "$elapsed7c" -ge 6 ]] && echo yes)" yes

# --- caso 8 (TASK-THYROX-0672): el ítem lee su buzón; el orquestador, el suyo -
LIFECYCLE_TEST_PROMPT="$F/run8.prompt" LIFECYCLE_TEST_INBOX="$F/run8.inbox" \
  start_pool run8 "$F/runtime8"
mailbox8="$(gawk 'sub(/^buzón: /, "")' "$F/run8.log")"
check "la cabecera publica el buzón de la ejecución" "$([[ -n "$mailbox8" && -d "$mailbox8" ]] && echo yes)" yes
bash "$ROOT/bin/inbox" --dir "$mailbox8" post --from orchestrator --to item-1 \
  --body "cambio de especificación" > /dev/null 2>&1
release run8
wait "$POOL_PID"; code8=$?
check "con un mensaje, el pool termina bien" "$code8" 0
check "el ítem recibe el buzón y su dirección" "$(cat "$F/run8.inbox.env" 2>/dev/null)" "$mailbox8	item-1"
check "el mensaje enviado antes de que el ítem leyera le aparece pendiente" \
  "$(jq -r '.[].body' "$F/run8.inbox" 2>/dev/null)" "cambio de especificación"
check "el prompt empieza por el párrafo del buzón" \
  "$(head -1 "$F/run8.prompt" | grep -c 'Buzón de esta ejecución')" 1
check "el párrafo dice cómo leer, acusar y escribir al orquestador" \
  "$(grep -cE 'pending --as "\$THYROX_POOL_ITEM_ADDRESS"|ack --as "\$THYROX_POOL_ITEM_ADDRESS"|post --from "\$THYROX_POOL_ITEM_ADDRESS" --to orchestrator' "$F/run8.prompt")" 3
check "la plantilla del usuario va después del párrafo y antes del ítem" \
  "$(gawk '/Buzón de esta ejecución/{p=NR} /^Read\.$/{t=NR} /^Item: one$/{i=NR} END{print (p && p < t && t < i) ? "yes" : "no"}' "$F/run8.prompt")" yes
check "el orquestador recibió begin, publish y close-run" \
  "$(bash "$ROOT/bin/inbox" --dir "$mailbox8" pending --as orchestrator 2>/dev/null \
      | jq -r '.[].body | fromjson | .event' | grep -cxE 'begin|publish|close-run')" 3

echo "result: $((total - failures)) of $total assertions green"
[[ "$failures" -eq 0 ]]
