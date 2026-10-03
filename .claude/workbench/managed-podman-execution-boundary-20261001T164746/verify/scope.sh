#!/usr/bin/env bash
# Gate de alcance del verificador: un ítem falla si cambió CUALQUIER ruta fuera de las que declara,
# aunque esa ruta no fuese a entrar en su commit (el commit por pathspec no es control de alcance).
# Admite además el banco y los registros que el plano de control escribe (jobs, caché, store).
# Uso: scope.sh <ítem> <ruta propia>...   Salida: 0 dentro del alcance · 1 fuera · 2 sin medir.
set -uo pipefail
item="$1"; shift
[[ $# -gt 0 ]] || { echo "scope: $item no declara rutas propias" >&2; exit 2; }
wb="$(cd "$(dirname "$0")/.." && pwd)"; root="$(git -C "$wb" rev-parse --show-toplevel)" || exit 2
bench="${wb#"$root"/}"
control_plane=("$bench" .claude/jobs .claude/cache agent-results/agent_store.sqlite3)
status="$(git -C "$root" status --porcelain -uall)" || { echo "scope: git status falló" >&2; exit 2; }
outside=()
while IFS= read -r line; do
  [[ -n "$line" ]] || continue
  path="${line:3}"; path="${path##* -> }"
  inside=0
  for allowed in "$@" "${control_plane[@]}"; do
    allowed="${allowed%/}"
    [[ "$path" == "$allowed" || "$path" == "$allowed"/* ]] && { inside=1; break; }
  done
  (( inside )) || outside+=("$path")
done <<< "$status"
total="$(grep -c . <<< "$status")"
if (( ${#outside[@]} > 0 )); then
  printf 'scope: %s cambió %d ruta(s) fuera de su alcance:\n' "$item" "${#outside[@]}"; printf '  %s\n' "${outside[@]}"
  exit 1
fi
echo "scope: $item dentro de su alcance (alcance medido: $total ruta(s) cambiada(s))"
