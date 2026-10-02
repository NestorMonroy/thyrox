# Ítems de headless-pool dentro de ExecutionUnits (TASK-THYROX-0757)

Antes: cada ítem lanzaba su `thyrox -p` en el anfitrión
(`setsid timeout "$HP_RUNNER" -p`); `headless-pool.sh` nombraba «podman» 0 veces.

`--execution unit --work-reference CONSUMIDOR:ÁMBITO`: el ítem n pide su
ejecución por el runner gestionado de `src/lib/managed_execution.sh` (el de
`thyrox-bg`), autorizada por `--work CONSUMIDOR:ÁMBITO/n` y dueño
`pool:ÁMBITO-n` (TASK-THYROX-0756). El texto del ítem va a `<n>.prompt`; la
unidad recibe sólo las variables nombradas con `--env`, ninguna credencial.
Rehúsa con `--isolation worktree` y con `--credential-*`. GNU Time no mide el
ítem en este modo (mediría al cliente que espera). Por defecto sigue `host`.

`test_headless_pool_boundary.py`: 10/10, sin términos de Podman nuevos.

| Anulación | Cae |
|---|---|
| rama de la unidad | 5 casos del caso 1 y el caso 2 (el ítem corrió en el anfitrión) |
| validación de `--work-reference` | caso 3 |
| sólo variables nombradas (añadir `ANTHROPIC_API_KEY`) | «ningún ítem ve la credencial» |

Regresión derivada (`outputs/regress-*`): 9 de 11 suites en verde. Las dos
rojas se atribuyeron midiendo la línea base con el `headless-pool.sh` de HEAD
(`outputs/baseline-*`):
- `test-headless-pool.sh`: «la reserva ajena sigue en el registro», idéntico
  en la línea base: preexistente.
- `test-headless-pool-worktree.sh`: 7 fallos corriendo junto a otras 10
  suites, 1 sola (preexistente, idéntica a la línea base) corriendo sola
  (`outputs/alone-worktree.txt`): interferencia entre suites, no el cambio.

Mitad roja: `outputs/red.txt` (7 fallos).
