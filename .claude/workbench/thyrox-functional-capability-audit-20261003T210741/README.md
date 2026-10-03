# thyrox-functional-capability-audit

## El encargo

<!-- verbatim, sin parafrasear -->

## La premisa, si se corrigio al primer comando

## Las piezas

| archivo | que hace |
|---|---|

## Los resultados

*Metrica:*
*Ciega a:*

## TASK-THYROX-0928 — convergencia tras reciclado (fase 2)

Search Existing: REUSE `podman_lock_recovery` (`--classify` mide, `--after-reboot` repara),
`infrastructure_ensure`, `podman-execution-execute reconcile-orphans`, `model_coordinator start|status`;
EXTEND `local_control_plane_ready.sh`, que ya las componía a medias. Ningún gestor nuevo.

- `--help` imprime el uso y no llama a nada (antes llegaba a la recuperación: el episodio de la
  auditoría); `--status` sólo clasifica y pregunta al coordinador (exit 0 listo / 1 no);
  la convergencia sigue con `reconcile-orphans` y el coordinador, cortando con la salida del paso
  que falle.
- Rojo `outputs/red-0928.txt` (13 fallas, el caso 10 reproduce el incidente); verde 46/46;
  anulaciones `outputs/annul-0928.txt` (help 2, status 3, pasos de runtime 7).
- Real (`outputs/real-0928-*`): 0/13 → 13/13 HEALTHY; postgres, redis y ollama recreados y
  sanos con sus volúmenes preservados; 0 huérfanos; coordinador sano; `--status` 0; pids reales.

## TASK-THYROX-0930 — localidad garantizada (fase 4)

Search Existing: REUSE `decidePrintRoute`, `tunnelEnv` (ya retira credenciales propias),
`headless-pool --execution unit` (no entrega credenciales), `item_worktree finalize` (veredictos).
EXTEND, sin autoridad nueva.

- Un modelo `thyrox-*` se decide ANTES de la credencial: proxy declarado, lanzado, o el túnel ya
  declarado (local). Nunca `own` con una credencial remota.
- `thyrox -p` deja `served-by {"model","route","local"}` en stderr.
- `headless-pool --local-only`: exige `--execution unit`, un runtime local, y no cae al proveedor
  ni con Ollama caído; exporta `THYROX_POOL_LOCAL_ONLY=1`, y `finalize` da `no-local` al ítem
  sin servicio local declarado (o con alguno remoto), pase o no su verify.
- Rojo `outputs/red-0930-*`; verde; anulaciones `outputs/annul-0930.txt`: ruta 3, served-by 1,
  finalize 2, unidad 3, runtime 2, ensure 2.

## TASK-THYROX-0929 — disco (fase 3)

Clasificación por digest (`outputs/04-artifacts.txt`): CANONICAL_DURABLE el artefacto OCI en
docker.io/th3rox/thyrox-quantization-lab-artifacts; CACHE `.thyrox/models/artifacts`;
RUNTIME_MATERIALIZATION el blob servido por Ollama; BUILD_INTERMEDIATE el scratch de import y
publicación; ORPHAN el blob parcial `3e4cb141…`.

- El ORPHAN lo retiró Ollama al arrancar (su poda de capas sin manifiesto): REUSE, sin acción.
- El BUILD_INTERMEDIATE se retiró tras probar (`disk/proof-before-delete.txt`): mismo digest en
  caché y registry, ninguna ruta lo nombra, ningún descriptor abierto. Se conservan logs y recibos.
- 15 imágenes sin dueño por `podman-execution-execute remove-image --task TASK-THYROX-0929`
  (`disk/remove-images.txt`): dos `rmi` retiraron toda la cadena de padres colgantes.
- Se conservan: task-runner (`THYROX_EXEC_IMAGE`), base llama.cpp por digest, cuantizador permanente.
- Disco disponible: 4039.71 MiB (auditoría) → 6410.19 (tras recrear Ollama) → **8791.93 MiB**.
- Gap de ciclo de vida del scratch: NON_BLOCKING, TASK-THYROX-0936.

## Contrato de persistencia (desde 2026-10-03T23:26Z)

| término | qué es | dónde | mutabilidad |
|---|---|---|---|
| evidence | medición cruda | `outputs/` (sondas, rojos, anulaciones), `evidence/` | inmutable |
| experiment | resultado de una corrida real | `experiments/<id>/` (`experiment.json`, `runtime-profile.json`, `evidence.json`, `verdict.json`, sólo lectura) | inmutable |
| finding | problema identificado, id durable | `findings/<id>.md` (OBSERVATION · ASSESSMENT HISTORY · CURRENT ASSESSMENT) + store | historia append-only |
| assessment | interpretación que puede evolucionar | `capabilities/assessments.json` (con `transitions`) → `capabilities/<dominio>.md` | versionada |
| verdict | decisión vigente | `current_state` / `current_assessment` | — |
| snapshot | vista histórica congelada | `snapshots/` (sólo lectura, sha256 en el manifiesto) | inmutable |
| REPORT.md | vista consolidada **derivada** | `outputs/REPORT.md`, sólo la escribe `probes/assemble_report.py` | regenerable |

`manifest.jsonl` es la cronología append-only (`snapshot.created`,
`experiment.completed`, `report.generated`, …). `probes/check_report_coverage.py`
comprueba que ningún identificador del snapshot previo se perdió (anulación en
`outputs/annul-report-coverage.txt`). El store no guarda revisiones de un
hallazgo (H-THYROX-473): la historia vive en `findings/`.
