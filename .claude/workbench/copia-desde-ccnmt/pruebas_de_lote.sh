#!/usr/bin/env bash
# Pruebas de conducta de un lote de copias: tsc no ve la conducta.
#
# 1. deriva las pruebas que importan cada archivo copiado (por nombre de
#    módulo en sus import) más las pruebas que son ellas mismas copias;
# 2. las corre una por proceso con el pool (en un solo proceso bun 1.3.11
#    murió con SIGILL en el lote 01);
# 3. las que fallan se repiten con las copias retiradas (versión de HEAD):
#    si también fallan ahí son preexistentes; si pasan, son regresión de la
#    copia. Las copias se restauran desde un tar y se verifican por hash.
#
# Uso: pruebas_de_lote.sh <banco-del-lote>   (lee <banco>/report.json)
# Salida: <banco>/regresiones.txt, una prueba por línea (vacía si ninguna).
set -euo pipefail
B=$1
python3 -c "import json,sys;print('\n'.join(json.load(open(sys.argv[1]))['files_kept']))" "$B/report.json" > "$B/copiados.txt"
sed 's|^|src/packages/|' "$B/copiados.txt" > "$B/copiados.paths"
: > "$B/pruebas-derivadas.txt"
while read -r f; do
  b=$(basename "$f"); b=${b%.tsx}; b=${b%.ts}
  grep -rlE "[/'\"]$b(\.js|\.ts|\.tsx)?['\"]" src/packages --include=*.test.ts --include=*.test.tsx 2>/dev/null | grep -v node_modules || true
done < "$B/copiados.txt" >> "$B/pruebas-derivadas.txt"
grep -E '\.test\.tsx?$' "$B/copiados.paths" >> "$B/pruebas-derivadas.txt" || true
sort -u -o "$B/pruebas-derivadas.txt" "$B/pruebas-derivadas.txt"
mkdir -p "$B/por-archivo"
gawk -v d="$B/por-archivo" '{n=$0; gsub(/[\/.]/,"_",n); printf "timeout 120 bun test %s > %s/%s.log 2>&1; echo exit=$? >> %s/%s.log\n", $0, d, n, d, n}' "$B/pruebas-derivadas.txt" > "$B/comandos.txt"
bash bin/run-task-pool --width 4 --timeout 1800 "$B/comandos.txt" > /dev/null
: > "$B/fallan.txt"
while read -r t; do
  n=$(echo "$t" | sed 's|[/.]|_|g')
  grep -qx "exit=0" "$B/por-archivo/$n.log" || echo "$t" >> "$B/fallan.txt"
done < "$B/pruebas-derivadas.txt"
: > "$B/regresiones.txt"
if [ -s "$B/fallan.txt" ]; then
  keep="$B/copias.tar"
  tar -cf "$keep" -T "$B/copiados.paths"
  xargs sha256sum < "$B/copiados.paths" > "$B/copias.sha"
  while read -r p; do git show "HEAD:$p" > "$p"; done < "$B/copiados.paths"
  mkdir -p "$B/base-head"
  while read -r t; do
    n=$(echo "$t" | sed 's|[/.]|_|g')
    timeout 120 bun test "$t" > "$B/base-head/$n.log" 2>&1 && echo "$t" >> "$B/regresiones.txt" || true
  done < "$B/fallan.txt"
  tar -xf "$keep"
  sha256sum -c --quiet "$B/copias.sha"
  rm -f "$keep"
fi
echo "pruebas: $(wc -l < "$B/pruebas-derivadas.txt") · fallan: $(wc -l < "$B/fallan.txt") · regresiones: $(wc -l < "$B/regresiones.txt")"
