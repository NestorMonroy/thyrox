#!/usr/bin/env bash
# Activa los githooks de THYROX en ESTE clon.
#
# `core.hooksPath` vive en `.git/config`, que no se versiona: un clon nuevo
# tiene los hooks escritos en `.githooks/` y git no los mira. Sin este guion la
# activacion depende de que alguien la recuerde, y eso ya fallo una vez — ver
# H-DOCS-249 en `kaupamex-docs`, mismo defecto en otro clon.
set -euo pipefail

RAIZ="$(git rev-parse --show-toplevel)"
git -C "$RAIZ" config core.hooksPath .githooks
echo "core.hooksPath = $(git -C "$RAIZ" config core.hooksPath)"
echo "hooks activos:"
for h in "$RAIZ"/.githooks/*; do
    [[ -x "$h" ]] && echo "  $(basename "$h")" || echo "  $(basename "$h")  (SIN permiso de ejecucion)"
done
