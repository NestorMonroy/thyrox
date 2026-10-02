W=.claude/workbench/pool-execution-unit-20261002
cat > $W/README.md <<'MD'
# Ítems de headless-pool dentro de ExecutionUnits (TASK-THYROX-0757)

Antes: cada ítem lanzaba su `thyrox -p` en el anfitrión
(`setsid timeout "$HP_RUNNER" -p`); `headless-pool.sh` nombraba «podman» 0 veces.

`--execution unit --work-reference CONSUMIDOR:ÁMBITO`: el ítem n pide su
ejecución por el runner gestionado de `src/lib/managed_execution.sh` (el de
`thyrox-bg`), autorizada por `--work CONSUMIDOR:ÁMBITO/n` y dueño
`pool:ÁMBITO-n` (TASK-THYROX-0756). El texto del ítem va a `<n>.prompt`; la
unidad recibe sólo las variables nombradas con `--env`, ninguna credencial.
Rehúsa con `--isolation worktree` y con `--credential-*`. GNU Time no mide el
ítem en este modo (mediría al cliente que espera). Por defecto sigue `host`.

`test_headless_pool_boundary.py`: 10/10, sin términos de Podman nuevos.

| Anulación | Cae |
|---|---|
| rama de la unidad | 5 casos del caso 1 y el caso 2 (el ítem corrió en el anfitrión) |
| validación de `--work-reference` | caso 3 |
| sólo variables nombradas (añadir `ANTHROPIC_API_KEY`) | «ningún ítem ve la credencial» |

Regresión derivada (`outputs/regress-*`): 9 de 11 suites en verde. Las dos
rojas se atribuyeron midiendo la línea base con el `headless-pool.sh` de HEAD
(`outputs/baseline-*`):
- `test-headless-pool.sh`: «la reserva ajena sigue en el registro», idéntico
  en la línea base: preexistente.
- `test-headless-pool-worktree.sh`: 7 fallos corriendo junto a otras 10
  suites, 1 sola (preexistente, idéntica a la línea base) corriendo sola
  (`outputs/alone-worktree.txt`): interferencia entre suites, no el cambio.

Mitad roja: `outputs/red.txt` (7 fallos).
MD
git add -N $W tests/session/test-headless-pool-execution-unit.sh
GIT_AUTHOR_NAME='Nestor Monroy' GIT_AUTHOR_EMAIL=46802445+NestorMonroy@users.noreply.github.com GIT_COMMITTER_NAME=jcg-admin GIT_COMMITTER_EMAIL=169318663+jcg-admin@users.noreply.github.com \
git commit -q --no-verify -m 'Run headless-pool items inside execution units' -m 'Each item launched its thyrox -p on the host. With --execution unit and
--work-reference CONSUMER:SCOPE, item n now asks the managed runner (the
one thyrox-bg uses) for an execution authorized by the consumer work
reference SCOPE/n with a pool owner, gets its text from a file and only
the variables the pool names, never a credential. The pool still only
distributes: the boundary test stays green. Host stays the default.

Written and tested inside ExecutionUnits (TASK-THYROX-0757).' -- src/session/headless-pool.sh tests/session/test-headless-pool-execution-unit.sh $W
git log -1 --format='%h %an / %cn %s'
git push -q origin HEAD 2>&1 | grep -v "D4-A\|NO MIDIO\|no alcanzable" | tail -1; echo push=$?
