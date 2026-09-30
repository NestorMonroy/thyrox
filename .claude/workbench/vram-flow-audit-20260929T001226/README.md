# El flujo de admisión por VRAM contra el árbol

Pregunta del ejecutor: ¿el flujo headless-pool → GNU Parallel → admisión,
medición y liberación de VRAM → historial → reporte está implementado en
`thyrox/bin`?

## Piezas (`presence.txt`, `code.txt`, `policy.txt`)

| Pieza del flujo | Dónde vive | Envoltorio |
|---|---|---|
| anchura `min(configurada, RAM, VRAM)` | `pool_history.effective_width`, `derive` | `bin/pool_history` |
| admitir: medir, decidir y reservar bajo lock | `gpu_monitor.admit` + `shared_lock` | `bin/gpu_monitor admit` |
| pendiente sin doble descuento | `gpu_monitor.pending`: reserva menos lo que su árbol ya usa | — |
| reservas de dueños muertos | `VramLedger`: sólo cuentan los `_alive` | — |
| sin sitio: espera hasta el plazo | `admit`, exit 3 al vencer | — |
| medir el árbol del ítem | `gpu_monitor.measure` / `tree` | `bin/gpu_monitor` |
| liberar | `gpu_monitor.release` | `bin/gpu_monitor release` |
| `.gpu` en tres estados | medida, ausente, `error <causa>` | — |
| reporte | `step_report` | `bin/step_report` |
| política sin historial fiable (H-THYROX-192) | `vram_calibration` + `vram_request` | `bin/pool_history` |
| historial por plantilla, runner y modelo | `history_dir`, `template_digest`, `_last_row` | — |
| lado TypeScript de la admisión | `@thyrox/config: gpuAdmission.ts` | — |
| niveles 2 y 3 (GPU real) | `tests/hardware/` | rehúsan sin GPU |

La política del riesgo que se daba por abierto ya está implementada. Sin
historial calibrado, cada ítem pide el piso `HEADLESS_POOL_VRAM_MIN_MIB`, y
si no se declaró, la GPU entera, de a uno, hasta que una ejecución calibre.
«Calibrado» exige, en la última fila de la misma plantilla, el mismo runner
y el mismo modelo:
- VRAM medida en todos los ítems;
- que cada ítem durara al menos dos muestras;
- los ítems mínimos, la huella de la plantilla y la edad máxima, si se
  declararon.

## Nivel 1, medido aquí

| Suite | Resultado |
|---|---|
| `test_gpu_monitor.py` | 43 ok |
| `test_gpu_scenarios.py` | 19 ok |
| `test_gpu_trace.py` | 14 ok |
| `test_pool_history.py` | 89 ok |
| `test-gpu-admission-cli.sh` | 3/3 |
| `test-gpu-hardware-refusal.sh` | 15/15 |
| `test-pool-calibrate.sh` | 10 ok |
| `gpuAdmission.test.ts` | 4 pass |

*Métrica:* presencia de cada pieza en `src/session` y `bin/`, más las suites
de nivel 1 corridas en este contenedor.
*Ciega a:* el comportamiento sobre una GPU NVIDIA real. Este contenedor no
tiene GPU; los niveles 2 y 3 rehúsan y no se ejecutaron.
