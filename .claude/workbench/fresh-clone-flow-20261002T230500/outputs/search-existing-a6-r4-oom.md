# Search Existing — primer error real de A6 r4

## Primer error (del upstream, conservado por `noteError`)

`admission_failed` en la etapa `load`: Ollama `/api/generate` respondió 500,
`llama-server process has terminated: signal: killed`. `dmesg`
(`evidence/a6-r4-oom/dmesg-oom.txt`): `CONSTRAINT_MEMCG`, cgroup `libpod`,
`anon-rss:8353044kB` (≈ 8157 MiB) contra el límite de la unidad de 8192 MiB.

## Cadena medida

| Paso | Autoridad | Comportamiento | Prueba |
|---|---|---|---|
| 1 | `src/session/headless-pool.sh` | recibe `--context-tokens 24663` y lo usa sólo para elegir el modelo | `rg context-tokens` en `localProxy.ts`/`printDelegation.ts`: 0 hits |
| 2 | `provider/src/proxy/openaiCompat/admittedUpstream.ts:76` | `admit({ requestId, client, model })` **sin `contextLength`** | lectura directa |
| 3 | `model-artifacts/modelResolver.ts:145` | `requested ?? entry.maxContextLength` → 40960 (catálogo de Qwen3-4B) | `local-models-catalog list --json` |
| 4 | `hostCoordinatorComposition.ts:95` | `OLLAMA_CONTEXT_LENGTH = grant.contextLength` | lectura directa |
| 5 | `hostCoordinatorComposition.ts:55` | `UNIT_LIMITS.memoryMib = 8192` | lectura directa |
| 6 | `modelResolver.ts` `memoryProfile` | se calcula y **nadie lo compara** con el límite de la unidad | `rg memoryProfile` fuera de tests: sólo el propio resolver |

Estimación con `estimateServingMemoryFromShape` (`evidence/a6-r4-oom/estimate.ts`):

| contexto | total |
|---|---|
| 24663 (lo que el ítem necesita) | 6106 MiB |
| 32768 (la cualificación que pasó) | 7246 MiB |
| 40960 (lo que el relé pidió por omisión) | **8398 MiB** > 8192 |

Esto explica por qué la cualificación a 32768 cupo y A6 no.

Métrica: lectura de código y estimación del propio paquete.
Ciega a: `ggufBytes` es un valor declarado a mano (≈ 2.5 GB del Q4_K_M), no
leído del catálogo (el `list --json` no expone el tamaño); el RSS real de
llama.cpp puede diferir del estimador en buffers de cómputo.

## Decisión

- **EXTEND `admittedUpstream.ts`** (autoridad dueña de la petición de
  admisión): debe pasar el `contextLength` que el ítem declaró. Falta el
  transporte de `--context-tokens` desde `headless-pool` hasta el relé
  (`thyrox -p` → `localProxy`). No se crea mecanismo nuevo.
- **EXTEND de la admisión de residencia** (secundario): `memoryProfile` ya
  existe y no se compara con `UNIT_LIMITS`; el fallo llega como un SIGKILL
  y no como un rechazo tipado. Se registra; no se toca ahora.
- **REUSE `UNIT_LIMITS` sin cambios**: subirlo ocultaría el defecto y el
  anfitrión tiene ≈ 8.8 GB libres.

Ninguna autoridad se modificó en este pase.
