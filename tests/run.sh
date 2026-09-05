#!/usr/bin/env bash
# El corredor de las dos suites de THYROX.
#
# Existe porque el producto no es de un solo lenguaje y no tiene por que serlo:
# el criterio es por dominio, no uniforme. Ver README.md.
#
# Publica el conteo de cada mitad. Un corredor que sumara las dos en una cifra
# sola no dejaria ver cual quedo sin correr, que es el defecto que un verde sin
# denominador produce.
set -uo pipefail
cd "$(dirname "$0")/.."

failures=0
only="${1:-}"

if [ "$only" != "--python-only" ]; then
  echo "== TypeScript (bun) =="
  bun test tests/ || failures=$((failures + 1))
  echo
fi

if [ "$only" != "--ts-only" ]; then
  echo "== Python (stdlib) =="
  count=0
  while IFS= read -r suite; do
    count=$((count + 1))
    echo "-- $suite"
    python3 "$suite" || failures=$((failures + 1))
  done < <(find tests -name 'test_*.py' | sort)
  echo "  ($count suite(s) de Python)"
fi

if [ "$failures" -gt 0 ]; then
  echo
  echo "FALLA: $failures suite(s) en rojo"
  exit 1
fi
echo
echo "OK: las dos mitades en verde"
