# Preflight: la sonda `githooks`

`core.hooksPath` vive en `.git/config`, que no se versiona: un clon nuevo trae
`.githooks/` y git no lo ejecuta. Así entraron cinco claves sin declarar a
develop con su gate en rojo (H-THYROX-161). El preflight
`bin/check-toolchain-ready` gana la sonda `githooks`, de clase `error`.

| Archivo | Qué es |
|---|---|
| `rojo.txt` | `tests/verify/test-toolchain-ready.sh` con el caso 9 y sin la sonda: 15 casos, 11 ok, 4 fallos (los 4 nuevos) |
| `verde.txt` | con la sonda: 15 ok, 0 fallos |
| `anulado.txt` | la sonda devuelve siempre 0: caen exactamente los 3 casos que dependen de ella |
| `derivadas.txt`, `comandos.txt`, `pool.txt` | `tests/run.sh --changed-list`, corridas con `run-task-pool --memfree 2G`: `test-toolchain-sh.sh` (1 fallo) y `test_generate_bin.py` (109/9) dan lo mismo que en la medición de partida; el primero, además, falla igual con el `toolchain.sh` de `HEAD` |
