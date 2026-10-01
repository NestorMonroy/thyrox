#!/usr/bin/env bash
# Censo de hogares: las claves de directorio del contrato (.env.example), si el
# registro de declaraciones las lista, y si existen en un clon recién bajado.
set -uo pipefail
cd "${THYROX_ROOT:-/home/user/thyrox}" || exit 2
fresh=$(mktemp -d)
trap 'rm -rf "${fresh:?}"' EXIT
git clone -q --no-hardlinks . "$fresh/clone" || exit 2
registry=$(bash bin/declarations 2>/dev/null | gawk '{for (i=1;i<=NF;i++) if ($i ~ /^THYROX_/) print $i}' | sort -u)
printf 'clave\tregistrada\n'
gawk -F= '/^THYROX_[A-Z_]*(_DIR|_HOME|_LEDGER|_ROOT)=/{print $1}' .env.example | sort -u | while read -r key; do
  printf '%s\t%s\n' "$key" "$(grep -qx "$key" <<<"$registry" && echo si || echo no)"
done
echo "== directorios de hogar ignorados por git y su presencia en un clon nuevo"
for dir in .claude/cache .claude/jobs .claude/jobs-ledger .claude/build-logs .claude/logs .claude/workbench .thyrox/runtime .thyrox/pool-worktrees; do
  printf '%s\tignorado=%s\ten_clon=%s\n' "$dir" \
    "$(git check-ignore -q "$dir/x" && echo si || echo no)" \
    "$([ -d "$fresh/clone/$dir" ] && echo si || echo no)"
done
