# Análisis: OmniRoute, CLIProxyAPI y la pasarela del ejecutable 2.1.283

Directiva del ejecutor 2026-09-27: analizar qué aportan
`/home/user/nestormonroy/omniroute` (commit `a58000c7`, MIT) y
`_references/cliproxyapi` (commit `4a2c8186`, MIT), e implementarlo en
thyrox en TDD, usando `bin/binary` y GNU Parallel.

## Tres fuentes, tres papeles

| Fuente | Qué gobierna | Por qué |
|---|---|---|
| **Pasarela del ejecutable** (`chunk-wg7ts4cy.js`: `Jue`, `Dre`, `D_`, `so`, `hD`, `Cne`) | el lado Anthropic: esquema de configuración, `upstreams`, enrutamiento modelo→upstream, CIDR, proxies de confianza, límites y cabeceras `anthropic-ratelimit-unified-*` | es el contrato que el propio cliente consume; manda sobre las otras dos |
| **OmniRoute** (`open-sse/`, TypeScript) | 21 estrategias de enrutamiento (`strategyDispatch.ts:46-68`), traductores Claude⇄OpenAI⇄Gemini, enfriamiento por cuenta | mismo lenguaje que thyrox: porte casi literal |
| **CLIProxyAPI** (Go) | control de acceso por api-key (ya portado, `331e7e9a`), selectores de credencial | referencia cruzada cuando OmniRoute no cubre algo |

## Censo (GNU Parallel)

`probes/census_module.sh` sobre cada módulo de `open-sse/{services,translator,handlers}`:
`outputs/census-open-sse.tsv` (columnas: módulo, archivos, líneas, pruebas).

## Contrato del cliente medido con `bin/binary`

`outputs/client-contract-literals.txt`: dónde el ejecutable lee
`retry-after`, `x-should-retry`, `anthropic-ratelimit-unified-*`,
`overloaded_error`, `rate_limit_error`, `ANTHROPIC_BASE_URL`, `x-api-key` y
`anthropic-version`. `outputs/client-*.js`: los símbolos extraídos.

## Orden de porte

1. Enrutamiento modelo→upstream de la pasarela (`D_`, `so`, `Nv`, `mj`, `So`).
2. Cabeceras de límite unificado (`Cne`) y respuesta 429 (`hD.p`).
3. Estrategias de OmniRoute (`applyStrategyOrdering`, `targetSorters`, `rrState`).
4. Traductores Claude⇄OpenAI de OmniRoute.
5. Servidor que compone acceso + enrutamiento + estrategia + traducción.

## Fuera de alcance, declarado

- Almacén Postgres, OIDC y auditoría de la pasarela: exigen infraestructura
  que thyrox no provee; su contrato se conserva en `outputs/`.
- Ejecutores que automatizan interfaces web de terceros (`*-web.ts`) y
  logins que reutilizan el `client_id` de otro CLI.
