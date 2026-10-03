#!/usr/bin/env bash
# El verify de repo-code-change@1: corre desde la raíz del worktree del ítem.
# Aprueba sólo si las pruebas pasan Y title_slug reutiliza slugify en vez de
# duplicar su normalización (la mitad «buscar lo existente» del flujo).
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")" || exit 2
python3 -m unittest textkit.test_slug || exit 1
body="$(gawk '/^def title_slug/{inside=1; next} inside && /^def /{inside=0} inside' textkit/slug.py)"
grep -q 'slugify(' <<<"$body" || { echo "title_slug no reutiliza slugify" >&2; exit 1; }
if grep -qE 'unicodedata|_SEPARATOR_RUN|re\.sub' <<<"$body"; then
    echo "title_slug duplica la normalización de slugify" >&2; exit 1
fi
