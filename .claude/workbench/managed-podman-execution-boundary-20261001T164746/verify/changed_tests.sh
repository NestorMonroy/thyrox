#!/usr/bin/env bash
# Las pruebas que el ítem añadió o cambió, derivadas del árbol y no de lo que el trabajador declara:
# rutas cambiadas con forma de prueba (tests/**, **/__tests__/**, tests/ del banco).
set -uo pipefail
root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)" || exit 2
git -C "$root" status --porcelain -uall | gawk '{ print $NF }' \
  | gawk '/(^|\/)tests\/.*\.(py|sh)$|\/__tests__\/.*\.test\.ts$/' | sort -u
