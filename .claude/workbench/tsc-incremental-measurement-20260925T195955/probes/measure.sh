#!/usr/bin/env bash
# Mide tsc completo contra tsc --incremental en el worktree de medición, en
# serie: cuatro tsc a la vez se estorban hasta 9x en 4 núcleos, y eso es
# justo lo que no se quiere medir. Cada forma deja su log de diagnósticos
# para comparar que la incremental no se salte errores.
set -u
MAIN=/home/user/thyrox
WT=/home/user/thyrox-medicion
OUT="$MAIN/$1"                       # outputs/ del banco
# Absoluta ANTES del cd al worktree: relativa, tsc la resolvería contra el
# worktree y el .tsbuildinfo acabaría fuera del cache del clon.
BUILDINFO_DIR="$(realpath -m "$2")"  # carpeta del cache para el .tsbuildinfo
EDIT_FILE=src/packages/repl/src/components/messages/AttachmentMessage.tsx
mkdir -p "$BUILDINFO_DIR"
BUILDINFO="$BUILDINFO_DIR/measurement-worktree.tsbuildinfo"
rm -f "$BUILDINFO"

python3 "$MAIN/src/verify/measure_worktree.py" prepare "$MAIN" "$WT"
cd "$WT" || exit 2
echo "HEAD del worktree: $(git rev-parse --short HEAD)" > "$OUT/context.txt"

run() {  # run <etiqueta> <args de tsc...>
  local label="$1"; shift
  local start end
  start=$(date +%s.%N)
  bunx tsc --noEmit -p tsconfig.json --pretty false "$@" > "$OUT/$label.log" 2>&1
  local rc=$?
  end=$(date +%s.%N)
  printf '%s\t%s\t%.1f\t%s\n' "$label" "$rc" "$(echo "$end - $start" | bc)" \
    "$(grep -c 'error TS' "$OUT/$label.log")" >> "$OUT/timing.tsv"
}

printf 'forma\texit\tsegundos\terrores\n' > "$OUT/timing.tsv"
run full
run incremental-cold --incremental --tsBuildInfoFile "$BUILDINFO"
ls -la "$BUILDINFO" >> "$OUT/context.txt"
run incremental-warm --incremental --tsBuildInfoFile "$BUILDINFO"
cp "$EDIT_FILE" "$OUT/edit-file.orig"
printf '\n// medición incremental\n' >> "$EDIT_FILE"
run incremental-after-edit --incremental --tsBuildInfoFile "$BUILDINFO"
cp "$OUT/edit-file.orig" "$EDIT_FILE"
rm "$OUT/edit-file.orig"
git -C "$WT" diff --stat -- "$EDIT_FILE" >> "$OUT/context.txt"
echo "__MEASURE_DONE__"
