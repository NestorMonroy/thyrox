# Detector: el segundo plano del cliente en vez del del árbol

Durante la sesión del 2026-09-23 una espera `until grep` y dos
`run-task-pool` se lanzaron con `run_in_background: true` del cliente, en vez
de `bin/thyrox-bg start` + `register`. Así nacen fuera del ledger: la barrera
no los ve y no dejan marcador.

| Archivo | Qué es |
|---|---|
| `rojo.txt` | la suite sin el módulo: `FileNotFoundError`, rc=1 |
| `verde.txt` | 10 ok; su caso 5 anula el descuento de `thyrox-bg start` y cae exactamente ese caso |

`test_pretooluse_dispatch.py` sigue en 17 ok tras registrarlo.
