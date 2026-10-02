# Ítems de headless-pool dentro de ExecutionUnits (TASK-THYROX-0757)

## El encargo

<!-- verbatim, sin parafrasear -->

> ```
> headless-pool
> → setsid/timeout
> → thyrox -p
> → host
> ```
>
> no cumple el contrato de ejecución gestionada.
> Quiero que pase a:
>
> ```
> headless-pool
>     │
>     │ distribuye N items
>     ▼
> ExecutionAuthorization
>     ▼
> @thyrox/podman-execution
>     ▼
> ExecutionUnit
>     ▼
> thyrox -p
> ```
>
> Pero conserva la frontera que ya existe:
>
> ```
> headless-pool = scheduler/distribuidor
> podman-execution = materialización
> ```
>
> No metas comandos Podman dentro de `headless-pool`.
> La prueba arquitectónica existente que prohíbe Podman en `headless-pool` debe seguir pasando.
> El pool debe pedir una ejecución; la primitiva decide/materializa el contenedor.
> 6. No implementes Qwen-only mediante un nombre hardcoded en headless-pool
> Hoy `--model` ya está correctamente rechazado y la selección se deriva del mecanismo de recomendación.
> No quiero volver atrás añadiendo:

## La premisa, si se corrigio al primer comando

Ninguna: el encargo se ejecutó tal como se pidió.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/p2/baseline.sh` | borrador del cambio, tal como se aplicó |
| `probes/p2/finish.sh` | borrador del cambio, tal como se aplicó |
| `probes/p2/fix-test.py` | borrador del cambio, tal como se aplicó |
| `probes/p2/impl.py` | borrador del cambio, tal como se aplicó |
| `probes/p2/test-headless-pool-execution-unit.sh` | headless-pool con --execution unit (TASK-THYROX-0757): cada ítem pide una |
| `outputs/` | 20 salidas: rojos, verdes y anulaciones |

## Los resultados

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

*Metrica:* casos rojos antes, suites hermanas en verde después y casos que caen al retirar cada guarda.
*Ciega a:* un modelo real respondiendo dentro de la unidad: el runner es un doble del contrato de thyrox -p.
