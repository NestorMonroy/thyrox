# #106e-4a — política alrededor del refresco

Primera de tres partes del orquestador de `omniroute:
open-sse/services/tokenRefresh.ts`: las piezas que no dependen de ningún
proveedor, cada una en su módulo de `src/accounts/refresh/`.

| Módulo | Qué |
|---|---|
| `refreshLead.ts` | cuánto antes de caducar se refresca, por proveedor y por conexión |
| `deprecatedProviders.ts` | proveedores retirados y su resultado definitivo con destino de migración |
| `genericRefresh.ts` | el grant `refresh_token` contra el extremo de un proveedor sin ruta propia |
| `persistContext.ts` | el guardado del resultado, que viaja con la llamada |
| `providerCredentials.ts` | los campos de credencial que consume cada proveedor |

| Archivo | Qué |
|---|---|
| `red-106e4a.txt` | la mitad roja |
| `annul-106e4a.sh` | 26 anulaciones |
| `results-106e4a.txt` | veredicto |

## Veredicto de las anulaciones

25 de 26 discriminaron. La **7** (quitar `typeof override === 'number'`)
no cambia la conducta: `Number.isFinite` no convierte su argumento, así que
un texto ya queda fuera. La comprobación queda porque es la que estrecha el
tipo para el compilador; no es una guarda de conducta.

## Divergencias declaradas

- **El refresco genérico no añade las cabeceras de identidad de codex.** En
  la referencia esa rama sólo se alcanza con `provider === 'codex'`, y codex
  nunca llega al refresco genérico: tiene su propia ruta. Era código muerto.
- **El refresco genérico recibe su extremo como argumento** en vez de leerlo
  de un registro global de proveedores (`PROVIDERS`), que aquí no existe.
- **`formatProviderCredentials` recibe el predicado de proveedor conocido**
  por la misma razón.
- **Sin contexto de proxy saliente**: el punto de inyección es `fetch`.
- Los nombres cambian a la forma de este árbol: `runWithOnPersist` →
  `runWithPersist`, `getActiveOnPersist` → `activePersist`,
  `getRefreshLeadMs` → `refreshLeadMs`, `getDeprecationNotice` →
  `deprecationNotice`; el caso `gemini-cli` del despacho es
  `deprecatedRefreshOutcome`.

Typecheck: build 0 errores; tests sólo los dos TS6059 preexistentes. `__tests__/accounts`: 387 tests, 0 fail (tsc-106e4a).
