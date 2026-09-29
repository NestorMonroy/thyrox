Implementas en thyrox (Bun, TypeScript) la regla 3 de ADR-THYROX-006: un solo módulo,
`@thyrox/store` (`src/packages/store/`), abre las conexiones a base de datos, de una de
dos formas que cada store DECLARA. El `Item:` de abajo nombra los archivos que te
pertenecen; no toques ningún otro (otro ítem trabaja en paralelo sobre archivos vecinos
del mismo paquete).

Contexto medido:
- `src/packages/store/db.ts` exporta `openStore(dbPath)`: `bun:sqlite` síncrono con
  `PRAGMA busy_timeout = 3000` (`BUSY_TIMEOUT_MS`), y `probeStore`.
- La base de errores usa `Bun.SQL` asíncrono, con el motor elegido por la URL
  (`sqlite://` o `postgres://`), y su dialecto vive en
  `src/packages/local-observability/src/errorStore/dialect.ts` (`DIALECTS`, `dialectOf`,
  `jsonParam`, `readJson`, `readTimestamp`, `readId`).
- `Bun.SQL` sobre `sqlite://` NO carga extensiones (H-THYROX-238: `loadExtension` es
  `undefined` en `SQL` y una función en `bun:sqlite`).
- Varios sitios abren SQLite con `new Database(...)` sin pasar por el store; el store de
  conexiones de proveedores (`src/packages/provider/src/accounts/connectionStoreHome.ts`,
  que el proxy lee en cada petición mientras la CLI escribe) queda así sin `busy_timeout`.
  La base ajena de Cursor (`provider/src/accounts/cursor/cursorTokenExtractor.ts`) se lee
  y NO entra en este trabajo.

Ejecución en modo -p, sin nadie que te reanude:
- Primero la prueba, en rojo; después la implementación. Por cada guarda o rama nueva,
  comprueba que retirarla hace caer al menos una prueba.
- Identificadores en inglés; comentarios en español, de intención, sin historial ni fechas.
  La palabra «Claude» con mayúscula no va en `src`. Sin imports dinámicos.
- Nada de `/tmp` fijo: `os.tmpdir()` + `mkdtemp` en pruebas; restaura `process.env` en
  `afterEach`.
- Toda variable THYROX_* que se lea necesita una prueba y su línea en `.env.example`; una
  que se retire, se quita de `.env.example`.
- No corras `tests/run.sh` ni lances trabajos en segundo plano (`thyrox-bg`,
  `run_in_background`, `&`). Corre en primer plano sólo tus pruebas con
  `bun test <archivo>` desde el directorio del paquete.
- No escribas nunca bajo `_references/`. No commitees: deja los archivos en tu worktree.
- No termines tu turno esperando una notificación: lo que no esté escrito se pierde.

Al terminar, las pruebas que tocaste deben quedar en verde. Responde con la lista de
archivos creados o cambiados y un resumen de dos líneas.
