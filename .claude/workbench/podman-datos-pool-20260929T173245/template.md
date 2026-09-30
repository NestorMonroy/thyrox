# Segundo pool — bootstrap de infraestructura, límites de worker y migraciones del store de agentes

Trabajas en un worktree de thyrox. Identificadores, nombres de archivo, funciones, firmas y
variables en inglés; comentarios en español técnico, sin coloquialismos, con los términos
técnicos en inglés (clean-code: nombres por el papel, una responsabilidad por función, sin
números mágicos, sin banderas que elijan camino). No toques `_references/`, `.claude/` ni
`.env.example`, y **nunca** `agent-results/agent_store.sqlite3` (la base real): las pruebas
crean sus bases en un directorio temporal. Operaciones de archivo por Bash (`sed`, `gawk`,
`bin/replace_literal`); para una herramienta de `src/` usa su envoltorio de `bin/`, nunca
`python3 src/...`. Las pruebas `.py` se corren con `uv run python`; las TypeScript con
`bun test` dentro del paquete. Toda variable `THYROX_*` nueva lleva prueba que la nombre; **no
edites `.env.example`**: lista en tu informe cada variable nueva con su valor por defecto y una
línea de descripción.

## Reglas, sin excepción

- **Prohibido `git stash`** en cualquier forma (el pool lo rehúsa y el ítem no se integra).
- **Nada en segundo plano y nunca termines el turno para esperar algo**: si cierras el turno,
  el ítem termina. Pruebas en primer plano, acotadas con `timeout`.
- **No crees contenedores ni descargues imágenes reales**: usa un `podman` falso
  (precedente: `tests/lib/test-infrastructure.sh`, `tests/lib/test-toolchain-podman.sh`,
  `THYROX_TOOLCHAIN_PODMAN_BIN`). Ninguna prueba duerme de verdad: el reloj y la espera se
  inyectan.
- TDD: la prueba primero, en rojo; luego el cambio. Todo arreglo trae su **control de
  anulación**: retira la causa, comprueba que caen exactamente las aserciones que dependen de
  ella, restáurala y vuelve a verde. Informa las dos salidas.
- Tu último mensaje es un informe: qué cambiaste, las pruebas con su salida y lo que queda.

Tu ítem es el que dice `Item:` al final. Haz SÓLO ese.

## Item `infrastructure-bootstrap` (TASK-THYROX-0606, ADR-THYROX-007 v1.2.0 Regla 4)

Aquí no hay systemd (PID 1 es `process_api`): nada vuelve solo tras reiniciar la VM. Implementa
el `InfrastructureBootstrap`: un comando idempotente que asegura PostgreSQL+pgvector y Redis
según la declaración ya integrada en `src/lib/infrastructure.sh` (léela: nombres, argv de
creación, comando de salud, inspección; `THYROX_INFRA_POSTGRES_PASSWORD` obligatoria).

Archivo nuevo `src/session/infrastructure_ensure.sh` (se invoca por su envoltorio de `bin/`:
genera el envoltorio con `bash bin/generate_bin` y comprueba `bash bin/generate_bin --check`),
prueba nueva `tests/session/test-infrastructure-ensure.sh`. El flujo, por contenedor, es
exactamente el del ADR:

```
cargar la declaración → inspeccionar → validar el proceso real (estado reportado + PID vivo)
  → ausente o stale (Podman dice running y el PID murió) → rm -f + recrear
  → arrancar → correr el health check explícitamente, repetido hasta sano o hasta el plazo
  → declararlo listo; si no, fallar con causa y diagnóstico
```

- La decisión de conservar o recrear **nunca** sale sólo del estado reportado: `running` con
  el PID muerto es stale y se recrea (medido, TASK-THYROX-0605: `podman start` sale 0 sin
  arrancar nada en ese estado).
- Asegura antes la red `thyrox-infra` (existe → nada; falta → crearla).
- El plazo y el intervalo del health check se leen de variables con prefijo `THYROX_INFRA_`;
  la espera se inyecta para que la prueba no duerma.
- Registra por contenedor, en stdout, una línea con: nombre, estado reportado, PID vivo o no,
  acción tomada (`kept`/`started`/`recreated`/`created`) y resultado de salud.
