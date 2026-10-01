# model-residency-implementation

## El encargo

> «Con estas correcciones, sí: escribe las pruebas rojas y continúa con el paso 6 sobre:
> ExecutionGrant → podman-execution-primitive → ExecutionUnit → RuntimeAdapter → ModelResidency»
> (ejecutor, 2026-10-01; puerto: probeHealth, prepareRuntimeArtifact, verifyArtifactIdentity,
> loadResidency, observeResidency, unloadResidency)

## La premisa, si se corrigio al primer comando

La mitad roja está en `thyrox@77d900a2e` (contratos, dobles y pruebas). Este banco implementa
la mitad verde con `headless-pool --isolation worktree` y `pool_integrate`.

## Las piezas

| archivo | que hace |
|---|---|
| `template.md` | la instrucción común de cada ítem |
| `p1-residency-ledger.md` … `p4-ollama-adapter.md` | la fuente de verdad de cada ítem |
| `items.txt` | un ítem por línea |
| `probes/verify-item.sh` | el verify de cada ítem: rechaza tocar el contrato, corre sus suites y el typecheck |
| `launch.sh` | lanza el pool |

## Los resultados

*Metrica:* veredicto por ítem (`<n>.verdict`) y suites de cada paquete tras integrar.
*Ciega a:* el comportamiento contra Podman y Ollama reales; eso lo mide el E2E posterior.
