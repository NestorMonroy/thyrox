# TASK-THYROX-0718 — Qwen2.5-Coder-1.5B-Instruct, BF16 → F16 → Q4_K_M directo

Ejecutado el 2026-10-01 con `bin/local-models-quantize run` en exclusión
(ledger vacío, sin otro laboratorio), scratch fuera del árbol
(`/home/user/.thyrox-lab/quantize-scratch`), lease por Redis gestionado,
admisión de disco y memoria por `resource_admission`, cada paso por la
primitiva `@thyrox/podman-execution`. Estado completo: `run.json`.

| Medida | Valor |
|---|---|
| Fuente | `Qwen/Qwen2.5-Coder-1.5B-Instruct` @ `2e1fd397ee46e1388853d2af2c993145b0f1098a`, apache-2.0 |
| Bytes descargados (BF16 y archivos de la fuente) | 3 098 973 788 |
| GGUF F16 | 3 093 669 536 bytes, `general.architecture` `qwen2` |
| Q4_K_M | 986 048 672 bytes, sha256 `47c034a0322d82f6361df5f1d67497246bed41836ac4daf154c5a19957a8fa17` |
| Imagen del laboratorio | id `ddf16d444d8b…`, digest `sha256:7bbe1b609ecf553fffa28443c41c1ba27ec02a8b45f856dc231166da0eac40ad` |
| Libre antes de empezar | 9 479 725 056 bytes |
| Libre mínimo durante la ejecución (muestreo de 1 s) | 3 285 622 784 bytes |
| Pico de disco observado | ~6,19 GB (estimado antes de empezar: 6,47 GB) |
| Pico de memoria del cgroup | convert 3 590 029 312 · quantize 2 160 181 248 · validate 2 124 439 552 bytes |
| Duración | download 93,8 s · convert 30,2 s · quantize 41,2 s · validate 28,2 s · resto < 2 s cada uno |
| Validación | abre como GGUF, `file_type` Q4_K_M, misma arquitectura que el F16, tamaño en rango, `llama-simple` generó texto a 15,75 t/s, perplejidad 3,2242 (`-c 128 -t 4`, README + LICENSE) |
| Registro | `manifest.json` (procedencia completa), `registration.json`, entrada `thyrox-qwen--qwen2.5-coder-1.5b-instruct:q4_k_m-hf-2e1fd397ee46` en el catálogo local |
| Reejecución idempotente | misma orden: exit 0 en 2 s, registros idénticos, 0 bytes nuevos descargados |

**Lo que este artefacto valida y lo que no.** Valida la cadena de
cuantización de punta a punta. **No cualifica** el modelo para cargas de
~73K tokens: su contexto declarado es 32 768, y la competencia en una clase
de tarea la mide otra suite (TASK-THYROX-0710).

*Métrica:* `run.json` (registros, observaciones y métricas que escribe el
propio pipeline), `container_measure` por cgroup, `statfs` del scratch cada
segundo.
*Ciega a:* el pico de memoria entre muestreos de 1 s, y el disco que usan
otros procesos ajenos durante la ejecución (el mínimo libre lo incluye).
