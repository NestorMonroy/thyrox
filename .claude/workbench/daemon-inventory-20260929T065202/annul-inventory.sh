#!/usr/bin/env bash
# Retira las dos mitades de juicio de listTopLevelDeclarations y dice qué pruebas caen.
set -uo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
F=src/packages/binary/src/inventory.ts
B="$(dirname "$0")/inventory.ts.orig"
cp "$F" "$B"
annul() {
  cp "$B" "$F"
  OLD="$2" NEW="$3" bash bin/replace_literal "$F" > /dev/null || { echo "$1: no se pudo anular"; return; }
  echo "== sin $1:"
  (cd src/packages/binary && timeout 60 bun test __tests__/inventory.test.ts < /dev/null 2>&1 | grep -E "^\(fail\)| pass$| fail$")
}
annul "filtro de forma del evento" '&& EVENT.test(child.text)' '&& child.text.includes("tengu_")'
annul "solo sentencias del archivo" '  for (const statement of file.statements) {' '  const all: ts.Statement[] = []; const walk = (n: ts.Node): void => { if (ts.isFunctionDeclaration(n) || ts.isVariableStatement(n) || ts.isClassDeclaration(n)) all.push(n as ts.Statement); ts.forEachChild(n, walk) }; walk(file)
  for (const statement of all) {'
cp "$B" "$F"
git diff --no-index --quiet "$B" "$F" && echo "restaurado: idéntico al original"
