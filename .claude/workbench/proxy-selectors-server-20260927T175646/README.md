# Selectores de credenciales (#75) y servidor proxy local (#77, primera parte)

## Fuentes

- `_references/cliproxyapi/sdk/cliproxy/auth/selector.go` (Go, sólo lectura):
  fill-first, round-robin por identidad, round-robin ponderado suave,
  niveles de prioridad y enfriamiento por modelo. Los casos de prueba se
  portaron de `selector_test.go`, con el nombre del caso de origen en el
  título.
- Ejecutable 2.1.283, `chunk-wg7ts4cy.js`, reflujado con `bin/binary reflow`
  en `.claude/workbench/omniroute-analysis-20260927T160306/outputs/reflow/`:
  `Jue` 22011-22540 (el `fetch` de `Bun.serve`), `Bv` 19301-19405 (reenvío
  con conmutación), `Mt` 18932 (cuerpo de error), `Yne`/`AD` 21995-22001
  (cabeceras de seguridad), `Xne`/`Qne`/`eie` 22002 (id de petición),
  `fj`/`Oh` 18849/18894 (rutas de inferencia).

## Reglas medidas y su control

| Regla | Fuente | Anulación → cae |
|---|---|---|
| conmutación en 5xx/429/401/403/404 | `Bv` 19360 | 6 casos (con los casos reordenados) |
| entre fallos gana 429, luego 401/403, luego 404, luego 501 | `Bv` 19392-19403 | el caso 404→429 |
| las cabeceras `x-gateway-*` no salen | `Jue` 22500 | el caso de conmutación |
| round-robin retoma tras la identidad, no el índice | `selector.go` 614-660 | pendiente de correr (su prueba está en la suite en curso) |

## Lo que la medición corrigió

La primera versión de la tabla de «gana el más informativo» ponía el estado
esperado en el PRIMER upstream en tres de cuatro casos. Con la conmutación
anulada esos tres seguían en verde: el primer upstream ya devolvía lo
esperado. No medían la conmutación. Reordenados —el esperado siempre
segundo—, la anulación tumba los seis casos que dependen de ella.

## Divergencias declaradas

En los docstrings de `credentialSelectors.ts` y `server.ts`: la afinidad por
sesión y la preferencia por websocket de Codex (con el servidor), la causa
aguas arriba del error de enfriamiento (su saneador, con los traductores),
la pasarela empresarial de `Jue` (OIDC, Postgres, gasto por usuario), y
`/v1/models`. El reenvío por SDK de proveedor de nube (`jv`) queda pendiente
en `upstreamForwarder.ts` hasta que haya un upstream de nube que servir.

## Reenvío HTTP propio, arranque y `/v1/chat/completions`

Todo lo que corre es código de thyrox: ni Claude Code ni su ejecutable se
cargan, invocan ni necesitan. Medido: con un `PATH` mínimo sin `claude`
(`env -i … PATH=<bun>:/usr/bin:/bin`), los 57 casos del proxy pasan.

| Mecanismo | Módulo | Anulación → casos que caen |
|---|---|---|
| guarda SSRF de la `baseUrl` en cada reenvío | `upstreamForwarder.ts` | 1 |
| plazo hasta las cabeceras (`wj`) | `upstreamForwarder.ts` | 1 |
| credencial sin material rehúsa | `upstreamForwarder.ts` | 1 |
| cabeceras `x-stainless-*` del cliente pasan (`lj`) | `upstreamForwarder.ts` | 1 |
| sólo escucha en loopback | `startServer.ts` | 1 |
| rehúsa arrancar sin clave local | `startServer.ts` | 1 |
| upstream enrutado sin endpoint | `startServer.ts` | 1 |
| `baseUrl` insegura al arrancar | `startServer.ts` | 1 |
| `_toolNameMap` no viaja al upstream | `chatCompletions.ts` | 1 |
| error del upstream en forma OpenAI | `chatCompletions.ts` | 1 |
| stream cierra con `data: [DONE]` | `chatCompletions.ts` | 1 |
| el nombre de herramienta vuelve al original | `chatCompletions.ts` | 1 |

Los traductores (subagente, clase 2) se verificaron aparte de su informe:
37/37 al correrlos, y la anulación de `convertStopReason` tumba 4 de 37.

## Lo que la medición corrigió aquí

- Tres aserciones `expect(promesa).rejects` sin `await` no medían nada: el
  caso pasaba antes de que la promesa se resolviera. Con `await`, cada una
  cae sola al anular su guarda.
- La primera anulación de `chatCompletions.ts` vació líneas con `NEW=""`, y
  `replace_literal` rehúsa un `OLD` vacío al restaurar: tres anulaciones
  quedaron puestas y la suite marcó 5/7. Se restauró a mano y se repitió con
  un `NEW` no vacío (`void 0 // anulado`); el conteo final de «anulado» en el
  archivo es 0.
- La anulación del retiro de `_toolNameMap` no tumbaba nada: sólo el caso con
  herramientas lo produce, y ése no lo afirmaba. Se añadió la aserción.

## Nombre del formato

Los traductores nombran el formato de cable por su API —`Messages`
(`messagesToOpenAIRequest`, `MessagesApiMessage`, `requestMessagesToOpenAI.ts`)—
y no por el producto: `check_product_word` rechaza «Claude» en el código de
thyrox (decisión del ejecutor 2026-09-27), y el renombre por token dejó 0
apariciones nuevas, con las 196 pruebas del proxy en verde.

## `/v1/models` y el catálogo de familias

- El catálogo de thyrox (`model/configs.ts`) tenía 13 familias; el
  ejecutable 2.1.283 declara 18 en `CATALOG_ID_TO_KEY`. Faltaban `sonnet5`,
  `opus5`, `opus55`, `fable5` y `fable51`: una lista de modelos construida
  sobre él habría omitido justo los más nuevos. Se añadieron con los ids de
  su `provider_ids`. Consumidores (suites de provider, agent, cli y repl):
  0 fallos; tsc sin errores nuevos.
- `/v1/models` porta `Ih`/`qv`. El orden (`opus46`, `sonnet45`, `haiku45` y
  el resto de `Ij` invertido) se resolvió en `chunk-t6pwageh.js`: en el
  extracto reflujado el nombre minificado `ace` colisiona con otro símbolo.
- Anulaciones: las cinco reglas tumban cada una su caso. El atajo de
  «upstream anthropic» no discriminaba hasta añadir un upstream anthropic
  con lista propia: sin lista, la regla general ya lo cubría.
