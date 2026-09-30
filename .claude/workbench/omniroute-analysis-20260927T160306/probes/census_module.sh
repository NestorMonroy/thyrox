#!/usr/bin/env bash
# Censo de un módulo de OmniRoute: archivos fuente, líneas y archivos de prueba.
set -euo pipefail
f="$1"
src=$(find "$f" -name '*.ts' ! -name '*.test.ts' ! -path '*__tests__*' -print0 | xargs -0 -r cat | wc -l)
n=$(find "$f" -name '*.ts' ! -name '*.test.ts' ! -path '*__tests__*' | wc -l)
t=$(find "$f" -name '*.ts' \( -name '*.test.ts' -o -path '*__tests__*' \) | wc -l)
printf '%s\t%s\t%s\t%s\n' "$f" "$n" "$src" "$t"
