Cableas en thyrox (Bun, TypeScript) la restauración del modelo de respaldo por rechazo,
ya portada pero sin llamador. El `Item:` de abajo nombra los archivos que te pertenecen; no
toques ningún otro.

Qué existe (léelo antes de escribir): `src/packages/app-host/src/state/refusalFallbackRestore.ts`
porta `wt`, `sA`, `Pyt` (`subscribeRefusalFallbackReset`) y `b8r` (`onRefusalFallbackRestored`)
de `chunk-6ff16z73.js` (2.1.283) con sus dependencias inyectadas
(`RefusalFallbackRestoreDeps`: `mo` `fastModeEnabled`, `oA` `resolveFastMode`, `Ea`
`hasRemoteControlChannel`, `logEvent`, `mp` `overrideMainLoopModel`, `vV` `modelScope`). Nadie
los llama. Piezas disponibles: `isFastModeEnabled` y `processFastModeAvailabilityContext`
(`@thyrox/provider/fastMode.js`), `resolveFastModeForModel` (`@thyrox/provider/fastModeSelection.js`),
`setMainLoopModelOverride` (`app-host/src/bootstrap/state.ts`), y el alcance `vV` que portó
R-2c (búscalo: `rg -n "vV|modelScope" src/packages`).

Mide en la referencia (`_references/claude-code-bin/2.1.283/claude_strings.txt`, y los chunks
de `_references/claude-code-bin/2.1.283/` si existen) DÓNDE se llaman `Pyt` y `b8r`: con qué
`setAppState` (el almacén interactivo del REPL) y qué hace el llamador headless con `b8r`.
Cita la cadena en un comentario de intención de una línea junto a cada llamada.

Ejecución en modo -p, sin nadie que te reanude:
- Primero la prueba, en rojo: una señal de sesión con restauración (`onSessionSwitch` /
  el emisor de `bootstrap/state.ts`) debe reescribir el estado del almacén y, en headless,
  disparar el callback. Por cada guarda o rama nueva, comprueba que retirarla hace caer al
  menos una prueba.
- Identificadores en inglés; comentarios en español, de intención, sin historial ni fechas.
  La palabra «Claude» con mayúscula no va en `src`. Sin imports dinámicos nuevos: si una
  dependencia cerraría un ciclo estático, usa el mismo `require()` diferido que el archivo
  ya usa para sus vecinos.
- Nada de `/tmp` fijo; restaura `process.env` y el estado global en `afterEach`.
- No añadas dependencias a ningún `package.json` ni toques `bun.lock`.
- No corras `tests/run.sh` ni lances trabajos en segundo plano. Corre en primer plano sólo tus
  pruebas con `bun test <archivo>` desde el directorio del paquete.
- No escribas nunca bajo `_references/`. No commitees: deja los archivos en tu worktree.
- No termines tu turno esperando una notificación: lo que no esté escrito se pierde.

Al terminar, las pruebas que tocaste deben quedar en verde. Responde con la lista de
archivos creados o cambiados y un resumen de dos líneas.
