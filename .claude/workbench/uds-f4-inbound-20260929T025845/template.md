Portas a thyrox (Bun, TypeScript) una pieza del protocolo de entrada del buzón UDS de 2.1.283, en
TDD. El `Item:` de abajo nombra la pieza, sus símbolos de referencia y los archivos que
te pertenecen; no toques ningún otro.

Referencia: `_references/claude-code-bin/2.1.283/bunfs-root/`. Localiza cada símbolo con
`bash bin/binary symbol <chunk.js> <nombres> </dev/null` (el chunk se nombra solo, sin
ruta) y léelo antes de escribir. Para un chunk entero, `cat` su archivo. No escribas
nunca bajo `_references/`. El despachador de acciones de control es `be` de
`chunk-yg53q7yp.js`; su porte, `src/packages/local-observability/src/uds/inboxRouting.ts`,
recibe cada acción como `ControlActionHandler` en `controlActions` — NO lo edites: tu
módulo exporta los manejadores y el cableado lo hace quien integra.

Reglas del árbol (cargan solas desde `.claude/rules/` y `.claude/CLAUDE.md`):
- Primero la prueba, en rojo, en `src/packages/local-observability/__tests__/`
  (`bun:test`); después la implementación.
- Porte completo: todo símbolo del alcance se porta o se declara su divergencia en el
  docstring. Cada función portada lleva su símbolo entre comillas invertidas.
- Identificadores en inglés; comentarios en español, de intención, sin historial ni fechas.
- Reutiliza lo portado en `src/packages/local-observability/src/uds/` (búscalo por el
  símbolo entre comillas invertidas con `git grep`): `PerHost`/`processHost`
  (`q`/`j().host`, `sessionNameState.ts`), `reportFeatureOk`/`reportFeatureSad`
  (`_`/`p`, `featureTelemetry.ts`), `withholdTokenText`/`redactLogFragment`
  (`Bf`/`TB`, `logRedaction.ts`), `isProcessGone`/`readProcessStartToken`
  (`Nh`/`nc`, `processIdentity.ts`), `canonicalSocketAddress` (`Iv`, `inboxAuth.ts`),
  `replyableTarget` (`aEn`, `inboxDelivery.ts`), `logForDebugging` (`t`, `../debug.ts`).
  Lo que no esté portado y esté fuera de tu alcance llega como dependencia inyectada,
  con su símbolo de referencia en el nombre del campo del docstring.
- Los esquemas zod de la referencia se validan a mano (el paquete no depende de zod),
  con las mismas cotas: longitudes máximas, `finite`, opcionales, `.catch(...)`, y
  descartando las claves no declaradas.
- Sin imports dinámicos. La palabra «Claude» con mayúscula no va en `src`.
- Nada de `/tmp` fijo: `os.tmpdir()` + `mkdtemp` en pruebas. Estado por anfitrión:
  cada prueba usa su propio anfitrión (`{}`) o resetea el estado en `afterEach`.
- Por cada guarda o rama nueva, comprueba que retirarla hace caer al menos una prueba.
- No commitees: deja los archivos en tu worktree.

Al terminar, las pruebas que tocaste deben quedar en verde. Responde con la lista de
archivos creados o cambiados y un resumen de dos líneas.

Ejecución en modo -p, sin nadie que te reanude:
- No corras `tests/run.sh` ni lances trabajos en segundo plano (`thyrox-bg`,
  `run_in_background`, `&`). Corre en primer plano sólo tus pruebas:
  `cd src/packages/local-observability && bun test __tests__/<archivo>`.
- No termines tu turno esperando una notificación: al terminar tu turno el
  ítem se cierra y lo que no esté escrito se pierde.
