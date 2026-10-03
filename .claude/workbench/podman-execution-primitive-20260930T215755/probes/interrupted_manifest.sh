#!/usr/bin/env bash
# Registra la procedencia de un diff parcial de un ítem cortado: ítem y run
# predecesores, commit base del worktree, ruta del worktree, SHA-256 del patch
# preservado y las cuatro vistas de sus archivos. El patch es evidencia
# inmutable; el worktree viejo, estado operativo abandonado.
# Uso: interrupted_manifest.sh <worktree> <run_dir> <item> <patch>
set -uo pipefail
wt="$1" run="$2" item="$3" patch="$4"
manifest="${patch%.patch}.manifest"
{
  echo "predecessor_run: $run"
  echo "predecessor_item: $item"
  echo "worktree: $wt"
  echo "base_commit: $(git -C "$wt" rev-parse HEAD)"
  echo "patch: $patch"
  echo "patch_sha256: $(sha256sum "$patch" | cut -d' ' -f1)"
  echo "## git status --short"
  git -C "$wt" status --short
  echo "## git diff --name-only HEAD"
  git -C "$wt" diff --name-only HEAD
  echo "## git ls-files --others --exclude-standard"
  git -C "$wt" ls-files --others --exclude-standard
  echo "## archivos del patch"
  gawk '/^diff --git /{sub(/^b\//,"",$4); print $4}' "$patch"
} > "$manifest"
echo "$manifest"
