#!/usr/bin/env bash
# headless-pool con --execution unit (TASK-THYROX-0772): cada ítem pide una
# ejecución a la primitiva por el runner gestionado y no lanza su `thyrox -p`
# en el anfitrión. Dobles: el recomendador (modelo local), el ensure de
# Ollama, el ejecutor de ítems y el runner de la primitiva.
#
# Qué haría fallar a esta suite:
# - que un ítem corriera en el anfitrión aunque se pidiera la unidad;
# - que el ítem no llevara la referencia de trabajo del consumidor ni su dueño pool;
# - que el ítem recibiera una credencial del entorno del pool;
# - que --execution unit se aceptara sin referencia de trabajo.
set -uo pipefail
# Esta suite mide la mecánica del pool, no la política de ejecución: la declara
# sin restricción (sin ella regiría la versionada del árbol, que no admite respaldo).
THYROX_EXECUTION_POLICY="$(cd "$(dirname "${BASH_SOURCE[0]}")/../fixtures" && pwd)/execution_policy_unrestricted.json"
export THYROX_EXECUTION_POLICY
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
POOL="$ROOT/bin/headless-pool"
F="$(mktemp -d)"; trap 'rm -rf "$F"' EXIT
export THYROX_RUNTIME_DIR="$F/runtime"
PASS=0; FAIL=0
check() { if [[ "$2" == "$3" ]]; then PASS=$((PASS+1)); echo "  ok   $1"; else FAIL=$((FAIL+1)); echo "  FALLA $1 — esperado [$3] obtenido [$2]"; fi; }

