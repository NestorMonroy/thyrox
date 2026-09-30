# R5 — el estado compartido deja de ser infraestructura disponible y pasa a ser runtime del proxy

Decisión del ejecutor (2026-09-29), sobre la revisión de R5.

## Separación

    Redis                 → backend compartido (efímero: coordinación, leases,
                            ventanas de rate limit, cooldowns compartidos)
    @thyrox/shared-state  → puerto + adaptadores + política de consistencia
    R5                    → cableado real de los consumidores
    C3                    → proceso que ejecuta ese proxy en producción

Redis no se mezcla con `@thyrox/store` (SQLite/PostgreSQL) ni con
`SemanticSearchStore` (PostgreSQL + pgvector). No es persistencia durable.

## Orden

R5a modo declarado → R5b wiring en startProxyServer → R5c lease/refresher en
producción → R5d regla + ADR → C3. R5 no espera a C3; tampoco se declara
"live" mientras C3 siga pendiente:

    R5a/R5b/R5c/R5d implemented and tested
    production activation blocked by C3

## Modo

`THYROX_PROXY_MODE=single|multi`, por defecto `single`. La presencia de
`THYROX_REDIS_URL` no infiere el modo.

    single + sin Redis      → memory permitido
    single + Redis          → Redis preferido; degradación a memory según el contrato
    multi  + sin Redis      → error de startup
    multi  + Redis vivo     → estado compartido activo
    multi  + Redis caído    → nada que exija vista global degrada en silencio a memoria

## Consistencia explícita, no fallback genérico

La semántica se declara por consumidor, verificable en pruebas:

    requiresGlobalConsistency  → en multi, Redis caído = fallo explícito y determinista
    bestEffortShared           → degrada a memoria local, con aviso, declarado en el contrato
    localAllowed               → memoria local siempre

Consumidores:

    refresh lease (createTokenRefresher)  → requiresGlobalConsistency
    global rate-limit window              → requiresGlobalConsistency
    cooldown compartido                   → bestEffortShared

## Wiring y lifecycle

    startProxyServer
          │
          ▼
    openSharedStateStore()
          ├── RateLimitManager
          ├── CredentialCooldown
          └── TokenRefresher

    RunningProxy.stop() → para Bun.serve y cierra el estado compartido; idempotente.

El proxy decide cuándo pide un refresh; `createTokenRefresher` lo coordina;
el estado compartido garantiza el lease. Ni Redis ni `@thyrox/shared-state`
conocen lógica de credenciales. El refresco proactivo (106e-5) reutiliza
`createTokenRefresher`, sin otro protocolo de lease.

## Controles antes de cerrar R5

    single + no Redis            → funciona con memory
    single + Redis caído         → degradación esperada
    multi + no URL               → startup falla
    multi + Redis caído          → lease y ventana global fallan; nunca memory silenciosa
    dos proxies + Redis real     → comparten ventana
    dos proxies + Redis real     → sólo uno obtiene el refresh lease
    dos proxies + Redis real     → cooldown visible según su contrato
    stop()                       → cierra Redis
    stop() dos veces             → no falla
    C3 ausente                   → R5 implementado, no presentado como runtime activo

Después: `persistencia-y-procesos.md` y ADR-THYROX-006 sin el estado
transitorio "Hasta R5…".

## El MITM de AgentBridge es cliente del proxy, no consumidor del estado compartido

`@thyrox/mitm` termina TLS de los hosts objetivo y reenvía al proxy local las
peticiones de chat cuyo modelo tiene alias; el resto va al host real o por
túnel TCP. Su "router" es la declaración del proxy local
(`serverConfig.ts`: `routerBaseUrl = proxyBaseUrl(env)`, `apiKey =
proxyClientKey(env)`), y los alias salen del store de AgentBridge
(`mitm/state`, SQLite, nivel B), no de Redis.

Consecuencias para R5:

    MITM → proxy local (HTTP) → estado compartido → Redis

- El lease, la ventana global y el cooldown viven en el proxy; el MITM no
  abre `@thyrox/shared-state` ni necesita el modo.
- Una petición reenviada por el MITM pasa por los mismos consumidores que
  cualquier otra: R5b la cubre sin tocar `@thyrox/mitm`.
- Los alias no se mueven a Redis: son configuración persistente, no estado
  efímero entre instancias.
- Varios MITM contra un solo proxy no requieren `multi`; `multi` lo decide
  cuántos proxies hay, no cuántos clientes.

## Fronteras que se conservan (decisión del ejecutor)

    MITM                → transporte/routing TLS
    Proxy               → política operativa y coordinación
    Redis               → estado efímero compartido
    AgentBridge SQLite  → aliases / configuración persistente

    MITM
    ├── terminación TLS para target hosts
    ├── routing hacia el proxy local
    ├── passthrough / raw TCP para bypass y hosts externos
    └── lectura de aliases desde AgentBridge state

    Proxy
    ├── refresh lease
    ├── global rate-limit window
    ├── shared cooldown
    └── lifecycle de @thyrox/shared-state

El MITM no conoce ni abre Redis, no decide `single|multi`, no adquiere leases
ni maneja ventanas globales. Nunca `MITM → Redis` ni `MITM → @thyrox/shared-state`.

    proxy count = 1  → single
    proxy count > 1  → multi
    (independiente de cuántos MITM o clientes haya delante)

## Controles añadidos a R5b

1. Mismo camino: una petición que entra por MITM → proxy pasa por el mismo
   `RateLimitManager` / `CredentialCooldown` / estado compartido que una
   enviada directamente al proxy. No hay un segundo camino de conducta.
2. Frontera verificable: una prueba impide que `@thyrox/mitm` importe
   `@thyrox/shared-state` o abra Redis.

Al cerrar R5b se reporta el flujo comprobado

    MITM request → proxy local → RateLimitManager / CredentialCooldown
                 → @thyrox/shared-state → Redis

y que `@thyrox/mitm` sigue sin dependencia de Redis ni del estado compartido.
