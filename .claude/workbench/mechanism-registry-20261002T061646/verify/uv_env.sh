#!/usr/bin/env bash
# El entorno de Python de un árbol de trabajo es SIEMPRE el que gestiona uv, nunca el python3 del
# sistema. Un worktree no trae .venv; como pyproject.toml declara
# `package = false`, el .venv sólo contiene las dependencias del lock y el código propio se resuelve
# por PYTHONPATH, así que el .venv del clon principal sirve si y sólo si el uv.lock es idéntico.
# Uso: uv_env.sh <raíz del árbol> <raíz del clon principal>
# Salida: 0 el árbol corre con el intérprete de uv · 2 no se puede garantizar (lock distinto o sin .venv).
set -uo pipefail
tree="${1:?falta la raíz del árbol}" main="${2:?falta la raíz del clon principal}"
if [[ ! -e "$tree/.venv" ]]; then
  cmp -s "$tree/uv.lock" "$main/uv.lock" \
    || { echo "uv_env: uv.lock del árbol difiere del principal; no se reutiliza su .venv" >&2; exit 2; }
  [[ -x "$main/.venv/bin/python" ]] || { echo "uv_env: el clon principal no tiene .venv de uv (uv sync)" >&2; exit 2; }
  ln -s "$main/.venv" "$tree/.venv"
fi
interpreter="$(cd "$tree" && uv run --frozen --no-sync python -c 'import sys; print(sys.prefix)')" \
  || { echo "uv_env: uv run no resolvió un intérprete en $tree" >&2; exit 2; }
[[ "$(readlink -f "$interpreter")" == "$(readlink -f "$main/.venv")" ]] \
  || { echo "uv_env: el intérprete ($interpreter) no es el .venv de uv" >&2; exit 2; }
echo "uv_env: $tree corre con $(readlink -f "$main/.venv")"
