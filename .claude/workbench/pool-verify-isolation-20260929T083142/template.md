Implementas en thyrox (bash), en TDD, el aislamiento del paso de verificación de un ítem de
`headless-pool --isolation worktree`. El `Item:` de abajo nombra los archivos que te pertenecen; no
toques ningún otro. Edita con `sed`, `gawk` o `bash bin/replace_literal`, no reescribas archivos enteros.

El defecto, medido: `src/session/item_worktree.sh` (subcomando `finalize`) corre el `--verify` como
`(cd "$dir" && bash -c "$verify")`. El entorno lo hereda del pool, y `bin/headless-pool` exporta
`THYROX_ROOT=<árbol principal>` y `PYTHONPATH=<árbol principal>/src`. Un módulo que resuelve su
código por `THYROX_ROOT` (p. ej. `src/task/task_ids.py` a través de `paths/reach.py`) carga entonces
la copia del árbol PRINCIPAL, no la del worktree: el verify mide el código viejo y rechaza un cambio
correcto. Reproducción: el ítem de la tarea de identidad de tarjetas fue `rechazado` con 5 aserciones
caídas de `tests/task/test_task_ids.py`; la misma suite sobre el mismo parche en el árbol principal
pasa 74 de 74, y con `THYROX_ROOT` apuntando a un árbol sin el parche vuelven a caer las 5.

Lo que se pide:
1. Mitad roja primero: un caso nuevo en `tests/session/test-headless-pool-worktree.sh` cuyo `--verify`
   escribe `$THYROX_ROOT` y la primera entrada de `$PYTHONPATH` a un archivo fuera del worktree, y
   comprueba que las dos apuntan al worktree del ítem (no a `$MAIN_ROOT`). Debe fallar con el código
   actual; guarda esa salida roja en tu respuesta.
2. Arreglo en `finalize`: el verify corre con `THYROX_ROOT="$dir"` y `PYTHONPATH="$dir/src"`
   (reemplazando la ruta del árbol principal, no anteponiendo), sin tocar el resto del entorno.
3. Control de anulación: retirar el arreglo hace caer exactamente el caso nuevo y ninguno más.
4. Comentarios en español sin coloquialismos; identificadores en inglés.

Criterio de cierre: `bash tests/session/test-headless-pool-worktree.sh` y
`bash tests/session/test-headless-pool.sh` en verde.
