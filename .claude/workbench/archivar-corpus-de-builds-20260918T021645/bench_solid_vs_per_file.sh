#!/usr/bin/env bash
# El control anterior no discriminaba: 2.1.251 tiene DOS archivos, y con dos la
# redundancia entre archivos no existe. El eje solido/por-archivo solo se puede
# medir donde hay muchos, y el bundle de un build son ~1800 chunks del mismo
# minificador — el caso donde un diccionario compartido gana o no gana.
set -uo pipefail
SUBJECT="${1:?falta el directorio}"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/solido-XXXXXX")"
trap 'rm -rf "$WORK_DIR"' EXIT

RAW_BYTES=$(du -sb "$SUBJECT" | cut -f1)
N=$(find "$SUBJECT" -type f | wc -l)
printf 'sujeto\t%s\ncrudo_bytes\t%s\narchivos\t%s\n\n' "$SUBJECT" "$RAW_BYTES" "$N"
printf 'forma\tbytes\tcociente\tsegundos\n'
row() { printf '%s\t%s\t%s\t%s\n' "$1" "$2" \
  "$(awk -v c="$RAW_BYTES" -v b="$2" 'BEGIN{printf "%.2f", c/b}')" "$3"; }

t0=$(date +%s)
tar -cf - -C "$(dirname "$SUBJECT")" "$(basename "$SUBJECT")" | xz -9e -T2 > "$WORK_DIR/s.tar.xz" 2>/dev/null
row "tar.xz-9e-solido" "$(stat -c%s "$WORK_DIR/s.tar.xz")" "$(( $(date +%s) - t0 ))"
rm -f "$WORK_DIR/s.tar.xz"

t0=$(date +%s)
7z a -t7z -mx=9 "$WORK_DIR/s.7z" "$SUBJECT" >/dev/null 2>&1
row "7z-solido-mx9" "$(stat -c%s "$WORK_DIR/s.7z")" "$(( $(date +%s) - t0 ))"
rm -f "$WORK_DIR/s.7z"

t0=$(date +%s)
mkdir -p "$WORK_DIR/pa"
find "$SUBJECT" -type f -print0 \
  | xargs -0 -P4 -I{} sh -c '7z a -t7z -mx=9 "$1/$(basename "$2").7z" "$2" >/dev/null 2>&1' _ "$WORK_DIR/pa" {}
row "7z-por-archivo-mx9" "$(du -sb "$WORK_DIR/pa" | cut -f1)" "$(( $(date +%s) - t0 ))"
