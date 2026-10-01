# Fuente de verdad — ítem 1: coordinación del scheduling (TASK-THYROX-0699)

Decisión: ADR-007 1.11.0 y 1.12.0 (`kaupamex-docs: source/thyrox/adr/adr-007-podman-frontera-de-workers-y-redis-detras-de-puertos.rst`,
secciones «Redis coordina el scheduling, no lo decide» y «Topología del scheduler, fencing y compensaciones»).

Te pertenecen SÓLO estos archivos de `src/packages/model-scheduling/`:
`memoryCoordination.ts`, `redisCoordination.ts`, `coordinationFactory.ts`.

El contrato es `coordination.ts` (no lo cambies) y las pruebas que lo fijan, ya escritas y en rojo:
`coordinationContract.ts` (compartido por los dos adapters), `__tests__/memoryCoordination.test.ts`,
`__tests__/redisCoordination.test.ts`, `__tests__/coordinationTopology.test.ts`.

1. `createMemoryCoordination`: en el proceso; reloj inyectable (`now`); la misma semántica que Redis.
2. `createRedisCoordination(url)`: `Bun.RedisClient`, cada operación atómica en un script Lua
   (`EVAL`), como `src/packages/shared-state/redis.ts`. Por residencia: una clave con el lease
   (dueño y generación, con TTL) y una clave de generación SIN TTL que sube con `INCR` en el mismo
   script que adquiere. Renovar exige mismo dueño y misma generación con el lease vivo; caducado es
   `stale`. El lock de mutación es otra clave con TTL y sólo se concede si la propiedad es la vigente.
   Un error de conexión es `unavailable` (o `'unavailable'` en `currentGeneration`), nunca una
   excepción ni un lease local.
3. `openModelSchedulingCoordination(env)`: `local` → memoria; `shared` → Redis con
   `THYROX_REDIS_URL`; `shared` sin la URL lanza `SharedCoordinationUnavailableError`. Nunca mira
   `THYROX_PROXY_MODE`.

Semántica que las pruebas fijan: la primera adquisición da generación 1; cada adquisición nueva sube
la generación (también tras caducar); renovar no la cambia; una residencia nunca adquirida tiene
generación 0; soltar sólo actúa si el lease es el vigente.
