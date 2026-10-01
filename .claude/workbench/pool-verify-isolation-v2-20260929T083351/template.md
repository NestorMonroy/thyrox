Implementas en thyrox (bash), en TDD, el aislamiento completo del paso de verificación de un ítem de
`headless-pool --isolation worktree`. El `Item:` de abajo nombra los archivos que te pertenecen; no
toques ningún otro. Edita con `sed`, `gawk` o `bash bin/replace_literal`, no reescribas archivos
enteros. Para Python usa `uv run --python 3.12 python`, nunca un binario del sistema directo.

El defecto, medido: `src/session/item_worktree.sh` (subcomando `finalize`) corre el `--verify` como
`(cd "$dir" && bash -c "$verify")`, con el entorno heredado del pool. `bin/headless-pool` exporta
`THYROX_ROOT=<árbol principal>` y `PYTHONPATH=<árbol principal>/src`, así que un módulo que resuelve
su código por `THYROX_ROOT` (p. ej. `src/task/task_ids.py` vía `paths/reach.py`) carga la copia del
árbol PRINCIPAL: el verify mide una mezcla de worktree y árbol principal. Reproducción: un ítem
correcto salió `rechazado` con 5 aserciones caídas; el mismo parche en el árbol principal pasa 74/74,
y con `THYROX_ROOT` apuntando a un árbol sin el parche vuelven exactamente esas 5.

Lo que se pide:
1. Mitad roja primero, en `tests/session/test-headless-pool-worktree.sh`, casos nuevos que demuestren
   que DURANTE el verify:
   a. el directorio de trabajo es el worktree del ítem;
   b. `THYROX_ROOT` es el worktree del ítem (no `$MAIN_ROOT`);
   c. `PYTHONPATH` no contiene ninguna ruta del árbol principal y su entrada `src` es la del worktree;
   d. modificar SOLO el árbol principal no cambia el veredicto: un verify que lee un archivo bajo
      `$THYROX_ROOT` da `verificado` aunque en el árbol principal ese archivo tenga otro contenido.
   El verify escribe lo que observa a un archivo fuera del worktree y el caso lo compara. Guarda la
   salida roja con el código actual en tu respuesta.
2. Arreglo en `finalize`: el verify corre con `THYROX_ROOT="$dir"` y `PYTHONPATH="$dir/src"`
   (reemplazando, no anteponiendo). Revisa si otra variable que el pool exporta resuelve código o
   rutas del árbol (`THYROX_ENV_FILE`, las de `bin/` generadas por `generate_bin.py`); si alguna
   apunta al árbol principal, derívala del worktree y cúbrela con un caso, o declara en tu respuesta
   por qué no afecta al verify.
3. Control de anulación: retirar el arreglo hace caer exactamente los casos nuevos y ninguno más;
   publica el conteo antes y después.
4. Comentarios en español sin coloquialismos; identificadores en inglés.

Criterio de cierre: `bash tests/session/test-headless-pool-worktree.sh` y
`bash tests/session/test-headless-pool.sh` en verde.
