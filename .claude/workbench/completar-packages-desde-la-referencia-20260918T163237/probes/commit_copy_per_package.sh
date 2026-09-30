#!/usr/bin/env bash
# Commitea la copia de ccnmt paquete por paquete. NO usa --no-verify: el
# veredicto de cada gate se recoge por paquete, que es lo que un commit
# unico de 1061 archivos no permite distinguir.
set -uo pipefail
cd /home/user/thyrox
ORDEN="daemon app-host swarm mcp-runtime output shell config command-runtime agent provider tool-registry cli"
for p in $ORDEN; do
  n=$(git status --porcelain --untracked-files=all -- "src/packages/$p" | wc -l)
  [ "$n" -eq 0 ] && { echo "SALTA $p (0 archivos)"; continue; }
  msg=$(cat <<MSG
Copiar los $n ausentes de $p desde la referencia

Los archivos llegan verbatim de \`ccnmt: packages/$p/\`: el cuerpo es el
de la fuente y no se toca en este commit. El alcance de sus
especificadores sigue siendo el del monorepo origen
(\`@claude-code-how-works/*\`); reescribirlo a \`@thyrox/*\` es el paso
siguiente y va en su propio commit, para que este quede como la copia
que un control de cuerpo puede comparar contra la fuente.

Refs: TASK-THYROX-0168
MSG
)
  for i in 1 2 3 4 5; do
    out=$(printf '%s' "$msg" | git commit -q -F - -- "src/packages/$p" 2>&1) && { echo "OK   $p ($n)"; break; }
    if printf '%s' "$out" | grep -q 'index.lock'; then sleep 1; continue; fi
    echo "FALLA $p ($n)"; printf '%s\n' "$out" | tail -25 | sed 's/^/     | /'
    break
  done
done
echo "=== restante sin commitear ==="
git status --porcelain --untracked-files=all -- src/packages | wc -l
