#!/usr/bin/env bash
# Anulación de las rutas relativas del build: el módulo vivo con la ruta
# absoluta, el test, y la restauración verificada con cmp. Corre DESPUÉS de la
# emisión real, nunca a la vez: ambos leen el mismo módulo.
set -uo pipefail
T=/home/user/thyrox; W="$T/.claude/workbench/tsconfig-build-20260926T222930"
M="$T/src/typescript/emit_declarations.py"
cp "$M" "$W/emit_declarations.pre-annulment.py"
OLD='        body["files"] = [os.path.relpath(BUILD_GLOBALS, package_dir)]' \
NEW='        body["files"] = [str(BUILD_GLOBALS)]' bash "$T/bin/replace_literal" "$M"
(cd "$T" && PYTHONDONTWRITEBYTECODE=1 python3 tests/typescript/test_emit_declarations.py) > "$W/annul-relpath.out" 2>&1
cp "$W/emit_declarations.pre-annulment.py" "$M"
cmp "$M" "$W/emit_declarations.pre-annulment.py" && echo "restaurado" >> "$W/annul-relpath.out"
