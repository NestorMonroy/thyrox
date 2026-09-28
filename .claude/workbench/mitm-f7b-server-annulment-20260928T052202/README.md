# Anulación — F7b: el servidor MITM

Sujeto: `src/packages/mitm/src/server/mitmServer.ts` (y `issueLeafCertForHosts`).

Método: cada mitad de juicio se retira con `bin/replace_literal`, se corre
`__tests__/server/mitmServer.test.ts` y se restaura. Resultados verbatim en
`results.txt`.

Cada anulación tumba su caso: la cabecera de tráfico propio, los patrones de
chat, la guarda de reentrada, la verificación TLS del upstream, el modelo en
la URL, el saneado del error, el nivel de registro, la entrega local de un
CONNECT a destino, la hoja con todos los hosts, la lectura de `bypass.json`,
el contador de interceptadas y la aplicación del alias.

Lo que NO discrimina, declarado: `if (!config.ingestToken) return` en
`captureToInspector`. Retirado, nada cambia, porque `postIngestEntry` ya
rehúsa sin token; el atajo sólo ahorra construir la entrada.

Métrica: casos `(fail)` de bun:test por anulación.
Ciega a: puertos privilegiados (el servidor escucha en uno libre), DNS real
(la IP se inyecta) y clientes reales de cada agente.
