# La causa del enfriamiento de todas las credenciales (CLIProxyAPI)

Porte de `ExtractUpstreamErrorSummary`/`SanitizeUpstreamErrorSummary` y de
`newModelCooldownErrorWithCause` de CLIProxyAPI (`sdk/cliproxy/auth/selector.go`,
MIT) al proxy local de `@thyrox/provider`.

## Qué queda

| Pieza | Dónde |
|---|---|
| resumen saneado, tope de 256 runas | `src/proxy/upstreamErrorSummary.ts` |
| `ModelCooldownError(model, provider, resetInMs, cause?)` con `last_upstream_error` | `src/proxy/credentialSelectors.ts` |
| el último error por credencial y `latestError` (el más reciente; a igual instante, el id mayor, como `scheduler.go`) | `src/proxy/resilience/credentialCooldown.ts` |
| un 429 escribe `quota` (como `MarkResult`): el selector distingue «enfriada» de «no disponible» | ídem |
| el servidor devuelve 429 + `Retry-After` + la causa cuando el selector rehúsa por enfriamiento | `src/proxy/server.ts` (`cooldownResponse`) |

Las tablas de casos de la referencia (`conductor_selection_cooldown_test.go`,
`handlers_error_response_test.go`) se convierten con `probes/port-tables.sh`,
que conserva el bloque `// Casos propios` del archivo al regenerarlo.

## Controles de anulación

`probes/annul-cause.sh` (salida: `outputs/annul-cause.out`) y la segunda
pasada del resumen con los casos propios (`outputs/annul-summary-own-cases.out`).

- Con sólo las tablas de la referencia, 9 de 20 variantes del resumen no
  caían: `no-json`, `no-prefix-json`, `no-code-join`, `no-root-fallback`,
  `no-query`, `no-file-ext`, `no-sk`, `no-invalid-token` y `js-space`. Las
  tablas miden el saneado, no la lectura del JSON ni el `\s` ASCII de RE2.
- Los candidatos que discriminan salieron de `probes/candidates.ts`, corrido
  con GNU Parallel contra cada copia anulada. Dos intuiciones fallaron al
  medir: `?token=…` lo redacta `NATURAL_SECRET` aunque falte la regla de
  consulta, y sólo un parámetro que ninguna regla de lenguaje natural nombra
  (`sig`) con un `|` en el valor separa `QUERY_PARAM` de `KEY_VALUE`; una ruta
  con extensión sólo la ve `FILE_EXT_PATH` tras una comilla invertida sin
  cerrar, que `UNIX_PATH` no admite como apertura.
- Con los casos propios caen las 20 variantes.
- Enfriamiento, causa y servidor: cada variante cae en al menos una de las dos
  suites (`proxyCredentialCooldown`, `proxyModelCooldownCause`); `no-tie-break`,
  `no-last-error`, `no-http-fallback` y `no-clear-error` sólo en la segunda, y
  `no-clear-quota` sólo en la primera.

*Métrica:* aserciones que caen por variante, sobre las suites nombradas.
*Ciega a:* un proveedor cuyo 429 no signifique cuota —aquí todo 429 lo es,
como en la referencia— y a si el cliente respeta `Retry-After`.
