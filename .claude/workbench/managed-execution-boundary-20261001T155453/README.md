# managed-execution-boundary

## El encargo

<!-- verbatim, sin parafrasear -->

## La premisa, si se corrigio al primer comando

## Las piezas

| archivo | que hace |
|---|---|

## Los resultados

*Metrica:*
*Ciega a:*

## Evidencia (2026-10-01)

Pregunta: ¿cada proceso de trabajo de una tarea gestionada vive en el
cgroup del contenedor que la primitiva creó para ese paso?

- `outputs/e2e-run-{1..5}.log` — `__tests__/executionUnit.real.test.ts`,
  cinco corridas seguidas: 4/4 cada una.
- Anulación: comparar cada paso contra el id del paso siguiente hace caer
  exactamente la aserción de cgroup (1 de 4).
- Medido en el camino: un proceso en `do_exit` (bandera PF_EXITING, 0x4 del
  campo 9 de `/proc/<pid>/stat`) ya tiene el cgroup desligado y se lee `/`,
  tanto en estado `Z` como en `R`. Excluir sólo `Z` dejaba un `sed` en `R`
  como falso positivo.
- `outputs/local-models-typecheck.log` — `tsc` de local-models tras
  regenerar `dist/`: los errores que quedan (`hostPids`, `BodyInit`) son
  previos a este cambio (`bb56ee2d3`, mitad roja).

Métrica: `libpod-<id>` de `/proc/<pid>/cgroup` contra el id que imprimió
`podman create`.
Ciega a: un proceso que nazca y muera entre dos muestras consecutivas.
