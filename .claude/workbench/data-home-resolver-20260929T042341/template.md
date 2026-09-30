Unificas en thyrox (Bun, TypeScript) la resolución del directorio de datos de cada paquete.
El `Item:` de abajo nombra los archivos que te pertenecen; no toques ningún otro.

Contexto medido: tres paquetes repiten la misma forma —`THYROX_<X>_DATA_DIR` declarada, o
si no `<config home>/<subdir>`—: `src/packages/local-observability/src/errorStore/errorStoreHome.ts`
(`resolveObservabilityDataDir`), `src/packages/mitm/src/dataDir.ts` (`resolveMitmDataDir`,
que además usa `getConfigHomeDir()` sin `env` mientras los otros dos usan
`resolveConfigHomeDir({ env, home, exists })`) y
`src/packages/provider/src/accounts/connectionStoreHome.ts` (`resolveProvidersDataDir`).
El config home canónico es `src/packages/config/env/configHome.ts`.

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
