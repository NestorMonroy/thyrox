# bg.sh --memfree: la cota por memoria ENTRE lanzamientos independientes

Pregunta del ejecutor: *«si no me equivoco, tenemos algo implementado para la
memoria, y poder liberarla; si es que no, analiza, revisa y corrige»*.

**Sí existía, en un solo sitio.** `run-task-pool.sh --memfree` porta las dos
mitades de GNU Parallel 20231122 (admisión por `MemAvailable` y aplicación que
mata al más joven), con su suite `test-run-task-pool-memfree.sh`. Pero acota
la memoria entre los trabajos de UN pool. El lazo tsc cero y el censo de
fachadas se lanzaron con dos `bin/thyrox-bg start` independientes, y `bg.sh`
no tenía ninguna cota: en una máquina de 16 GB sin swap el kernel mató con
SIGKILL a los proponentes del lazo (`tsc-zero-loop/run-20260923T204551`), y
`commit_identity env` quedó en espera de páginas (`folio_wait_bit_common`)
hasta que se lo mató.

**Corrección.**

- La sonda (`parse_binary_size`, `mem_available_bytes`) pasa a
  `src/lib/memory.sh`, compartida por el pool y por `bg.sh`. La suite del pool
  siguió 12/12 tras moverla.
- `bg.sh start --memfree SIZE [--memfree-wait S]` lleva la cuenta ENTRE
  lanzamientos, con un registro de trabajos `--memfree` vivos
  (`THYROX_BG_MEMFREE_DIR`).
  - **Admisión:** con otro vivo, espera a que `MemAvailable` supere la cota y,
    al vencer la espera, rehúsa con exit 3 sin lanzar.
  - **Aplicación:** un vigilante por trabajo; bajo la mitad de la cota y con
    dos o más vivos, el más joven se mata a sí mismo, nunca el último. La causa
    queda escrita en su log.
- Divergencia declarada frente al pool: no se reencola.

Suite: `tests/session/test-bg-memfree.sh` (meminfo sintético, sin consumir
memoria real).

| Pieza anulada | Cae |
|---|---|
| `admission-wait` | «sin memoria, el segundo rehúsa…», «y no lanza nada» |
| `admission-only-others` — esperar aunque no haya otro vivo | la suite no llega a su resumen: el único trabajo espera los 1800 s por defecto y el `timeout 90` la corta |
| `enforce-youngest` | «…se mata al más joven», y por causa «el mayor sigue vivo», «…se declara en su log», «el último… no se mata» |
| `enforce-not-last` | «el último… no se mata», «el mayor sigue vivo», y por causa los dos de admisión (el primero se mató solo y el segundo se admitió) |

## De paso: dos fugas preexistentes y el commit del lazo

- `test-bg-grace-window.sh` y `test-assert-no-writes.sh` dejaban runs
  (`lento-*`, `corto-*`, `sonda-*`) en el `.claude/jobs` del árbol en cada
  corrida: `bg.sh` crea su run-puntero aun con `--dir`. Ahora aíslan
  `THYROX_JOBS_DIR`. Medido: 2 archivos sin seguimiento tras una corrida, y 0
  después del arreglo.
- `tsc_zero_loop` commiteaba sólo el paso y el registro. El
  `check_bench_untracked` real bloqueó su primer commit en el árbol, porque
  dejaba fuera `residual.jsonl`, `seed`, `result.json` y `stderr.txt`. Ahora
  añade y commitea el run entero. Anulación `loop-whole-run`: cae «el commit
  del lazo lleva el run entero…».

Ciega a: la memoria de un proceso lanzado fuera de `bg.sh --memfree`, que no
se registra; la cota sólo coordina a quienes la declaran.
