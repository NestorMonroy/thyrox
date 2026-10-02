
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
