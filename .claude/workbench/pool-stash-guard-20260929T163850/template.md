# El pool detecta y rehúsa que un ítem deje su trabajo en el stash (TASK-THYROX-0604)

Trabajas en un worktree de thyrox. **Identificadores, nombres de archivo, funciones, firmas y
variables en inglés; comentarios en español técnico, sin coloquialismos, con los términos
técnicos en inglés.** Clean code: funciones cortas con un solo propósito, nombres que dicen la
intención, sin comentarios que narren historial (eso es `git log`), sin código muerto. No
toques `_references/`, `agent-results/` ni `.claude/`. Operaciones de archivo por Bash (`sed`,
`gawk`, `bin/replace_literal`); una herramienta de `src/` por su envoltorio de `bin/`.

## Reglas, sin excepción

- **Prohibido `git stash`** en cualquier forma (irónico, pero es justo lo que arreglas).
- **Nada en segundo plano y nunca termines el turno para esperar algo.** Pruebas en primer
  plano, acotadas con `timeout`.
- TDD: la prueba primero, en rojo; luego el cambio. Cada mitad de juicio trae su **control de
  anulación**: retírala y comprueba que caen exactamente las aserciones que dependen de ella;
  restáurala y vuelve a verde. Informa las salidas.
- Tu último mensaje es un informe: qué cambiaste, las pruebas con su salida y lo que queda.

Tu ítem es el que dice `Item:` al final.

## Item `pool-stash-guard`

### El defecto

Un ítem de `headless-pool --isolation worktree` implementa en su propio worktree
(`src/session/item_worktree.sh`, `prepare`/`finalize`). `finalize` hace `git add -A` y exporta
el diff como `<n>.patch`. Si el ítem ejecuta `git stash`, su trabajo sale del working tree y el
parche queda vacío: el veredicto dice `sin-cambios` y el trabajo se pierde en silencio (H-THYROX-275).
Y `refs/stash` es **compartido** entre todos los worktrees del repositorio (git sólo separa por
worktree `refs/bisect`, `refs/worktree` y `refs/rewritten`), así que el stash del ítem cae en la
pila del árbol principal.

### El mecanismo, en thyrox

1. **Prevención.** Un envoltorio ejecutable llamado `git` en un directorio propio,
   `src/session/item_git_guard/git`. Resuelve el `git` real quitando su propio directorio del
   `PATH`. Si el subcomando —tras saltar las opciones globales como `-C <dir>`, `-c k=v`,
   `--no-pager`, `--git-dir=…`— es `stash`, **rehúsa con exit 2**, dice en stderr que el pool
   exige dejar los cambios en el working tree, y añade una línea al archivo que indica
   `THYROX_POOL_STASH_ATTEMPTS_FILE`. Cualquier otro subcomando: `exec` al git real con los
   mismos argumentos.
2. **Cableado.** En `src/session/headless-pool.sh`, dentro del bloque de aislamiento por
   worktree (donde ya exporta `THYROX_JOBS_DIR` para el ítem), antepone ese directorio al
   `PATH` del ítem y exporta `THYROX_POOL_STASH_ATTEMPTS_FILE="$HP_OUT/$n.stash-attempts"`.
3. **Detección.** `prepare` guarda la instantánea de la pila (`git stash list --format=%H`, vacía
   si no hay) en un archivo de la ejecución que `finalize` pueda leer. `finalize` compara: cada
   entrada nueva se exporta con `git stash show -p --binary <hash>` a `<n>.stash-<k>.patch` y su
   hash a `<n>.stash`. **Nunca se borra ni se aplica una entrada de la pila.**
4. **Veredicto.** Si hay entradas nuevas o intentos registrados, el veredicto es `con-stash`
   (mismo vocabulario que los existentes `sin-cambios`, `sin-verificar`) y tiene precedencia
   sobre `sin-cambios`. Documenta el veredicto nuevo en la cabecera de `item_worktree.sh`.
5. **Integración.** `src/session/pool_integrate.sh` no aplica un `con-stash`: lo escribe en
   `integration.tsv` con la ruta de sus parches de stash, para que quien integra decida.

Declara en el docstring lo que el mecanismo no ve: con varios ítems concurrentes, una entrada
nueva de la pila compartida no se puede atribuir con certeza a un ítem concreto; el registro de
intentos del envoltorio es la evidencia por ítem, y la comparación de la pila cubre a quien
esquive el envoltorio llamando al git por ruta absoluta.

### Variables y pruebas

- `THYROX_POOL_STASH_ATTEMPTS_FILE` es variable propia nueva: línea en `.env.example` con su
  comentario, y el gate de prefijo exige una prueba que la nombre.
- Prueba nueva `tests/session/test-item-worktree-stash.sh`, sin runner real (con un repo
  temporal y llamando a `item_worktree.sh` y al envoltorio directamente): (a) `git stash` por el
  envoltorio sale 2 y deja una línea en el archivo de intentos; (b) `git -C <dir> --no-pager
  stash list` también se rehúsa; (c) `git status` pasa al git real; (d) un stash hecho con el git
  real por ruta absoluta entre `prepare` y `finalize` da `con-stash`, exporta su parche y la
  pila conserva la entrada; (e) sin stash, los veredictos existentes no cambian;
  (f) `pool_integrate.sh` no aplica un `con-stash`.
- No rompas `tests/session/test-headless-pool-worktree.sh` ni las `test-item-worktree-*.sh`.
- Controles de anulación: sin la comparación de la pila cae (d); sin el reconocimiento de
  `stash` tras opciones globales cae (b).
