#!/usr/bin/env bash
# headless-pool con --execution unit (TASK-THYROX-0757): cada ítem pide una
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
  HEADLESS_POOL_RUNNER="$F/thyrox-p" THYROX_MANAGED_EXECUTION_RUNNER="$F/execute" \
  HEADLESS_POOL_TIME="$F/no-existe" HEADLESS_POOL_HISTORY_DIR="$F/hist" ANTHROPIC_API_KEY=valor-del-anfitrion \
  bash "$POOL" --prompt "$F/prompt.md" --task-class analisis --width 2 "$@"
}

SALIDA="$(printf 'alfa\nbeta\n' | pool --out "$F/out" --execution unit --work-reference ai-course-notes:cs224r 2>&1)"; CODE=$?
check "caso 1: el pool sale 0" "$CODE" "0"
check "caso 1: resumen" "$(printf '%s' "$SALIDA" | gawk '/^items=/{print}')" "items=2 ok=2 fallidos=0"
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

# Caso 4 (TASK-THYROX-0759): con el modelo local, la unidad recibe el socket del
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

echo; echo "$PASS ok · $FAIL falla(s) (alcance medido: headless-pool --execution unit)"
[[ $FAIL -eq 0 ]]
