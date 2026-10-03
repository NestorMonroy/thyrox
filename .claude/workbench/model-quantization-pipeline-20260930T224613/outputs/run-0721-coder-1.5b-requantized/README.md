# TASK-THYROX-0721 — A/B BF16 → Q8_0 → Q4_K_M: rehusado por capacidad (2026-10-01)

`bin/local-models-quantize run --method requantized_q8_to_q4` sobre la misma
fuente que 0718 (`Qwen/Qwen2.5-Coder-1.5B-Instruct` @ `2e1fd397…`) rehusó
**antes de descargar** (`refusal.json`, exit 2, scratch vacío):

| | Bytes |
|---|---|
| Libre en el scratch | 3 809 026 048 |
| Pico estimado de la ruta B (fuente + Q8_0, luego Q8_0 + Q4) | 5 013 739 069 |

El disco lo ocupa el 7B adquirido en 0720 (4 683 073 536 bytes), que se
conserva porque es el candidato local que se va a cualificar. La A/B queda
**pendiente de capacidad**, no descartada: la ruta B ya está implementada y
probada con dobles (`quantizationPlan.test.ts`, la ruta B pide menos scratch
que la directa) y registra `quantization_method = requantized_q8_to_q4` en
`registration.json`, así que no se puede confundir con una cuantización
directa. Se corre cuando el scratch tenga ~5 GB más el piso de la admisión,
y se compara contra `../run-0718-coder-1.5b-direct/` en pico de disco, pico
del cgroup, duración, bytes descargados, tamaño del Q4 y perplejidad sobre el
mismo corpus.

## Condición de aceptación de la comparación (ejecutable)

A y B sólo se comparan si sus identidades de evaluación coinciden en todos
los campos: repositorio y revisión de la fuente, sha256 del corpus, digest de
la imagen y versión de los parámetros (`TOOL_PARAMETERS_VERSION`). Cada
validación registra la suya en `run.json` (`observations.evaluationIdentity`)
y `comparisonRefusal` (`src/packages/model-artifacts/evaluationIdentity.ts`)
rehúsa la comparación nombrando cada campo que difiere. Las perplejidades de
0718 (3,22) y 0720 (2,56) son controles de sanidad: fuentes y corpus
distintos, y por eso esa función las rechaza.

Nota: los registros de `../run-0718-coder-1.5b-direct/run.json` son anteriores
a la huella por paso y a la identidad de evaluación; para servir de lado A,
0718 se vuelve a ejecutar con la misma imagen que B, y la huella hace que se
rehaga en vez de reutilizarse.
