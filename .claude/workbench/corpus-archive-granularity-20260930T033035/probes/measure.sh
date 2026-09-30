#!/usr/bin/env bash
# Compara un .7z sólido por versión contra uno sólido para dos versiones
# consecutivas, con los mismos parámetros que archive_build_corpus.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
out="$(mktemp -d "${THYROX_CACHE_DIR:-.claude/cache}/archive-granularity.XXXXXX")"
trap 'rm -rf "${out:?}"' EXIT
cd _references/claude-code-bin
for v in 2.1.281 2.1.282; do
  /usr/bin/time -f "$v per-version %e s" 7z a -t7z -mx=9 "$out/$v.7z" "$v" >/dev/null
  printf '%s per-version %s B\n' "$v" "$(stat -c %s "$out/$v.7z")"
done
/usr/bin/time -f "joint %e s" 7z a -t7z -mx=9 "$out/joint.7z" 2.1.281 2.1.282 >/dev/null
printf 'joint %s B\n' "$(stat -c %s "$out/joint.7z")"
du -sb 2.1.281 2.1.282
