# check_bench_untracked: un commit que toca un banco no deja fuera sus archivos nuevos

`src/verify/check_bench_untracked.py` (`bin/check_bench_untracked`), cableado
en `.githooks/pre-commit` y bloqueante. Suite:
`tests/verify/test_bench_untracked.py`.

`git commit -- <banco>` commitea sólo lo que git ya sigue. El defecto se
repitió en el lazo tsc cero varias veces; la última, en el mismo turno que
escribió este gate (el commit del desempate de ediciones abortó por rutas sin
`add -N`, y en otros casos anteriores el banco se publicó sin sus archivos).

| Pieza anulada | Cae |
|---|---|
| `staged-filter` — mirar todos los bancos, no sólo los del commit | «un banco que el commit no toca no se mira», y por causa «una ruta fuera de las raíces…» y «el CLI sale 0…», cuyas fixtures tienen otro banco con archivos sin seguimiento |
| `bench-roots` — tratar cualquier directorio como banco | «una ruta fuera de las raíces de banco no es banco» |

Ciega a: un archivo que `.gitignore` excluye.

# tsc_zero_loop: el lazo entero

`src/verify/tsc_zero_loop.py` (`bin/tsc_zero_loop`). Suite:
`tests/verify/test_tsc_zero_loop.py`, sobre un repositorio git temporal con un
proponente y un `tsc` falsos: el proponente arregla sólo el PRIMER `BAD<n>` de
cada archivo, así que un archivo con dos exige dos vueltas con bases nuevas.

Cada vuelta pide candidatos nuevos, corre `tsc_zero_step.run_step` con el log
final de la vuelta anterior como «antes», y commitea por pathspec lo
conservado junto con su banco y el registro (con `add -N`). Se detiene en
`done`, `stalled` o al tope de pasos. No publica.

| Pieza anulada | Cae |
|---|---|
| `loop-fresh-candidates` — reutilizar los candidatos de la primera vuelta | «llega a tsc cero», «a.ts necesitó dos vueltas…», «un commit por paso…», «el total baja por pasos…» |
| `loop-stalled-stop` — seguir tras `stalled` | «se detiene en la primera vuelta», «y no commitea nada» (commitea el banco de cada vuelta vacía) |
| `loop-commit` — no commitear | «un commit por paso con progreso», «el árbol queda limpio…» |

Sin caso que discrimine, declarado: reutilizar el log final como «antes» (sólo
ahorra una pasada de `tsc`; la suite no cuenta pasadas del lazo).

# pre-commit: el código de la reconciliación que falla

Suite: `tests/githooks/test-pre-commit-reconcile-status.sh`, que corre el hook
real en un repositorio temporal con gates falsos y un `board_sync.py` que sale
2. El hook publicaba «fallo (exit 0)» porque el `echo >&2` que abre la rama
`else` ponía `$?` a 0. En este contenedor el código real es 2: la raíz de
boards `/root/.claude/tasks` no existe, y `board_sync` rehúsa en vez de
publicar un cero. Anulación `reconcile-status` (volver a `$?`): cae «el fallo
de la reconciliación nombra su código real».
