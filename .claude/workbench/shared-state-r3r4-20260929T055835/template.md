Implementas en thyrox (Bun, TypeScript) el consumo del estado compartido en caliente entre
proxies (ADR-THYROX-006, revisión 1.1.0; regla `.claude/rules/persistencia-y-procesos.md`) por un
consumidor ya existente de `@thyrox/provider`. El `Item:` de abajo nombra los archivos que te
pertenecen; no toques ningún otro.

Lee antes de escribir: `src/packages/shared-state/port.ts` (el puerto `SharedStateStore`),
`src/packages/shared-state/memory.ts` (`createMemorySharedStateStore`, úsalo en las pruebas) y
`src/packages/shared-state/factory.ts`. No cambies nada de `src/packages/shared-state/`. Se importa
como `@thyrox/shared-state/port.ts` y `@thyrox/shared-state/memory.ts`; la dependencia ya está
declarada en `src/packages/provider/package.json`.

Principio del diseño: el puerto es OPCIONAL en el consumidor. Sin él, la conducta de hoy queda
exactamente igual (y una prueba lo demuestra). Con él, la vista pasa a ser global entre proxies.
Ningún consumidor escribe comandos de Redis: sólo el puerto.

Ejecución en modo -p, sin nadie que te reanude:
- Primero la prueba, en rojo; después la implementación. Por cada guarda o rama nueva,
  comprueba que retirarla hace caer al menos una prueba, y dilo en tu respuesta.
- Simula dos proxies con DOS instancias del consumidor que comparten UN mismo store en memoria.
- Identificadores en inglés; comentarios en español, de intención, sin historial ni fechas.
  La palabra «Claude» con mayúscula no va en `src`. Sin imports dinámicos.
- Nada de `/tmp` fijo; restaura `process.env` si lo tocas. No leas stdin.
- No añadas variables de entorno nuevas, ni dependencias, ni toques `bun.lock` ni `.env.example`.
- No corras `tests/run.sh` ni lances trabajos en segundo plano. Corre en primer plano sólo tus
  pruebas y las pruebas existentes del archivo que cambias.
- No escribas nunca bajo `_references/`. No commitees: deja los archivos en tu worktree.
- No termines tu turno esperando una notificación: lo que no esté escrito se pierde.

Al terminar, las pruebas que tocaste deben quedar en verde. Responde con la lista de archivos
creados o cambiados, los controles de anulación que hiciste y un resumen de dos líneas.
