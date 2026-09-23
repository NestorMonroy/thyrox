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
