# model-control-plane

Directiva del ejecutor 2026-09-30: thyrox es la autoridad del model
scheduling; Ollama y los demás runtimes son adapters. Registrado como ADR-007
enmienda 1.7.0 (`kaupamex-docs@fd4860384`).

## Medido

| Sonda | Resultado |
|---|---|
| `probes/ollama_autonomy_knobs.sh` → `outputs/ollama-autonomy-knobs.txt` | el binario 0.35.0 nombra `OLLAMA_MAX_LOADED_MODELS`, `KEEP_ALIVE`, `NUM_PARALLEL`, `SCHED_SPREAD`, `GPU_OVERHEAD`, `LOAD_TIMEOUT`, `CONTEXT_LENGTH`, `KV_CACHE_TYPE` y `CUDA_VISIBLE_DEVICES`/`HIP_VISIBLE_DEVICES`. Nombrar no prueba conducta |
| `probes/residency_control.sh` → `outputs/residency-control.txt` | `keep_alive: 0` descarga al terminar; `-1` deja residente sin caducidad; una petición vacía con `0` descarga sin generar. La residencia la puede ordenar thyrox por petición |
| ídem | `/api/ps` reporta `size_vram` 236 MB sin GPU: no es telemetría de VRAM |

## Orden de las tareas

```
TASK-THYROX-0691  GpuMemoryBackend + ledger por dispositivo y por tipo (worker|residency|request)
      │
      ├── TASK-THYROX-0697  ModelCatalog   (declarado; durable)
      └── TASK-THYROX-0698  ModelResolver  (artefacto exacto + perfil de memoria)
                 │
      TASK-THYROX-0699  ModelScheduler + ExecutionGrant (residencia, concurrencia, dispositivo)
                 │
      TASK-THYROX-0702  PodmanExecutionPrimitive materializa el grant (unidad de larga
                 │       vida, dispositivos del grant, dueño de residencia)
                 │
      ├── TASK-THYROX-0700  el proxy enruta por grant (N modelos)
      ├── TASK-THYROX-0701  RuntimeAdapter de Ollama: traduce, no decide; se reconcilia
      └── TASK-THYROX-0703  los runtimes se materializan por la primitiva (M2);
                            espera la decisión de topología del ejecutor
```

0697 y 0698 son disjuntos y van en paralelo por `headless-pool`; 0699 espera a
0691 integrado; 0702 puede avanzar en paralelo a 0699 (no decide placement);
0700, 0701 y 0703 esperan a 0699 y 0702. ADR-007 1.7.1 (`kaupamex-docs@e927fe1b9`)
pone la primitiva entre el grant y el adapter: decisión → scheduler,
autorización → grant, materialización → primitiva, adaptación → adapter,
ejecución → runtime.
