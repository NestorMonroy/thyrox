#!/usr/bin/env bash
# Mide, en un worktree limpio desde HEAD, lo que cuesta darle al ítem sus
# dependencias por el build: bun install, el build JS de los 51 paquetes y su
# --check, y si la suite de thyrox -p del pool pasa con eso. No toca el árbol
# principal: todo ocurre bajo .thyrox/pool-worktrees/diag-build.
set -uo pipefail
T=/home/user/thyrox
D="$T/.thyrox/pool-worktrees/diag-build"
OUT="$(cd "$(dirname "$0")" && pwd)/measure.tsv"
: > "$OUT"
git -C "$T" worktree add -q --detach "$D" HEAD || exit 2
cd "$D" || exit 2
step() { local name="$1"; shift; local t0=$SECONDS; "$@" > "$OUT.$name.log" 2>&1; local rc=$?; printf '%s\t%s\t%ss\n' "$name" "$rc" "$((SECONDS-t0))" >> "$OUT"; }
step install bun install --frozen-lockfile
PKGS=(src/packages/*)
step build bash bin/typescript-build-javascript "${PKGS[@]}"
step check bash bin/typescript-build-javascript --check "${PKGS[@]}"
git status --porcelain | gawk '{print $2}' | sed 's|/[^/]*$||' | sort | uniq -c > "$OUT.status.txt"
step pool-thyrox-p env THYROX_ROOT="$D" PYTHONPATH="$D/src" bash tests/session/test-headless-pool-thyrox-p.sh
du -sh node_modules src/packages/*/dist 2>/dev/null | sort -h | tail -3 > "$OUT.du.txt"
echo "__DONE__" >> "$OUT"