printf 'Traduce el ítem.\n' > "$F/prompt.md"
cat > "$F/recommend" <<'R'
#!/usr/bin/env bash
echo '{"runtime":"ollama","model":"thyrox-qwen--qwen2.5-7b-instruct-gguf:q4_k_m-hf-bb5d59e06d95"}'
R
printf '#!/usr/bin/env bash\nexit 0\n' > "$F/ensure"
# El ejecutor de ítems: anota su argv, su entrada y si ve la credencial, y responde stream-json.
cat > "$F/thyrox-p" <<R
#!/usr/bin/env bash
item="\$(cat)"
printf '%s\t%s\t%s\n' "\$*" "\$(printf '%s' "\$item" | gawk '/^Item:/{print \$2}')" "\${ANTHROPIC_API_KEY:+credencial}" >> "$F/runner.log"
echo '{"type":"system","subtype":"init","tools":[]}'
echo '{"type":"result","subtype":"success","result":"ok","usage":{}}'
R
# El runner de la primitiva: anota la autorización y ejecuta el payload sólo con
# las variables que la autorización nombra con --env, como la unidad real.
cat > "$F/execute" <<R
#!/usr/bin/env bash
[[ "\$1" == run ]] || exit 2
args=(); keep=(); while [[ \$# -gt 0 && "\$1" != "--" ]]; do
  [[ "\$1" == --env ]] && keep+=("\$2=\${!2}"); args+=("\$1"); shift; done; shift
printf '%s\n' "\${args[*]}" >> "$F/execute.log"
exec env -i PATH="\$PATH" HOME="\$HOME" "\${keep[@]}" "\$@"
R
chmod +x "$F/recommend" "$F/ensure" "$F/thyrox-p" "$F/execute"
pool() {
  HEADLESS_POOL_RECOMMEND="$F/recommend" HEADLESS_POOL_INFRASTRUCTURE_ENSURE="$F/ensure" \
  HEADLESS_POOL_RUNNER="${HEADLESS_POOL_RUNNER:-$F/thyrox-p}" THYROX_MANAGED_EXECUTION_RUNNER="$F/execute" \
  HEADLESS_POOL_TIME="$F/no-existe" HEADLESS_POOL_HISTORY_DIR="$F/hist" ANTHROPIC_API_KEY=valor-del-anfitrion \
  bash "$POOL" --prompt "$F/prompt.md" --task-class analisis --width 2 "$@"
}

OUTPUT="$(printf 'alfa\nbeta\n' | pool --out "$F/out" --execution unit --work-reference ai-course-notes:cs224r 2>&1)"; CODE=$?
check "caso 1: el pool sale 0" "$CODE" "0"
check "caso 1: resumen" "$(printf '%s' "$OUTPUT" | gawk '/^items=/{print}')" "items=2 ok=2 fallidos=0"
check "caso 1: cada ítem pide su ejecución a la primitiva" "$(wc -l < "$F/execute.log" 2>/dev/null | tr -d ' ')" "2"
check "caso 1: con la referencia de trabajo del consumidor y dueño pool" \
  "$(gawk '{for(i=1;i<=NF;i++) if($i=="--work"||$i=="--owner") printf "%s %s;", $i, $(i+1); print ""}' "$F/execute.log" 2>/dev/null | sort | tr '\n' '|')" \
  "--work ai-course-notes:cs224r/1;--owner pool:cs224r-1;|--work ai-course-notes:cs224r/2;--owner pool:cs224r-2;|"
check "caso 1: el ejecutor corre dentro de la ejecución con el modelo local" \
  "$(cut -f1 "$F/runner.log" 2>/dev/null | gawk '{for(i=1;i<=NF;i++) if($i=="--model") print $(i+1)}' | sort -u)" \
  "thyrox-qwen--qwen2.5-7b-instruct-gguf:q4_k_m-hf-bb5d59e06d95"
check "caso 1: cada ítem recibe su texto" "$(cut -f2 "$F/runner.log" 2>/dev/null | sort | tr '\n' ' ')" "alfa beta "
check "caso 1: ningún ítem ve la credencial del anfitrión" "$(cut -f3 "$F/runner.log" 2>/dev/null | sort -u | tr -d '\n')" ""
check "caso 1: la autorización no pide secretos" "$(grep -c -- '--secret-from-env' "$F/execute.log" 2>/dev/null)" "0"

: > "$F/runner.log"
cat > "$F/execute" <<'R'
#!/usr/bin/env bash
exit 9
R
chmod +x "$F/execute"
printf 'alfa\n' | pool --out "$F/out-rehusa" --execution unit --work-reference ai-course-notes:cs224r >/dev/null 2>&1
check "caso 2: si la primitiva no ejecuta, nada corre en el anfitrión" "$(wc -l < "$F/runner.log" | tr -d ' ')" "0"

printf 'alfa\n' | pool --out "$F/out-sin-ref" --execution unit >/dev/null 2>&1; CODE=$?
check "caso 3: --execution unit sin referencia de trabajo se rehúsa con 2" "$CODE" "2"

# Caso 4 (TASK-THYROX-0774): con el modelo local, la unidad recibe el socket del
# coordinador del anfitrión —su directorio montado de sólo lectura y su ruta
# nombrada—, y nada más del runtime.
cat > "$F/execute" <<R
#!/usr/bin/env bash
[[ "\$1" == run ]] || exit 2
args=(); keep=(); while [[ \$# -gt 0 && "\$1" != "--" ]]; do
  [[ "\$1" == --env ]] && keep+=("\$2=\${!2}"); args+=("\$1"); shift; done; shift
printf '%s\n' "\${args[*]}" >> "$F/execute.log"
exec env -i PATH="\$PATH" HOME="\$HOME" "\${keep[@]}" "\$@"
R
chmod +x "$F/execute"
: > "$F/execute.log"; mkdir -p "$F/coord"
printf 'alfa\n' | THYROX_MODEL_COORDINATOR_SOCKET="$F/coord/coordinator.sock" \
  pool --out "$F/out-coord" --execution unit --work-reference ai-course-notes:cs224r >/dev/null 2>&1
check "caso 4: la unidad monta el directorio del socket de sólo lectura" \
  "$(grep -c -- "--mount $F/coord:$F/coord:ro" "$F/execute.log")" "1"
check "caso 4: y nombra el socket del coordinador" "$(grep -c -- '--env THYROX_MODEL_COORDINATOR_SOCKET' "$F/execute.log")" "1"
check "caso 4: no monta el runtime entero" "$(grep -c -- 'THYROX_RUNTIME_DIR' "$F/execute.log")" "0"

# Caso 4b (A6 r4): el contexto que el pool declara con --context-tokens llega
# a `thyrox -p` dentro de la unidad, que lo pasa a la admisión del proxy local.
# Sin él, el resolver cae al máximo del modelo y la unidad de modelo muere por
# OOM. El doble de `thyrox -p` anota la variable tal como la recibe.
cat > "$F/thyrox-p-context" <<R
#!/usr/bin/env bash
printf '%s\n' "\${THYROX_LOCAL_MODEL_CONTEXT_LENGTH:-ausente}" >> "$F/context.log"
R
chmod +x "$F/thyrox-p-context"
: > "$F/execute.log"; : > "$F/context.log"
printf 'alfa\n' | HEADLESS_POOL_RUNNER="$F/thyrox-p-context" THYROX_MODEL_COORDINATOR_SOCKET="$F/coord/coordinator.sock" \
  pool --out "$F/out-context" --execution unit --work-reference ai-course-notes:cs224r --context-tokens 24663 >/dev/null 2>&1
check "caso 4b: la unidad nombra la variable del contexto" \
  "$(grep -c -- '--env THYROX_LOCAL_MODEL_CONTEXT_LENGTH' "$F/execute.log")" "1"
check "caso 4b: thyrox -p recibe el contexto declarado" "$(cat "$F/context.log")" "24663"

# Caso 4c (A6 r7): la petición de `thyrox -p` a un modelo en CPU puede tardar
# minutos en su primer byte. Su plazo (API_TIMEOUT_MS, 600 s por defecto) no
# puede ser menor que el del ítem: el pool lo declara igual a --timeout, y una
# declaración previa gana.
cat > "$F/thyrox-p-timeout" <<R
#!/usr/bin/env bash
printf '%s\n' "\${API_TIMEOUT_MS:-ausente}" >> "$F/timeout.log"
R
chmod +x "$F/thyrox-p-timeout"
: > "$F/timeout.log"
printf 'alfa\n' | HEADLESS_POOL_RUNNER="$F/thyrox-p-timeout" \
  pool --out "$F/out-timeout" --execution unit --work-reference ai-course-notes:cs224r --timeout 1800 >/dev/null 2>&1
printf 'alfa\n' | API_TIMEOUT_MS=777 HEADLESS_POOL_RUNNER="$F/thyrox-p-timeout" \
  pool --out "$F/out-timeout-declared" --execution unit --work-reference ai-course-notes:cs224r --timeout 1800 >/dev/null 2>&1
check "caso 4c: el plazo de la petición es el del ítem, y uno declarado gana" "$(tr '\n' ' ' < "$F/timeout.log")" "1800000 777 "

# Caso 4d (A6 r8): el pool acota el prompt de sistema de sus ítems. 20 000 de
# los 25 468 tokens eran reglas siempre cargadas, y un modelo local en CPU
# paga cada token en prefill. Un presupuesto que no es entero se rehúsa.
cat > "$F/thyrox-p-argv" <<R
#!/usr/bin/env bash
printf '%s\n' "\$*" >> "$F/argv.log"
R
chmod +x "$F/thyrox-p-argv"
: > "$F/argv.log"
printf 'alfa\n' | HEADLESS_POOL_RUNNER="$F/thyrox-p-argv" \
  pool --out "$F/out-budget" --execution unit --work-reference ai-course-notes:cs224r --system-budget-tokens 8000 >/dev/null 2>&1
check "caso 4d: el ítem recibe --system-budget-tokens" "$(grep -c -- '--system-budget-tokens 8000' "$F/argv.log")" "1"
printf 'alfa\n' | pool --out "$F/out-budget-bad" --execution unit --work-reference ai-course-notes:cs224r --system-budget-tokens mucho >/dev/null 2>&1; CODE=$?
check "caso 4d: un presupuesto que no es entero se rehúsa con 2" "$CODE" "2"

# Caso 5: la identidad del consumidor se reconstruye desde la evidencia publicada.
# El runner real imprime `execution <contenedor> kind=… work=<ref>` por stderr
# (executionCommand.test.ts); el doble repite esa línea, y el pool tiene que
# conservarla en el `.err` del ítem, junto al índice n → ítem.
cat > "$F/execute" <<R
#!/usr/bin/env bash
[[ "\$1" == run ]] || exit 2
args=(); keep=(); work=""; while [[ \$# -gt 0 && "\$1" != "--" ]]; do
  [[ "\$1" == --env ]] && keep+=("\$2=\${!2}"); [[ "\$1" == --work ]] && work="\$2"; args+=("\$1"); shift; done; shift
printf '%s\n' "\${args[*]}" >> "$F/execute.log"
env -i PATH="\$PATH" HOME="\$HOME" "\${keep[@]}" "\$@"; code=\$?
echo "execution thyrox-worker-maintenance-doble kind=maintenance work=\$work exit=\$code" >&2
exit \$code
R
chmod +x "$F/execute"
printf 'alfa\nbeta\n' | pool --out "$F/out-ident" --execution unit --work-reference ai-course-notes:es-mx/cs224r/translate/20261002T000000 >/dev/null 2>&1
check "caso 5: el .err de cada ítem conserva su referencia de trabajo" \
  "$(cat "$F/out-ident/1.err" "$F/out-ident/2.err" 2>/dev/null | gawk '/^execution /{for(i=1;i<=NF;i++) if($i ~ /^work=/) print $i}' | sort | tr '\n' ' ')" \
  "work=ai-course-notes:es-mx/cs224r/translate/20261002T000000/1 work=ai-course-notes:es-mx/cs224r/translate/20261002T000000/2 "

# Caso 6 (TASK-THYROX-0919): un ítem que implementa corre en la unidad
# gestionada Y en su worktree aislado. El runner monta la raíz principal
# (THYROX_ROOT del runner); dentro de la unidad, THYROX_ROOT es el worktree
# del ítem y el envoltorio de git va primero en el PATH, como en el anfitrión.
# La verificación y la finalización corren en el anfitrión al salir el ítem.
git init -q "$F/repo" && git -C "$F/repo" -c user.email=t@t -c user.name=t commit -q --allow-empty -m base
export THYROX_POOL_WORKTREES_DIR="$F/worktrees"
cat > "$F/execute" <<R
#!/usr/bin/env bash
[[ "\$1" == run ]] || exit 2
args=(); keep=(); while [[ \$# -gt 0 && "\$1" != "--" ]]; do
  [[ "\$1" == --env ]] && keep+=("\$2=\${!2}"); args+=("\$1"); shift; done; shift
printf '%s\n' "\${args[*]}" >> "$F/execute.log"
printf 'runner-root=%s\n' "\$THYROX_ROOT" >> "$F/execute.log"
exec env -i PATH="\$PATH" HOME="\$HOME" "\${keep[@]}" "\$@"
R
cat > "$F/thyrox-p-implements" <<R
#!/usr/bin/env bash
printf 'item-root=%s\nguard=%s\n' "\$THYROX_ROOT" "\$(command -v git)" >> "$F/item.log"
printf 'hola\n' > a.txt
R
chmod +x "$F/execute" "$F/thyrox-p-implements"
: > "$F/execute.log"; : > "$F/item.log"
printf 'alfa\n' | (cd "$F/repo" && HEADLESS_POOL_RUNNER="$F/thyrox-p-implements" \
  pool --out "$F/out-wt" --execution unit --work-reference thyrox:task-0919 \
       --isolation worktree --verify 'test "$(cat a.txt)" = hola') >/dev/null 2>&1; CODE=$?
check "caso 6: --execution unit con --isolation worktree no se rehúsa" "$CODE" "0"
check "caso 6: el runner monta la raíz principal, no el worktree" \
  "$(gawk -F= '/^runner-root=/{print $2}' "$F/execute.log")" "$ROOT"
check "caso 6: dentro de la unidad, THYROX_ROOT es el worktree del ítem" \
  "$(gawk -F= '/^item-root=/{print ($2 ~ "^'"$F"'/worktrees/") ? "worktree" : $2}' "$F/item.log")" "worktree"
check "caso 6: el envoltorio de git va primero en el PATH de la unidad" \
  "$(gawk -F= '/^guard=/{print ($2 ~ /item_git_guard\/git$/) ? "guarda" : $2}' "$F/item.log")" "guarda"
check "caso 6: el verifier corre en el anfitrión y el veredicto es verificado" "$(cat "$F/out-wt/1.verdict" 2>/dev/null)" "verificado"
check "caso 6: el parche trae el archivo que escribió el ítem" "$(cat "$F/out-wt/1.files" 2>/dev/null)" "a.txt"
check "caso 6: la unidad nombra THYROX_POOL_ITEM_ROOT y THYROX_POOL_ITEM_GIT_GUARD_DIR" \
  "$(grep -c -- "--env THYROX_POOL_ITEM_ROOT --env THYROX_POOL_ITEM_GIT_GUARD_DIR" "$F/execute.log")" "1"
git -C "$F/repo" worktree prune 2>/dev/null
unset THYROX_POOL_WORKTREES_DIR

echo; echo "$PASS ok · $FAIL falla(s) (alcance medido: headless-pool --execution unit)"
[[ $FAIL -eq 0 ]]
