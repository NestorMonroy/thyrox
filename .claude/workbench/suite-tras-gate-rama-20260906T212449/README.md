# Suite completa tras el gate de rama — y por qué NO debió correrse

Lanzada para verificar un cambio de **tres archivos**
(`check_pushed_branch.py`, su test, `pre-push.sh`).

| | |
|---|---|
| reloj de pared | **110 s** (21:24:49 → 21:26:39) |
| rojos publicados | 97 (86 shell + 11 python), **todos heredados** |
| rojos causados por el cambio | **0** — `test_pushed_branch.py` sale verde |
| subconjunto derivado | 2 suites, **1.9 s** — 59× |

`test-execution-protocol.md` ya lo prohibía con esas palabras. La regla estaba
cargada y no lo previno: daba un procedimiento de dos greps a mano y **ningún
comando**, así que lo barato era lo incorrecto.

Cerrado con `tests/run.sh --changed` (`thyrox@51fb3cb8`) y registrado como
`H-DOCS-1130` en kaupamex-docs. Los 86 rojos de shell son la tarea #215.

Este log se conserva porque es la evidencia de la cifra: sin él, «110 s contra
1.9 s» sería una afirmación sin `Observation`.