- Exit 0 si todo quedó sano; exit 1 si alguno no llegó a sano en el plazo (nombrándolo y con
  la salida de su health check); exit 2 si falta podman o la contraseña, sin tocar nada.
- Nunca borra el volumen `thyrox-postgres-data`: `rm -f` del contenedor sí, del volumen no
  (prueba que lo compruebe mirando el argv que recibe el podman falso).
- Casos de prueba mínimos: ausente → creado; running+PID vivo+sano → conservado; running+PID
  muerto → recreado; exited → arrancado; nunca sano → exit 1; sin contraseña → exit 2 sin
  llamar a podman; idempotencia (dos invocaciones seguidas, la segunda no recrea nada).
- No lo cableas al arranque de sesión ni al daemon: dilo en el informe como lo que queda.

## Item `worker-resource-limits` (TASK-THYROX-0615, ADR-THYROX-007 Regla 2)

`PodmanWorkerManager` (daemon) aplicará límites de CPU, memoria, procesos, red y filesystem
desde el perfil declarado del worker. Cada bandera ya se midió contra su control
(`src/lib/podman_capabilities.sh`: `--pids-limit`, `--memory` rc=137, `--cpus 0.5`,
`--network none`, `--read-only`, montajes `:ro`). Esta tarea convierte esas banderas en el
**contrato del perfil**, en TypeScript, dentro de `src/packages/daemon/src/podman/`:

- un tipo `WorkerResourceProfile` (cpus, memoria en MiB, límite de procesos, red declarada,
  rootfs de sólo lectura, montajes con su modo) y una función pura que lo valida y devuelve el
  argv de límites para `podman create/run` (sin ejecutar nada);
- valores inválidos (cpus ≤ 0, memoria ≤ 0, pids < 1, montaje sin destino absoluto, red
  desconocida) **rehúsan** con un error que nombra el campo; nunca se omite un límite en
  silencio;
- el perfil por defecto es el más restrictivo medido: `--network none`, `--read-only`, montajes
  `:ro`; relajar algo es explícito en el perfil;
- pruebas en `src/packages/daemon/__tests__/` (argv exacto por perfil, cada rehúso, el perfil
  por defecto), y corre la suite del paquete daemon entera antes de terminar.
- No creas el `PodmanWorkerManager` ni lanzas contenedores: sólo el contrato del perfil.

## Item `agent-store-migrations` (TASK-THYROX-0532, Datos D3-A2)

Decisión del ejecutor (opción 1): **Python es dueño del schema** de `agent_store.sqlite3` y Bun
sólo valida.

(a) En `src/agents/agent_store.py`: un runner de migraciones con el contrato v2 de
`@thyrox/store` (léelo en `src/packages/store/migrationContract.ts`, `migrationsSync.ts` y
`migrationLedger.ts`, que **no editas**): ledger `schema_migrations` con
`version`/`name`/`applied_at`, versiones ascendentes sin duplicados, migración y fila de control
en la misma transacción, rechazo de una base más nueva que el código, provenance (nombre
registrado igual al declarado), sin writer lock cuando no hay pendientes. Las migraciones que hoy
corren por detección dentro de `connect()` (`_migrate_*`) pasan a versiones numeradas y
nombradas, cuyo chequeo de adopción **reutiliza la detección existente**; `task_highwater` pasa a
una migración versionada que se adopta si la tabla ya existe con la forma esperada. Una base
creada antes por Bun o por Python converge sin pérdida de filas. API pública de
`agent_store.py` intacta.

(b) En `src/packages/tools/src/tasks.ts`: Bun deja de ejecutar DDL sobre esa base
(`TABLERO_DDL` y el DDL de `task_highwater`) y valida el ledger con
`validateMigrationLedgerSync` antes de usarla; sin ledger, error explícito «store requires
initialization/migration». API síncrona intacta para sus importadores.

Pruebas: Python en `tests/agents/` (base nueva, base heredada con filas creada con el código de
HOY —léelo con `git show HEAD:src/agents/agent_store.py`—, re-ejecución idempotente, base más
nueva rechazada, nombre de migración cambiado rechazado); TypeScript en
`src/packages/tools/__tests__/`. Corre antes de terminar: `bash tests/agents/test-agent-store-tareas.sh`,
`bash tests/agents/test-agent-store-sessions.sh`, tus pruebas nuevas y `bun test` de
`src/packages/tools`.
