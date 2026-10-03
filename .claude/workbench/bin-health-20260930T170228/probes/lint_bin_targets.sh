#!/usr/bin/env bash
# Pasa el lint del árbol (shellcheck, ruff, pyright) sobre los destinos .py y
# .sh de cada envoltorio de bin/, listados en outputs/bin_targets.tsv.
set -uo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)" || exit 2
bench="$(cd "$(dirname "$0")/.." && pwd)"
mapfile -t targets < <(gawk -F'\t' '$2 ~ /\.(py|sh)$/ {print $2}' "$bench/outputs/bin_targets.tsv" | sort -u)
bash bin/check_lint_zero "${targets[@]}"
