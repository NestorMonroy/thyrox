# Fallas medidas del pool y de sus suites — y lo que ya las impide

Cada fila es un defecto que ocurrió, se midió y se registró. La columna
«Lo impide» dice si hoy hay un **mecanismo** que lo rechaza (código o gate)
o sólo una **tarea abierta**. Una fila sin mecanismo es una advertencia, no
una garantía: léela antes de repetir el patrón.

## Ya impedidas por un mecanismo

| Falla | Lo impide |
|---|---|
| Un pool corrió en un modelo retirado porque `--model` se escribía a mano (H-THYROX-288) | `headless-pool` deriva el modelo de `--task-class` con `bin/agent-recommend`; `--model` rehúsa con exit 2 |
| Se lanzó un pool con `--credential-proxy` sin credencial propia, rehusó con exit 2, y se pidió al ejecutor una clave que el pool no necesita. Sin opción de credencial rige `inherit`: cada ítem entra al proxy local (C7); así terminaron en `success` los ítems de `task-census-20260930T064202/impl-pool-a/outputs-2`. No se lanza con `--credential-proxy` ni se pide una credencial para un pool | el rechazo de `bin/provider-credential-proxy` lo dice ahora: nombra las dos vías de credencial propia y que un pool en `inherit` no la necesita (TASK-THYROX-0657, `f51f7a7c5`); el pool declara su fuente en la línea `credencial:` |
| Un clon nuevo commitea sin ningún gate: `core.hooksPath` vive en `.git/config` y no se clona | `bash install.sh` los activa; `bin/check_githooks_activos --strict` los mide y su salida trae la orden que arregla cada clon |
| Una suite «aislada» con `THYROX_JOBS_DIR=$TMP/jobs` escribió en el `.claude/jobs/` real: la clave por clon del `.env` gana | `src/lib/test_homes.sh::thyrox_isolate_homes`; el pre-commit `check_test_home_isolation` rehúsa la suite que el commit toca si exporta sólo la global |
| Una suite leía el `.env` real y su caso «sin roster» encontraba el roster del árbol | `THYROX_ENV_FILE` apuntado a un archivo vacío (`test-githooks-activos.sh`) |
| Una aserción nació ciega: importaba un módulo suelto, la importación fallaba y el cero salía siempre | `test-headless-pool.sh` importa como paquete y exige que la ruta se resuelva |
| Un ítem se publicaba con un proceso vivo escribiendo sus artefactos | `pool_lifecycle.publish` rehúsa (I3, `assert_no_foreign_writers`) |
| El pool publicaba un ítem que la recuperación ya había tomado | `claim` sube la generación; el pool presenta `--generation` en cada transición y al publicar |

## Todavía sin mecanismo — tarea abierta

| Falla | Tarea |
|---|---|
| `claim` intercalado entre la lectura y la escritura de `transition` se borra y el dueño viejo recupera el ítem (H-THYROX-289; sonda en `.claude/workbench/pool-model-by-task-class-20260930T161741/probes/`) | TASK-THYROX-0651 |
| La guarda de generación es opcional (`generation=None` no se comprueba) y la CLI declara abandonado un ítem cuyo dueño vive | TASK-THYROX-0651 |
| Un trabajo en segundo plano que pasa sus suites por `\| tail` sale con 0 aunque una falle: el veredicto de `wait-jobs` no lo ve. Hasta que exista el mecanismo, cada suite se corre con su propio código de salida (`probes/verify_phases.sh` es la forma) | TASK-THYROX-0649 |
| `pool_integrate` trunca `integration.tsv` y una segunda pasada reescribe lo aplicado como `no-aplica` | TASK-THYROX-0648 |
| Las fotos del pool no salen del contenedor: refs locales sin push y manifiesto en el runtime ignorado (H-THYROX-290) | TASK-THYROX-0652 (decisión del ejecutor) |
| Las fotos no caducan nunca | TASK-THYROX-0650 (decisión del ejecutor) |

## Tres hábitos, y qué script los mide hoy

Una regla sin script es prosa. Medido el 2026-09-30:

- el manifiesto de banco **tiene** script —`checkWorkbench`, que se invoca
  con `thyrox --workbench-check <dir> --strict`, y `bin/manifest scaffold`
  para crearlo—, pero **no está cableado** a ningún gate de commit;
- el `git stash` en el árbol principal con un trabajo vivo **no tiene** script
  (`src/session/item_git_guard/git` cubre sólo los ítems del pool);
- la afirmación de verde que no nombra sus suites **no tiene** script.

**Empaquetado P9** (TASK-THYROX-0655) cablea el primero y escribe los
detectores de los otros. La
instalación que activa los gates en un clon nuevo es **P8**
(TASK-THYROX-0654), y que el paquete no herede el `.env` del árbol que lo
hospeda es **P10** (TASK-THYROX-0656).

- **Una afirmación de verde nombra las suites que corrieron.** «Todo está en
  verde» se publicó con dos de siete suites medidas. Se dice «N de M, y
  cuáles».
- **No se toca el árbol mientras corre una suite sobre él.** Un `git stash` a
  mitad de una pasada invalida la pasada entera: se repite, no se cita.
- **Un banco nace con `bin/manifest scaffold`**, no con `mkdir`: el
  manifiesto escrito horas después reconstruye la pregunta y nada lo
  distingue de la original.
