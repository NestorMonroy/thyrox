# model-scheduling-implementation

## El encargo

> Ahora sí procede implementar. […] 3. Escribe primero las pruebas rojas de estas invariantes.
> 4. Implementa `ModelSchedulingCoordination` con adapter in-process y Redis. 5. Implementa/termina
> `ModelScheduler → ExecutionGrant`. 6. Implementa la integración obligatoria:
> `ExecutionGrant → podman-execution-primitive → ExecutionUnit`. […]

Directiva del ejecutor, 2026-10-01. Decisión: ADR-007 1.10.0–1.12.0 (`kaupamex-docs@c52abc9fd`).

## La premisa, si se corrigio al primer comando

Se afirmó que thyrox carecía de fencing; medido, ya existía como generación en
`pool_lifecycle.py` (`StaleGenerationError`), lease global con latido en `runLease.ts` y
`residency.generation` en el grant. La 1.12.0 se reescribió para reutilizarlos
(`kaupamex-docs@c52abc9fd`).

## Las piezas

| archivo | que hace |
|---|---|
| `p1-coordination.md` | fuente del ítem 1: coordinación en memoria, Redis y fábrica por topología |
| `p2-ledger.md` | fuente del ítem 2: ledger de VRAM con fencing por generación |
| `p3-scheduler.md` | fuente del ítem 3: `ModelScheduler` con compensaciones y reconciliación |
| `items.txt`, `template.md`, `launch.sh`, `probes/verify-item.sh` | el pool 1 |

La mitad roja —contratos y 47 pruebas, 43 en rojo— es `thyrox@48bcd6316`. El verify rechaza el ítem
que toque una prueba, el contrato o los dobles.

## Los resultados

Pendiente.

*Metrica:* veredicto por ítem y suites del paquete tras integrar.
*Ciega a:* la materialización real por Podman y el adapter de Ollama, que son el ítem siguiente y
dependen de la topología de la unidad (A o B), decisión abierta del ejecutor.
