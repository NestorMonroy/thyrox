#!/usr/bin/env bash
# Censa que modulos de ccnmt/packages NO tienen contraparte en thyrox/src/packages.
# SOLO LEE: emite a stdout. El unico consumidor decide si redirige.
set -euo pipefail
REF="${1:-/home/user/claude-code-nestor-monroy-tools/packages}"
MIO="${2:-/home/user/thyrox/src/packages}"

# La ruta relativa de un modulo es su identidad. ccnmt tiene dos formas de
# paquete —con src/ y sin el— y thyrox conserva la misma, asi que la
# comparacion es literal y no normaliza nada.
cd "$REF" && find . -type f \( -name '*.ts' -o -name '*.tsx' \) \
    -not -path '*/node_modules/*' | sed 's|^\./||' | sort
