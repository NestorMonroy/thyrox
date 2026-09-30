#!/usr/bin/env bash
# Retira una a una las cuatro mitades de juicio de detect_unguarded_removal y dice qué pruebas caen.
set -uo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
F=src/hooks/detect_unguarded_removal.py
B="$(dirname "$0")/detect_unguarded_removal.py.orig"
cp "$F" "$B"
annul() {
  local name="$1" old="$2" new="$3"
  cp "$B" "$F"
  OLD="$old" NEW="$new" bash bin/replace_literal "$F" > /dev/null || { echo "$name: no se pudo anular"; return; }
  echo "== sin $name:"
  PYTHONDONTWRITEBYTECODE=1 timeout 60 uv run pytest -q -p no:cacheprovider tests/hooks/test_detect_unguarded_removal.py < /dev/null 2>&1 | grep -E "^FAILED|passed|failed" | sed 's/ - .*//'
}
annul "guarda :?" 'not (expansion.group(3) or "").startswith(":?")' 'True'
annul "clausula de varios pasos" 'if len(steps) > 1:' 'if False:'
annul "lectura del heredoc" 'if target in in_heredoc:' 'if False:'
annul "posicion de orden" '_REMOVAL = re.compile(r"(?:^|[;&|(\n]|\b(?:sudo|then|do|else))[ \t]*rm(?=[ \t])")' '_REMOVAL = re.compile(r"\brm(?=[ \t])")'
cp "$B" "$F"
git diff --no-index --quiet "$B" "$F" && echo "restaurado: idéntico al original"
