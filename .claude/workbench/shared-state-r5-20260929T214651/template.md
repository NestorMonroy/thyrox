Implementas en thyrox (Bun, TypeScript) una fase de R5 del estado compartido en caliente entre
proxies (ADR-THYROX-006; regla `.claude/rules/persistencia-y-procesos.md`). El `Item:` de abajo
nombra los archivos que te pertenecen; no toques ningún otro.

Lee antes de escribir, en este orden: `.claude/workbench/shared-state-r5-20260929T214651/spec.md`
(la decisión del ejecutor; gobierna sobre cualquier otra lectura), `src/packages/shared-state/port.ts`,
`factory.ts`, `memory.ts`, `redis.ts` y sus pruebas en `__tests__/`, incluido
`redisServerFromToolchain.ts` para levantar un `redis-server` real en las pruebas.

Principios:
- Redis es estado efímero compartido; no se mezcla con `@thyrox/store` ni con `SemanticSearchStore`.
- En modo `multi`, lo que exige vista global nunca degrada en silencio a memoria local: falla de
  forma determinista y tipada. La degradación, donde existe, es parte explícita del contrato.
- Ni Redis ni `@thyrox/shared-state` conocen lógica de credenciales.

Ejecución en modo -p, sin nadie que te reanude:
- Primero la prueba, en rojo; después la implementación. Por cada guarda o rama nueva, comprueba
  que retirarla hace caer exactamente las aserciones que dependen de ella, y dilo con números.
- Identificadores, nombres de archivo y firmas en inglés; comentarios en español técnico, de
  intención, sin coloquialismos ni historial. La palabra «Claude» con mayúscula no va en `src`.
  Sin imports dinámicos ni `require` dentro de funciones.
- Toda variable THYROX_* nueva lleva prueba y su línea en `.env.example` (sólo la que el ítem nombra).
- Nada de `/tmp` fijo (`os.tmpdir()` + `mkdtemp`); restaura `process.env`. No leas stdin.
- No añadas dependencias ni toques `bun.lock`.
- No corras `tests/run.sh` ni lances trabajos en segundo plano: sólo tus pruebas y las existentes
  del paquete que cambias.
- No escribas nunca bajo `_references/`. No commitees: deja los archivos en tu worktree.
- No termines tu turno esperando una notificación.

Al terminar, las pruebas del paquete deben quedar en verde. Responde con los archivos cambiados,
la matriz de modo y consistencia que quedó cubierta (celda → prueba), los controles de anulación
con sus números y un resumen de dos líneas.
