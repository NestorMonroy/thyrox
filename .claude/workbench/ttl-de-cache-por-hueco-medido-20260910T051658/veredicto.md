# El TTL de caché: el mecanismo está entero y su entrada nunca se declaró

## Lo construido, y dónde

| Pieza | Ruta |
|---|---|
| política | `src/packages/provider/src/cost/policy.ts:143` — `chooseCacheTtl(modelId, expectedGapMinutes)` |
| costura | `src/packages/agent/cacheTtl.ts:42` — `resolveCacheTtl(agent)` |
| emisión | `src/packages/agent/emit/markdown.ts:71` — escribe `experimental: cacheTtl:` |
| hook | `PreModelSwitch`, cableado en `/home/user/.claude/settings.local.json:22` y `kaupamex-docs/.claude/settings.json:208` |

## Lo que faltaba: la entrada, no el mecanismo

- `expectedGapMinutes` declarado: **0** definiciones.
- `experimental.cacheTtl` en agentes emitidos: **0 de 81** (api 27 · db 26 · ui 28).

Sin hueco declarado, `resolveCacheTtl` devuelve *«sin `expectedGapMinutes`: no
hay hueco que costear»* y el emisor no escribe nada. No es un defecto de la
costura: es que nadie le dio su parámetro.

## El hueco, medido

Agregado sobre `agent_sessions` con `usage_source='transcript'`, `turns>0`:

| subagent_type | n | turnos | ciclo por turno |
|---|---|---|---|
| general-purpose | 321 | 28 804 | 13.3 s |
| desconocido | 96 | 3 390 | 12.2 s |
| claude-code-guide | 2 | 12 | 15.8 s |
| pdca-coordinator | 1 | 35 | 8.9 s |
| Explore | 1 | 12 | 11.2 s |
| prueba-palancas | 1 | 2 | 4.0 s |
| **total** | | **32 255** | **13.1 s** |

## El veredicto que se sigue

`chooseCacheTtl` devuelve `5m` por debajo de 5 min y `1h` sólo por encima.
13.1 s queda **23× bajo el umbral**, así que para todos los tipos medidos el
veredicto es `5m` — que es además el default del cliente para `agent:*`
(`should1hCacheTTL` no lo lista).

**`1h` sería pérdida pura:** la escritura de caché a 1 h cuesta 1.6× la de 5 m
en todos los tiers del catálogo, y no compra nada cuando la entrada de 5 m no
llega a caducar entre turnos separados por 13 s.

Conclusión operativa: **el árbol emitido está correcto tal como está**, y ahora
por evidencia en vez de por omisión. Declarar `expectedGapMinutes` en las 81
definiciones emitiría el default en 81 archivos: ruido, no información.

## Lo que este banco NO cierra

El caso que sí justificaría `1h` es el agente que **espera de verdad** entre
turnos — una suite larga, una barrera. Ese perfil **no existe en la población
medida**, así que no se afirma nada sobre él. Condición de cierre: que aparezca
un tipo de agente cuyo ciclo por turno supere los 5 min, y entonces su
`expectedGapMinutes` se declara y el mecanismo lo emite solo.

Y la pieza del mismo subsistema que **sí** está desaprovechada es otra:
`dispatchPlan` tiene un único consumidor (`bin/crossModelReadGate.ts`). Es la
que paga — agentes del mismo tipo despachados juntos comparten clave de caché,
así que el segundo lee el piso que escribió el primero en vez de reescribirlo.
