# De una ExecutionUnit al coordinador del modelo local (TASK-THYROX-0774)

## El encargo

<!-- verbatim, sin parafrasear -->

> ```
> C. headless-pool item dentro de ExecutionUnit
> D. Qwen-only sin fallback
> E. policy claude_enabled=false equivalente
> ```
>
> Además:
>
> ```
> no existe hoy un worker que:
> ExecutionUnit
> → Qwen local mediante coordinator
> ```
>
> Éstas son capacidades de Thyrox.
> No pertenecen a `ES_MX_TRANSLATION_PLAN.md`.
> Por tanto deben cerrarse como trabajo de proveedor antes de sustituir Claude en la traducción.
> 5. Implementa la frontera pool → ExecutionUnit
> La arquitectura actual:

## La premisa, si se corrigio al primer comando

Ninguna: el encargo se ejecutó tal como se pidió.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/p4/coordinatorSocketPath.test.ts` | borrador del cambio, tal como se aplicó |
| `probes/p4/impl.py` | borrador del cambio, tal como se aplicó |
| `probes/p4/pool-case.sh` | Caso 4 (TASK-THYROX-0774): con el modelo local, la unidad recibe el socket del |
| `probes/p4/pool-impl.py` | borrador del cambio, tal como se aplicó |
| `probes/p4/pool-impl2.py` | borrador del cambio, tal como se aplicó |
| `probes/p4/socketPath.ts` | borrador del cambio, tal como se aplicó |
| `probes/p5/fake-model-coordinator.ts` | borrador del cambio, tal como se aplicó |
| `probes/p5/finish.sh` | borrador del cambio, tal como se aplicó |
| `probes/p5/test-headless-pool-local-model-e2e.sh` | De extremo a extremo con dobles (TASK-THYROX-0774): un ítem del pool con |
| `outputs/` | 6 salidas: rojos, verdes y anulaciones |

## Los resultados

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

*Metrica:* aserciones rojas antes y las que caen al retirar cada guarda.
*Ciega a:* un modelo real admitido por el coordinador: el coordinador es un doble.
