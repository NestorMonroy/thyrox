#!/usr/bin/env bash
# La pregunta del ejecutor es «.7z por archivo, o cual es mejor?». Se responde
# midiendo las tres formas sobre la MISMA build, no razonando sobre formatos:
#   solido      un solo flujo, el compresor ve la redundancia ENTRE archivos
#   por-archivo un contenedor por archivo, cada uno arranca su diccionario de cero
# El eje que decide no es el formato (.7z y .tar.xz comparten LZMA2) sino si el
# archivado es solido. Por eso las dos ultimas filas usan el MISMO algoritmo.
set -uo pipefail
SUBJECT="${1:?falta la build}"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CORPUS_DIR="$ROOT/_references/claude-code-bin"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/bench7z-XXXXXX")"
trap 'rm -rf "$WORK_DIR"' EXIT

RAW_BYTES=$(du -sb "$CORPUS_DIR/$SUBJECT" | cut -f1)
FILE_COUNT=$(find "$CORPUS_DIR/$SUBJECT" -type f | wc -l)
printf 'sujeto\t%s\ncrudo_bytes\t%s\narchivos\t%s\n\n' "$SUBJECT" "$RAW_BYTES" "$FILE_COUNT"
printf 'forma\tbytes\tcociente\tsegundos\n'

row() { printf '%s\t%s\t%s\t%s\n' "$1" "$2" \
  "$(awk -v c="$RAW_BYTES" -v b="$2" 'BEGIN{printf "%.2f", c/b}')" "$3"; }

t0=$(date +%s)
7z a -t7z -mx=9 "$WORK_DIR/solido.7z" "$CORPUS_DIR/$SUBJECT" >/dev/null 2>&1
row "7z-solido-mx9" "$(stat -c%s "$WORK_DIR/solido.7z")" "$(( $(date +%s) - t0 ))"
rm -f "$WORK_DIR/solido.7z"

t0=$(date +%s)
tar -C "$CORPUS_DIR" -cf - "$SUBJECT" | xz -9e -T2 > "$WORK_DIR/solido.tar.xz" 2>/dev/null
row "tar.xz-9e-solido" "$(stat -c%s "$WORK_DIR/solido.tar.xz")" "$(( $(date +%s) - t0 ))"
rm -f "$WORK_DIR/solido.tar.xz"

# Por archivo: la forma que la pregunta propone. Cada 7z arranca su diccionario
# desde cero, asi que la redundancia entre los 1800 chunks del bundle no se
# aprovecha. El total es la SUMA, que es lo que ocuparia el directorio.
t0=$(date +%s)
mkdir -p "$WORK_DIR/porarchivo"
find "$CORPUS_DIR/$SUBJECT" -type f -print0 \
  | xargs -0 -P4 -I{} sh -c '7z a -t7z -mx=9 "$1/$(basename "$2").7z" "$2" >/dev/null 2>&1' _ "$WORK_DIR/porarchivo" {}
row "7z-por-archivo-mx9" "$(du -sb "$WORK_DIR/porarchivo" | cut -f1)" "$(( $(date +%s) - t0 ))"
