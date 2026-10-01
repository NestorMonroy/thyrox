# Primer pool de Podman — un ítem de tres

Trabajas en un worktree de thyrox. Identificadores, nombres de archivo, funciones, firmas y
variables en inglés; comentarios en español técnico, sin coloquialismos, con los términos
técnicos en inglés (clean-code: nombres por el papel, una responsabilidad por función, sin
números mágicos). No toques `_references/`, `agent-results/` ni `.claude/`. Operaciones de
archivo por Bash (`sed`, `gawk`, `bin/replace_literal`); para una herramienta de `src/` usa su
envoltorio de `bin/`, nunca `python3 src/...`. Las pruebas `.py` de `tests/` se corren con
`uv run python`. Toda variable `THYROX_*` nueva lleva prueba que la nombre. **No edites
`.env.example`**: dos ítems lo tocarían y se pisarían; lista en tu informe final cada variable
nueva con su valor por defecto y una línea de descripción, y quien integra la añade.

## Reglas, sin excepción

- **Prohibido `git stash`** en cualquier forma (el pool lo rehúsa y el ítem no se integra).
- **Nada en segundo plano y nunca termines el turno para esperar algo**: si cierras el turno,
  el ítem termina. Pruebas en primer plano, acotadas con `timeout`.
- **No crees contenedores ni descargues imágenes reales**: las pruebas usan un `podman` falso
  (precedente: `tests/lib/test-toolchain-podman.sh`, `THYROX_TOOLCHAIN_PODMAN_BIN`). No
  ejecutes `apt-get` ni `sudo` de verdad: las pruebas inyectan el comando.
- TDD: la prueba primero, en rojo; luego el cambio. Todo arreglo trae su **control de
  anulación**: retira la causa, comprueba que caen exactamente las aserciones que dependen de
  ella, restáurala y vuelve a verde. Informa las dos salidas.
- Tu último mensaje es un informe: qué cambiaste, las pruebas con su salida y lo que queda.

Tu ítem es el que dice `Item:` al final. Haz SÓLO ese.

## Item `infrastructure-declaration` (TASK-THYROX-0607, ADR-THYROX-007 v1.2.0 Regla 4)

Declara PostgreSQL+pgvector y Redis como **contenedores de infraestructura gestionada** (no
"services": aquí no hay systemd). Es la declaración reproducible que consumirá el bootstrap
(TASK-THYROX-0606, que NO haces tú: no escribas ensure/start/loops de salud).

Archivo nuevo `src/lib/infrastructure.sh` (biblioteca de shell, se usa con `source`, sigue el
estilo de `src/lib/podman_capabilities.sh` y `src/lib/toolchain.sh`), con prueba nueva
`tests/lib/test-infrastructure.sh`. Contrato:

- nombres fijos `thyrox-postgres` y `thyrox-redis`; una función que los liste;
- imágenes versionadas y totalmente calificadas, sobreescribibles por variable:
  PostgreSQL 16 + pgvector 0.8.x (`docker.io/pgvector/pgvector:0.8.0-pg16`) y Redis
  (`docker.io/library/redis:7.4`);
- red propia `thyrox-infra`; etiqueta `io.thyrox.role=infrastructure` en ambos (el
  `PodmanWorkerManager` futuro tendrá la suya: nunca gestionan los del otro);
- PostgreSQL: volumen con nombre `thyrox-postgres-data` montado en el directorio de datos;
  la verdad durable vive en el volumen, el contenedor es descartable;
- Redis: **sin** volumen como fuente de verdad (estado compartido efímero): persistencia
  desactivada (`--save ''`, `--appendonly no`);
- puertos sólo en loopback y **no** 5432/6379 (5432 ya lo ocupa el cluster del anfitrión):
  por defecto `127.0.0.1:55432` y `127.0.0.1:56379`, sobreescribibles por variable;
- credencial de PostgreSQL: **nunca en el código**. Se lee de una variable
  (`THYROX_INFRA_POSTGRES_PASSWORD`); si falta, la función que compone la creación **rehúsa
  con exit 2** nombrándola y sin emitir argumentos;
