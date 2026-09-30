# clone-homes

## El encargo

> «aunque está en el gitignore, te tienes que asegurar que alguien que clone
> thyrox ya tenga el mecanismo y no lo tenga que "descubrir" como lo hemos
> estado haciendo» · «revisa el install.sh porque considero que es parte de
> Empaquetado-*» — ejecutor, 2026-09-30.

## La premisa, si se corrigio al primer comando

La premisa implícita de hoy: cada hogar lo crea su módulo la primera vez que
lo usa, así que un clon nuevo «funciona». Medido en esta misma sesión, no
basta: una aserción de `test-headless-pool.sh` exige que `.thyrox/runtime`
exista y falla en todo worktree o clon nuevo; y un log de verificación buscó
`.claude/logs/`, que no existe.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/census_homes.sh` | cruza las claves de hogar de `.env.example` con el registro de `bin/declarations`, y mira qué hogares ignorados existen en un `git clone` recién hecho |
| `outputs/census_homes.out` | salida verbatim |

## Los resultados

| Medición | Valor |
|---|---|
| claves `THYROX_*` con sufijo `_DIR`/`_HOME`/`_LEDGER`/`_ROOT` en `.env.example` | 46 (no todas son hogares: `THYROX_TOOLCHAIN_NODE_MODULES_HOME` es la dependencia; se decide por clave) |
| de ellas, en el registro `src/paths/declarations.py` | **2** (`THYROX_EVIDENCE_DIR`, `THYROX_STATE_DIR`) |
| hogares ignorados por git que un clon nuevo NO tiene | `.claude/jobs-ledger`, `.claude/logs`, `.thyrox/runtime`, `.thyrox/pool-worktrees` |
| qué hace hoy `install.sh` | escribe `THYROX_ROOT` en el `.env` del consumidor; no crea ningún hogar ni activa los githooks (eso es P8) |

## Dónde encaja: la serie Empaquetado

`install.sh` es la instalación (P7), activa los githooks (P8) y no hereda el
`.env` ajeno (P10). Ninguna de las tres crea los hogares: es el hueco que
cierra **Empaquetado P11**, TASK-THYROX-0675.

*Metrica:* claves por nombre en `.env.example`, filas del registro, y
directorios presentes tras `git clone` del árbol.
*Ciega a:* un hogar que un módulo resuelve sin clave de entorno (sólo por
ruta relativa a la raíz), que este censo no ve por nombre; y a los hogares
del consumidor (kaupamex-*), que su propio clon resuelve.
