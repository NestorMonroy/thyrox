# #106e-5d-3 — conexiones como credenciales del proxy local

Porte de `isTerminalConnectionStatus` y de los campos que
`materializeConnection` entrega (`omniroute: src/sse/services/auth.ts`, MIT)
al tipo `ProxyCredential` que ya consumen los selectores del proxy.

- `red-106e5d3.txt`: la mitad roja, antes del módulo.
- `annul-106e5d3.sh`: 21 anulaciones, una por decisión.
- `results-106e5d3.txt`: fallos por anulación.

Divergencias con la referencia:

- La prioridad se invierte (`String(0 - priority)`): en el store la menor
  gana y en `highestPriorityCredentials` la mayor.
- La exclusión terminal y el enfriamiento no filtran filas: se expresan como
  `disabled` y `unavailable`/`nextRetryAfter`, que el selector ya honra.
- La excepción de OpenRouter (`credits_exhausted` no bloquea modelos `:free`)
  y la fallback sin autenticación no se portan en este paso: dependen del
  modelo pedido, que esta vista no recibe.