- `--restart=on-failure` (cubre la salida del proceso; el reinicio de la VM es del bootstrap);
- health check por contenedor: `pg_isready` y `redis-cli ping`, como comando que el
  bootstrap ejecutará explícitamente (`podman healthcheck run` o `podman exec`); aquí el
  health check NO corre solo (medido, TASK-THYROX-0605);
- contrato de creación/arranque/inspección: una función que imprime el argv completo de
  `podman create` para un nombre dado (una palabra por línea, sin ejecutarlo), otra para el
  comando de salud, y una de inspección que devuelve estado reportado y PID
  (`podman inspect --format`) usando `THYROX_TOOLCHAIN_PODMAN_BIN` o el `podman` del PATH.

Pruebas mínimas: argv exacto de cada contenedor (imagen, red, etiqueta, puertos en loopback,
volumen sólo en PostgreSQL, persistencia desactivada en Redis, restart), rehúso con exit 2 sin
contraseña y sin argv, sobreescritura de imagen y puerto por variable, nombre desconocido
rehúsa, inspección contra un `podman` falso. Controles de anulación: sin el rehúso de la
contraseña cae su caso; sin la etiqueta cae su aserción.

## Item `toolchain-uid-aware` (TASK-THYROX-0551)

`src/lib/toolchain.sh` tiene los `THYROX_TOOLCHAIN_*_INSTALL_CMD` con default
`sudo apt-get install -y …`, y más `sudo` en el instalador de pgvector (`remove`, compilado,
`make install`). En un contenedor mínimo con uid 0 y sin `sudo`, la instalación falla por
`sudo` y no por el paquete.

Política, en UNA función reutilizable (no copies la condición en cada instalador):
uid efectivo 0 → el comando sin `sudo`; otro uid con `sudo` disponible → con `sudo`; otro uid
sin `sudo` → rehúsa con exit 2 nombrando la causa. El uid y la presencia de `sudo` se leen de
forma inyectable para las pruebas (p. ej. `THYROX_TOOLCHAIN_EFFECTIVE_UID`,
`THYROX_TOOLCHAIN_SUDO_BIN`, con prueba). Aplícala a TODOS los defaults que
hoy dicen `sudo` (cuéntalos con `grep` antes y después; ninguno queda con `sudo` literal) sin
cambiar la conducta cuando el usuario ya declaró su propio `*_INSTALL_CMD`.

Pruebas: una por rama (uid 0; uid≠0 con sudo; uid≠0 sin sudo → exit 2), más que un
`*_INSTALL_CMD` declarado por el usuario se respeta tal cual. No rompas las suites existentes
`tests/lib/test-toolchain-*.sh`. Control de anulación: forzar siempre `sudo` hace caer la
rama uid 0.

## Item `rst-interpreter-premise` (TASK-THYROX-0612, H-THYROX-280)

`tests/verify/test_rst_gate_interpreter.py`, `test_the_path_real_of_executable_NOT_discriminates`
(hacia la línea 119): afirma que `/usr/bin/python3` y los venvs del proveedor y del consumidor
resuelven al mismo binario real. Medido: `/usr/bin/python3` → `/usr/bin/python3.11`, los dos
venvs → `/usr/bin/python3.12`; la aserción `len(real) == 1` falla aunque el gate sea correcto.

Lo que el bloque debe probar es que la ruta real **no** discrimina el par que el guard tiene
que distinguir: los dos venvs (proveedor y consumidor) comparten binario real y sólo
`sys.prefix` los separa. Reescribe el bloque para afirmar eso sobre el par de venvs, y que los
tres `sys.prefix` siguen siendo distintos; el python del sistema puede quedar fuera de la
comparación de rutas reales. Actualiza su docstring (sin historial de cambios: eso es git
log). No toques el gate (`src/verify/check_rst_sintaxis.py`). La suite debe pasar 5/5.
Control de anulación: comparar también el python del sistema reproduce el rojo actual.
