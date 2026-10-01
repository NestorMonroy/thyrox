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

### El mecanismo, en thyrox — dos señales que NO se confunden

El contrato del pool es: **un ítem no toca `refs/stash`, en ninguna forma**. Se hace cumplir con
dos señales de distinta naturaleza, y cada una sólo afirma lo que puede demostrar.

**Señal 1 — evidencia atribuible al ítem (barrera principal).**

1. Un envoltorio ejecutable llamado `git` en un directorio propio,
   `src/session/item_git_guard/git`. Resuelve el `git` real quitando su propio directorio del
   `PATH`. Si el subcomando —tras saltar las opciones globales `-C <dir>`, `-c k=v`,
   `--no-pager`, `--git-dir=…`, `--work-tree=…`— es `stash`, **cualquiera de sus formas**
   (`stash`, `stash list`, `stash show`, `stash create`, `stash store`…), rehúsa con exit 2,
   dice en stderr que el pool exige dejar los cambios en el working tree, y añade una línea con
   la orden rehusada al archivo que indica `THYROX_POOL_STASH_ATTEMPTS_FILE`. Cualquier otro
   subcomando: `exec` al git real con los mismos argumentos.
2. `src/session/headless-pool.sh`, en el bloque de aislamiento por worktree (donde ya exporta
   `THYROX_JOBS_DIR` para el ítem): antepone ese directorio al `PATH` del ítem y exporta
   `THYROX_POOL_STASH_ATTEMPTS_FILE="$HP_OUT/$n.stash-attempts"`.
3. `finalize`: si `<n>.stash-attempts` existe y no está vacío, el veredicto del ítem es
   `con-stash` (vocabulario de los existentes `sin-cambios`, `sin-verificar`), con precedencia
   sobre `sin-cambios`. Ésta es la única vía por la que un ítem recibe `con-stash`.

**Señal 2 — anomalía compartida del repositorio (detector secundario).**

4. `prepare` guarda la pila observada (`git stash list --format=%H`) y la marca de tiempo de
   inicio del ítem. `finalize` vuelve a leerla. Una entrada presente al final y ausente al
   inicio es una **anomalía compartida**: alguien que comparte el repositorio mutó `refs/stash`
   durante el intervalo del ítem. **No afirma que el ítem la creara.**
5. La evidencia de la anomalía es **de la ejecución, no del ítem**:
   `$HP_OUT/unexpected-stashes/<hash>.patch` (`git stash show -p --binary <hash>`) y
   `<hash>.meta` (hash, el mensaje de la entrada, primer ítem que la observó y el intervalo de
   cada ítem que la vio). Idempotente: si `<hash>.patch` ya existe, sólo se añade el ítem
   observador al `.meta`. **Nunca se borra ni se aplica una entrada de la pila.**
6. El ítem que la observó deja `<n>.shared-stash-anomaly` con los hashes. Su veredicto **no
   cambia** por eso.
7. `src/session/pool_integrate.sh`: no aplica un `con-stash`, y tampoco aplica
   automáticamente un ítem con `<n>.shared-stash-anomaly`: lo anota en `integration.tsv` con
   su motivo (`anomalia-stash-compartido` y los hashes) para revisión humana, porque su
   intervalo se solapó con una mutación que no se puede atribuir.

**Lo que el mecanismo no ve — escríbelo en la cabecera de `item_worktree.sh`:** la comparación
de la pila sólo detecta entradas **todavía observables en `finalize`**; no ve un stash creado y
retirado dentro del intervalo, ni un `git stash create` sin `store`, que crea el commit sin
actualizar `refs/stash`. Por eso la barrera es el envoltorio y el contrato, y la comparación es
un detector secundario, no una frontera.

### Variables y pruebas

- `THYROX_POOL_STASH_ATTEMPTS_FILE` es variable propia nueva: línea en `.env.example` con su
  comentario, y el gate de prefijo exige una prueba que la nombre.
- Prueba nueva `tests/session/test-item-worktree-stash.sh`, sin runner real (repo temporal,
  llamando a `item_worktree.sh` y al envoltorio directamente):
  (a) `git stash` por el envoltorio sale 2 y deja una línea en el archivo de intentos;
  (b) `git -C <dir> --no-pager stash list` y `git stash create` también se rehúsan;
  (c) `git status` pasa al git real;
  (d) un intento registrado da `con-stash` a ESE ítem;
  (e) dos ítems con intervalos solapados y un stash hecho con el git real por ruta absoluta:
      ninguno de los dos recibe `con-stash`, los dos dejan `<n>.shared-stash-anomaly`, hay UN
      solo `unexpected-stashes/<hash>.patch` con los dos observadores en su `.meta`, y la pila
      conserva la entrada;
  (f) sin stash, los veredictos existentes no cambian;
  (g) `pool_integrate.sh` no aplica ni un `con-stash` ni un ítem con anomalía, y los anota.
- No rompas `tests/session/test-headless-pool-worktree.sh` ni las `test-item-worktree-*.sh`.
- Controles de anulación: sin leer `<n>.stash-attempts` cae (d); si la anomalía se convierte en
  `con-stash` (la atribución que este diseño prohíbe) cae (e); sin el reconocimiento de `stash`
  tras opciones globales cae (b).
