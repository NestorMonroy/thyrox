# TASK-THYROX-0645

## La tarea

Explicar y cerrar por qué el verify de un ítem aislado rechazó ítems sanos. Hallazgo H-THYROX-287 (`kaupamex-docs: source/gestion/pm/thyrox/iniciativas/implementar-ciclo-de-vida-del-pool-thyrox/hallazgos/`).

Pool A2 rechazó TASK-THYROX-0284 y 0261; aplicados en el árbol principal, pasan:

- 0284: en el worktree, `bin/check_package_typecheck --strict agent repl` dio `repl: 0 -> 28` tras «reconstruido por viejos: repl»; en el árbol principal, 0 errores. `agent` y `repl` dependen el uno del otro.
- 0261: en el worktree fallaron 2 de 124 casos de `tests/session/test_user_wiring.py` («el comando cableado carga todos los detectores sin PYTHONPATH» y «corre sin PYTHONPATH y calla fuera de una compactación»); en el árbol principal, 124/124.

**Tú corres dentro de un worktree del pool**, que es el entorno a medir: el tuyo vive en `.thyrox/pool-worktrees/<run>/<n>/`, dentro del árbol principal.

Qué hacer, en TDD con su control de anulación:

1. MEDIR desde tu worktree, antes de cambiar nada, y dejarlo en un banco `.claude/workbench/task-thyrox-0645-*/`:
   - a qué ruta real resuelve `@thyrox/agent` desde `src/packages/repl` (`node_modules` del worktree, del árbol principal o de dónde), qué hay en `node_modules/@thyrox/` del worktree y quién lo crea, y si `dist/` de `agent` en tu worktree existe y está sellado;
   - qué intérprete usa `bin/…` de Python en el worktree (no hay `.venv`) y por qué los dos casos de `test_user_wiring.py` fallan ahí.
2. Con la causa medida, corregirla donde viva (`src/session/item_worktree.sh`, `src/session/headless-pool.sh` bloque `item-root`, o `src/typescript/emit_declarations.py` / `src/verify/check_package_typecheck.py`) para que el verify de un worktree mida el código del worktree y no el del árbol principal. Una prueba que reproduzca la fuga y caiga sin el arreglo.
3. Si una causa no se puede cerrar en tu plazo, declararla con su condición de cierre en el banco.

## Archivos que te pertenecen

- `src/session/item_worktree.sh`, `src/typescript/emit_declarations.py`, `src/verify/check_package_typecheck.py` y sus pruebas en `tests/session/` y `tests/typescript/` / `tests/verify/`
- el banco nuevo `.claude/workbench/task-thyrox-0645-*/`

NO toques `src/session/headless-pool.sh` (otro ítem de este pool no lo toca, pero es compartido con los pools en curso): si la corrección vive ahí, descríbela en tu respuesta con el cambio exacto.

Si el trabajo exige tocar un archivo fuera de esta lista, no lo toques: dilo en tu respuesta con el archivo y la razón.
