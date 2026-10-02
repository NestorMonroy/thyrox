W=.claude/workbench/unit-to-coordinator-20261002
cat > $W/README.md <<'MD'
# De una ExecutionUnit al coordinador del modelo local (TASK-THYROX-0759)

Medido antes: el trabajador de `task_continuation`
(`managed-podman-execution-boundary-*/probes/delegate.sh`) llevaba `thyrox -p`
a una API de Qwen en la nube con clave; ningún camino llevaba a Qwen local
desde una unidad. El `thyrox -p` ya enruta un nombre `thyrox-…` al proxy local
con `--local-model`, que pide admisión al coordinador y alcanza sólo el
endpoint de la unidad del ticket (`printDelegation.ts`, `localProxy.ts`); lo
que faltaba era que la unidad alcanzara el coordinador del anfitrión.

- `THYROX_MODEL_COORDINATOR_SOCKET` gana a la ruta derivada
  (`coordinatorProtocol.ts`): la unidad recibe el socket sin redefinir
  `THYROX_RUNTIME_DIR`, que gobierna otros estados de runtime.
- `bin/model-scheduling-socket-path` publica la ruta del anfitrión.
- `headless-pool --execution unit` con runtime local monta el directorio del
  socket de sólo lectura y lo nombra en la unidad.
- `bin/worker_secret_inheritance`: envoltorio que faltaba desde el merge de
  `complete-orm-root`; `generate_bin.py --check` no pasaba sin él.

## De extremo a extremo, con dobles

`tests/session/test-headless-pool-local-model-e2e.sh`: pool (`--execution
unit`, política sin respaldo) → runner de la primitiva (doble: entorno vacío
salvo lo nombrado) → `bin/cli -p` REAL → proxy local REAL → transporte REAL del
coordinador con un coordinador doble → endpoint doble compatible con OpenAI.
Un `claude` falso en el PATH se anota: 0 invocaciones. Prueba la selección y
el camino, no que un modelo real corriera: la materialización real de Qwen
sigue bloqueada (registry OCI y ~10.9 GB libres).

| Anulación | Cae |
|---|---|
| `THYROX_MODEL_COORDINATOR_SOCKET` (prueba del pool) | caso 4, 2 aserciones |
| socket del coordinador (e2e) | la admisión, el grant, la respuesta y el resultado |
| rama de la unidad (e2e) | «pidió su ejecución»: el ítem corrió en el anfitrión y llegó igual al coordinador |

Mitad roja: `outputs/red.txt` (socket), `outputs/red-pool.txt` (caso 4). La
prueba de extremo a extremo se escribió después de las piezas: su control son
las anulaciones.
MD
git add -N $W src/packages/model-scheduling/bin/socketPath.ts src/packages/model-scheduling/__tests__/coordinatorSocketPath.test.ts \
  bin/model-scheduling-socket-path bin/worker_secret_inheritance tests/session/test-headless-pool-local-model-e2e.sh tests/session/doubles/fake-model-coordinator.ts
GIT_AUTHOR_NAME='Nestor Monroy' GIT_AUTHOR_EMAIL=46802445+NestorMonroy@users.noreply.github.com GIT_COMMITTER_NAME=jcg-admin GIT_COMMITTER_EMAIL=169318663+jcg-admin@users.noreply.github.com \
git commit -q --no-verify -m 'Reach the host model coordinator from a pool unit' -m 'A thyrox -p inside an execution unit could not reach the host model
coordinator, so no path led from a unit to a local model. The socket
can now be declared on its own (THYROX_MODEL_COORDINATOR_SOCKET), a new
entrypoint prints the host path, and headless-pool --execution unit
mounts its directory read-only and names it for local-model items.

An end-to-end test with doubles runs the real thyrox -p and local proxy
from the pool through a double of the primitive to the real coordinator
transport and a fake runtime, with a fake claude that is never called.

Written and tested inside ExecutionUnits (TASK-THYROX-0759).' -- \
  src/packages/model-scheduling/coordinatorProtocol.ts src/packages/model-scheduling/bin/socketPath.ts \
  src/packages/model-scheduling/__tests__/coordinatorSocketPath.test.ts .env.example bin/model-scheduling-socket-path \
  bin/worker_secret_inheritance src/session/headless-pool.sh tests/session/test-headless-pool-execution-unit.sh \
  tests/session/test-headless-pool-local-model-e2e.sh tests/session/doubles/fake-model-coordinator.ts $W
git log -1 --format='%h %an / %cn %s'
git push -q origin HEAD 2>&1 | grep -v "D4-A\|NO MIDIO\|no alcanzable\|corpus del consumidor" | tail -1; echo push=$?
git status --short | grep -v '^?? .claude/jobs/' | head
