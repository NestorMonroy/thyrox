# 106e-5c-2 — Kimi web en el refresco proactivo

Porte de `omniroute: open-sse/utils/kimiJwt.ts`, `src/lib/kimi/tokenRefresh.ts`,
`src/lib/tokenHealthCheckKimi.ts` y `getKimiWebBaseUrl` de
`open-sse/executors/kimi-web.ts`, repartido en tres módulos:

- `accounts/kimi/kimiJwt.ts` — caducidad leída del JWT.
- `accounts/kimi/kimiWebRefresh.ts` — el intercambio y su variante que persiste.
- `accounts/refresh/health/kimiWebHealthCheck.ts` — la hoja del barrido.

`red-106e5c2.txt` es la mitad roja; `annul-106e5c2.sh`, 36 anulaciones;
`rerun-106e5c2.sh` repite la 2 tras afilar su caso. `results-106e5c2.txt`:
las 36 discriminan.

## Divergencias declaradas

- El reloj se inyecta (`nowMs`, `now`) en vez de leer `Date.now()`.
- El JWT lo decodifica `jwtPayload.decodeJwtPayload`, el decodificador común
  del árbol, en vez de uno propio.
- La URL base la declara `THYROX_KIMI_WEB_BASE_URL`, no `KIMI_WEB_BASE_URL`.
- La conexión se lee de un store inyectado; `refreshKimiWebConnection` no
  importa el store global.
- La etiqueta del log usa `name` o `id`, con el tag `HEALTH_CHECK`, sin prefijo.
- El proveedor se compara en minúsculas también en la ventana, como ya hacía el
  despacho de `checkPlan`.
