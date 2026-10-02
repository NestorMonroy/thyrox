#!/usr/bin/env bash
# Gates de §5 del contrato: lo que el cambio NO puede introducir. Exit 0 limpio, 1 si alguno cae.
set -uo pipefail
root="$(git -C "$PWD" rev-parse --show-toplevel)"; cd "$root" || exit 2
rc=0
# provenanceNotes y la fuente no deciden elegibilidad, admisión ni scheduling.
hits="$(git grep --untracked -nE 'provenanceNotes' -- src/packages/provider src/packages/model-scheduling ':!**/__tests__/**' | wc -l)"
[[ "$hits" -eq 0 ]] || { echo "GATE provenanceNotes leído por política/scheduling: $hits"; rc=1; }
# Un solo lector GGUF: el de model-artifacts.
parsers="$(git grep --untracked -lE "'GGUF'|\"GGUF\"|b'GGUF'" -- src ':!src/packages/model-artifacts/ggufMetadata.ts' ':!**/__tests__/**' ':!**/dist/**' ':!**/testing/**' | wc -l)"
[[ "$parsers" -eq 0 ]] || { echo "GATE lector GGUF fuera de ggufMetadata.ts: $parsers archivo(s)"; rc=1; }
# Ningún hashing por tensor.
tensor="$(git grep --untracked -niE 'tensor.{0,20}sha256|sha256.{0,20}tensor' -- src ':!**/__tests__/**' ':!**/dist/**' | wc -l)"
[[ "$tensor" -eq 0 ]] || { echo "GATE hashing por tensor: $tensor línea(s)"; rc=1; }
echo "gates exit=$rc"; exit "$rc"
