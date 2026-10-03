
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
