# install.sh lo invoca todo

Un clon nuevo trae `.githooks/` y el atributo `merge=sqlite-union`, y las dos
mitades que los hacen efectivos viven en `.git/config`, que no viaja. Los
mecanismos existían y nadie los invocaba (H-THYROX-161). `install.sh` es el
paso del onboarding, así que ahora:

- **paso 6**: delega en `src/verify/install-hooks.sh --solo-mostrar` para el
  proveedor y cada consumidor (githooks y driver; los hooks de sesión sólo se
  muestran). `--check` mide sin escribir y `--dry-run` lo describe. El exit 3
  del instalador («sesión no») se acepta sólo para el proveedor, que no
  declara hooks de sesión propios.
- **paso 7**: corre el preflight y el contrato de `.env` y propaga su rojo.
  Si falta un mecanismo, avisa SIN MEDIR nombrando el archivo.

| Archivo | Qué es |
|---|---|
| `rojo.txt` | 56 aserciones, 13 fallidas (todas nuevas) |
| `rojo-proveedor.txt` | con los casos del exit 3: 59, 2 fallidas |
| `verde.txt` | 59 ok |
| `anulado-*.txt` | siete anulaciones; cada una tira sólo sus aserciones |
| `derivadas.txt`, `comandos.txt` | subconjunto derivado, corrido con `thyrox-bg start --memfree` + `run-task-pool --memfree` |

En el árbol real: `install.sh` definió el driver `sqlite-union` de thyrox (que
faltaba) y declaró `THYROX_ROOT` en `kaupamex-docs`; después `install.sh` y
`install.sh --check` salen 0.

De paso: el caso «carga la raíz del archivo de entorno» heredaba el
`THYROX_ROOT` que `tests/run.sh` y `bin/` exportan, y era el rojo de
`test_install.sh` en la medición de partida. Reproducido con
`THYROX_ROOT=... bash tests/install/test_install.sh` (57/2) y corregido con
`env -u` (59/0 con y sin la variable).
