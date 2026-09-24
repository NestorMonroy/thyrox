# Adaptadores reales AgentMessage <-> CoreMessage

Directiva del ejecutor: adaptadores reales en las dos direcciones, conservando
la separacion de modelos, bajo el lazo agente + verificador + memoria
persistente (plan v2.2.0, con los gates 3b y 4).

Verificadores: `bunx tsc --noEmit` y `bun src/verify/message_shape_audit.ts`
(SHAPE001 lectura de doble forma, SHAPE002 cruce sin adaptador), los dos en el
formato que lee el lazo.

Linea base (`outputs/shape-baseline.txt`, sobre `src/packages/agent`, 319
archivos): 10 hallazgos — 7 SHAPE002 (createDeps.ts:328, 332, 336, 337, 424;
core/AgentLoop.ts:114, 117) y 3 SHAPE001 (core/AgentLoop.ts:158, 445, 446).

Fases:

- A. Verificador y regex del lazo (commit 9787041e).
- B. Adaptadores toCoreMessage/fromCoreMessage con referencia al original.
- C. Aplicacion masiva a los cruces SHAPE002 (gate 4).
- D. Retirar la compensacion del core: lecturas SHAPE001, el duplicado de
  buildAssistantMessage (ciego al auditor: es escritura, no lectura) y el
  defecto de aggregateUsage, primero con una prueba en rojo.
- E. Una sola definicion de CoreMessage dentro del core.
- F. (destapada en la fase C) `CompactableMessage`, la interfaz de lectura
  estrecha de la compactacion, se usa como tipo de RETORNO
  (`compactUtils.ts:57-60, 93, 141, 209`): el bucle recupera un tipo mas
  estrecho del que entrego (`query.ts:515, 1126`,
  `sessionMemoryCompact.ts:603`). Arreglo: funciones genericas
  `<T extends CompactableMessage>(messages: T[]): T[]`. Patron a registrar al
  abrir su paso: `narrow-input-type-returned-as-output`.
