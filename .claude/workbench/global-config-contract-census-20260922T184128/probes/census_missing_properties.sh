#!/usr/bin/env bash
set -euo pipefail
root="${1:-.}"
log="${2:?usage: census_missing_properties.sh ROOT TSC_LOG}"
output="${3:?usage: census_missing_properties.sh ROOT TSC_LOG OUTPUT}"
properties=$(sed -n "s/.*Property '\([^']*\)' does not exist on type '\(GlobalConfig\|ProjectConfig\)'.*/\1/p" "$log" | sort -u)
export root
printf '%s\n' "$properties" | parallel --jobs 40 --keep-order --line-buffer '
  printf "=== %s ===\\n" "{}"
  rg -n --glob "*.ts" --glob "*.tsx" "\\b{}\\b" "$root/src" || true
' > "$output"
