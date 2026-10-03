# Salvage del scratchpad de la sesión (H-THYROX-474)

Inventario: `probes/scratchpad_inventory.py` → `outputs/scratchpad-inventory.tsv`
(959 archivos) y `outputs/scratchpad-historical.tsv` (40 rutas de sesiones
anteriores, todas ausentes).

| Clase | N | Destino |
|---|---|---|
| RECONSTRUCTIBLE | 675 | blob idéntico en git (columna `git_blob`) |
| DURABLE_REQUIRED | 120 | `recovered-scratchpad/844a0a13/` |
| EPHEMERAL_OK | 163 | salidas de tareas del cliente, `-shm`, bytecode |
| ALREADY_PROMOTED | 1 | `case28.py` → caso 28 de `tests/session/test_resource_admission.py` |

Estado del árbol medido antes de clasificar: ninguna mutación de anulación
quedó aplicada (`git diff` sin las formas anuladas). Las anulaciones de esta
rama a partir de aquí se hacen sobre una copia (`mutations/<experimento>/`),
nunca sobre el árbol de trabajo.

*Métrica:* igualdad exacta de blob con un objeto del repositorio; mención del
nombre en registros durables. *Ciega a:* nombres cortos (`n1`, `o`) que casan
por subcadena —la columna `referenced_by` sobrecuenta— y consumidores que no
nombran el archivo.

**No preservado, a decisión del ejecutor:** `scratchpad/envprobe/.env` (fila
DURABLE_REQUIRED del inventario). Es un `.env` —puede llevar credenciales—, no
se leyó y git lo ignora; el original sigue en el scratchpad de la sesión
mientras ésta viva.
