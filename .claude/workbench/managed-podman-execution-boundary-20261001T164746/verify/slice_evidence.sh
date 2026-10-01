#!/usr/bin/env bash
# Verificación determinista genérica de un tramo: su evidencia existe y cada orden declarada sale 0.
# Uso: slice_evidence.sh <tramo> [--require <archivo-de-outputs>]... -- <orden>...
set -uo pipefail
wb="$(cd "$(dirname "$0")/.." && pwd)" slice="$1"; shift
cd /home/user/thyrox; fail=0; required=(red green annulment)
while [[ $# -gt 0 && "$1" != -- ]]; do [[ "$1" == --require ]] && required+=("$2"); shift 2; done
shift
for name in "${required[@]}"; do
  ls "$wb/outputs/$slice-$name"* >/dev/null 2>&1 || ls "$wb/outputs/$name" >/dev/null 2>&1 || { echo "FALLA falta outputs/$slice-$name"; fail=1; }
done
for command in "$@"; do
  bash -c "$command" >/dev/null 2>&1; code=$?
  echo "exit=$code  $command"; (( code == 0 )) || fail=1
done
exit "$fail"
