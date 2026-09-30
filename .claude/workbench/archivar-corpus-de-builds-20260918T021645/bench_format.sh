#!/usr/bin/env bash
# Mide el cociente de compresion de los formatos disponibles sobre una build real.
# Se ejecuta UNO a la vez y se borra cada archivo antes del siguiente: el disco
# esta al 95 % y un benchmark que lo llene mide otra cosa.
set -uo pipefail
SUBJECT="${1:?falta la build}"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CORPUS_DIR="$ROOT/_references/claude-code-bin"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/bench-XXXXXX")"
trap 'rm -rf "$WORK_DIR"' EXIT

RAW_BYTES=$(du -sb "$CORPUS_DIR/$SUBJECT" | cut -f1)
printf 'sujeto\t%s\n' "$SUBJECT"
printf 'crudo_bytes\t%s\n' "$RAW_BYTES"

measure() {
  local label="$1"; shift
  local target="$WORK_DIR/x"
  local t0 t1 byte_count
  t0=$(date +%s)
  if tar -C "$CORPUS_DIR" -cf - "$SUBJECT" 2>/dev/null | "$@" > "$target" 2>/dev/null; then
    t1=$(date +%s)
    byte_count=$(stat -c%s "$target")
    printf '%s\t%s\t%s\t%s\n' "$label" "$byte_count" \
      "$(awk -v c="$RAW_BYTES" -v b="$byte_count" 'BEGIN{printf "%.2f", c/b}')" \
      "$((t1 - t0))"
  else
    printf '%s\tFALLO\t-\t-\n' "$label"
  fi
  rm -f "$target"
}

printf 'formato\tbytes\tcociente\tsegundos\n'
medir gzip-6      gzip -6
medir xz-6-T4     xz -6 -T4
medir xz-9-T2     xz -9 -T2
# 7z no lee de una tuberia a stdout con el mismo idioma: -si lo toma de stdin,
# -so lo escribe a stdout. Se le da el mismo tar por stdin que a los otros tres
# para que la comparacion sea de COMPRESOR, no de empaquetador.
medir 7z-mx9      7z a -txz -mx=9 -si -so dummy
