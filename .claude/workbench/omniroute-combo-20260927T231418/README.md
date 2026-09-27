# Banco — combos de OmniRoute en el proxy local

Un combo es un modelo servido por varios upstreams. La estrategia decide en
qué orden se prueban; la conmutación ante un fallo ya la hacía el bucle de
`server.ts`. Porte de `applyStrategyOrdering` (`open-sse/services/combo/
applyStrategyOrdering.ts`), del round-robin de `roundRobinCombo.ts` y
`rrState.ts`, y de `comboMetrics.ts`, de OmniRoute (a58000c7, MIT).

## Qué se portó

- `combo/comboMetrics.ts`: totales por combo y los mismos contadores por
  modelo y por destino, con tasas derivadas, desalojo al pasar de 500 combos
  y vencimiento de una hora. Es una instancia, no un almacén del proceso; el
  vencimiento se aplica al leer. Sin métricas en sombra, intenciones ni
  diversidad de proveedores.
- `combo/comboRouter.ts`: once estrategias — `priority`, `fill-first`,
  `weighted`, `round-robin` (con lote pegajoso), `random`, `strict-random`,
  `p2c`, `least-used`, `cost-optimized`, `context-optimized` y `lkgp` — sobre
  los ordenadores ya portados en `targetSorters.ts` y la baraja de
  `shuffleDeck.ts`, que hasta ahora nadie usaba. `recordOutcome` deja las
  métricas, el último destino bueno y el puntero del round-robin, que sigue
  al destino que de verdad sirvió.
- Cableado: la entrada de `routing.models` declara `strategy` y, para
  `weighted`, `weights` por upstream. `server.ts` ordena los upstreams que
  sirven el modelo y deja al final los que no, que sólo aportan su motivo de
  rechazo; al terminar registra el desenlace con sus conmutaciones.
  `startServer.ts` crea siempre el router (una entrada sin estrategia no
  cambia nada) y toma `combos.stickyRoundRobinLimit`.

Sin portar, y declarado en la cabecera de `comboRouter.ts`: las estrategias
de cuotas, reinicios y catálogo con puntuación (`reset-aware`,
`reset-window`, `headroom`, `quota-weighted`, `quota-share`, `auto`,
`cache-optimized`) y las que despachan a varios modelos a la vez (`fusion`,
`pipeline`, `context-relay`). Una estrategia desconocida rige como el orden
declarado.

## Pruebas y anulaciones

Las pruebas son propias: los casos de `service-combo-metrics.test.ts` de la
referencia se reescribieron sobre una instancia, porque la referencia prueba
su almacén global.

- `comboMetrics`, 8 de 8 (`outputs/annul-combo.out`).
- `comboRouter`, 16 de 17. En la primera pasada tres no discriminaban:
  - `random`: la prueba sólo comparaba el conjunto; ahora compara el orden
    con la fuente aleatoria fija;
  - `rr-sticky`: con lote, el puntero no avanza al programar, así que la
    guarda sólo decide cuando sirvió otro destino que el programado; ése es
    el caso nuevo (`outputs/annul-combo-router-gaps.out`);
  - `context-unknown` es redundante: sin ninguna ventana conocida, el orden
    estable por cero da el mismo resultado que devolver la lista. La guarda
    sólo ahorra el recorrido.
- El cableado (`outputs/annul-combo-wiring.out`): el servidor, 7 de 7, y
  `startServer`, 2 de 2. `unknown-strategy` no discriminaba al principio,
  porque una estrategia desconocida da el mismo orden que el declarado; la
  diferencia es que no debe contar como combo, y eso afirma ahora su caso
  (`outputs/annul-server-combo-gap.out`).
