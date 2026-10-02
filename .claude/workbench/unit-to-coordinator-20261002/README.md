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
