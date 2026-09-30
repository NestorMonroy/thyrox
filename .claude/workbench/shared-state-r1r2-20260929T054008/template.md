Implementas en thyrox (Bun, TypeScript y shell) una pieza de la capa de estado compartido
en caliente entre proxies (ADR-THYROX-006, revisión 1.1.0; regla
`.claude/rules/persistencia-y-procesos.md`). El `Item:` de abajo nombra los archivos que te
pertenecen; no toques ningún otro.

Lee antes de escribir: `src/packages/shared-state/port.ts` (el puerto `SharedStateStore`) y
`src/packages/shared-state/contract.ts` (la suite de contrato
`describeSharedStateStoreContract(label, create)`, que todo adaptador debe pasar). No cambies
esos dos archivos: si el contrato te parece mal, dilo en tu respuesta y no lo toques.

Ejecución en modo -p, sin nadie que te reanude:
- Primero la prueba, en rojo; después la implementación. Por cada guarda o rama nueva,
  comprueba que retirarla hace caer al menos una prueba, y dilo en tu respuesta.
- Identificadores en inglés; comentarios en español, de intención, sin historial ni fechas.
  La palabra «Claude» con mayúscula no va en `src`. Sin imports dinámicos.
- Nada de `/tmp` fijo: `os.tmpdir()` + `mkdtemp`; limpia en `afterEach`/`afterAll` y restaura
  `process.env`.
- Toda variable THYROX_* que se lea necesita una prueba y su línea en `.env.example` (sólo el
  ítem que lo diga toca `.env.example`).
- No añadas dependencias a ningún `package.json` ni toques `bun.lock`.
- No corras `tests/run.sh` ni lances trabajos en segundo plano. Corre en primer plano sólo tus
  pruebas.
- No escribas nunca bajo `_references/`. No commitees: deja los archivos en tu worktree.
- No termines tu turno esperando una notificación: lo que no esté escrito se pierde.

Al terminar, las pruebas que tocaste deben quedar en verde. Responde con la lista de archivos
creados o cambiados, los controles de anulación que hiciste y un resumen de dos líneas.
