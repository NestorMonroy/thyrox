#!/usr/bin/env bash
# Hipótesis: con --noEmit tsc no puede calcular la firma de declaración de un
# archivo, así que cualquier edición —hasta un comentario— invalida a todos
# sus dependientes. Con --declaration --emitDeclarationOnly la calcula, y una
# edición que no cambia la forma pública sólo revisa ese archivo. Misma
# edición y mismo worktree que measure.sh, en serie.
set -u
MAIN=/home/user/thyrox
WT=/home/user/thyrox-medicion
OUT="$(realpath -m "$MAIN/$1")"
BUILDINFO_DIR="$(realpath -m "$2")"
EDIT_FILE=src/packages/repl/src/components/messages/AttachmentMessage.tsx
DTS_DIR="$WT/.tsc-declaration-probe"      # desechable, fuera del clon
BUILDINFO="$BUILDINFO_DIR/measurement-worktree-declaration.tsbuildinfo"
mkdir -p "$BUILDINFO_DIR"; rm -rf "$DTS_DIR" "$BUILDINFO"
cd "$WT" || exit 2
FLAGS=(--incremental --tsBuildInfoFile "$BUILDINFO" --declaration --emitDeclarationOnly --outDir "$DTS_DIR" --rootDir "$WT")

run() {
  local label="$1"; shift
  local start end
  start=$(date +%s.%N)
  bunx tsc -p tsconfig.json --pretty false "$@" > "$OUT/$label.log" 2>&1
  local rc=$?
  end=$(date +%s.%N)
  printf '%s\t%s\t%.1f\t%s\n' "$label" "$rc" "$(echo "$end - $start" | bc)" \
    "$(grep -c 'error TS' "$OUT/$label.log")" >> "$OUT/timing.tsv"
}
run declaration-cold "${FLAGS[@]}"
cp "$EDIT_FILE" "$OUT/edit-file.orig"
printf '\n// medición incremental\n' >> "$EDIT_FILE"
run declaration-after-edit "${FLAGS[@]}"
cp "$OUT/edit-file.orig" "$EDIT_FILE"; rm "$OUT/edit-file.orig"
git -C "$WT" diff --stat -- "$EDIT_FILE" >> "$OUT/context.txt"
du -sh "$DTS_DIR" >> "$OUT/context.txt"; ls -la "$BUILDINFO" >> "$OUT/context.txt"
rm -rf "$DTS_DIR"
echo "__MEASURE_DONE__"
