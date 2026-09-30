# El shim de AppState se estrecha en las FIRMAS, no en el alias

Fecha: 2026-09-19T02:54:00 · Tarea: TASK-THYROX-0203 · Hallazgo: H-THYROX-107
Antecedente: `.claude/workbench/appstate-shim-leak-20260919T024500/`

## La pregunta del ejecutor

> «¿debido a que estamos incluyendo el proxy a thyrox, esa DIVERGENCIA
> HEREDADA ya no aplicaría? yo creo que thyrox sí necesita AppState»

La conclusion es correcta y la razon no es el proxy: el proxy
(TASK-THYROX-0195/0196/0200) toca `shouldBypassProxy`, `getProxyUrl` y
`matchesCidrBlock` — configuracion de red, que no cruza con el estado de la
aplicacion. Lo que hace que thyrox necesite `AppState` es que thyrox porta el
harness COMPLETO, no un subconjunto: 392 errores de tipo nacen de ahi.

## El control de dos etapas, que es lo que localiza la causa

| Etapa | Cambio | Total | TS18046 |
|---|---|---|---|
| — | antes | 6872 | 1250 |
| 1 | `export type AppState = unknown` -> re-export del tipo real | 6865 (**-7**) | 1238 (-12) |
| 2 | + los 14 `unknown` de las FIRMAS -> `AppState` | **6264 (-608)** | **840 (-410)** |

La etapa 1 sola rinde **-12**. El alias casi no ata nada: el `unknown` que
gobierna esta escrito **literalmente en las firmas**, no derivado del alias.

```ts
export function useAppState<T>(selector: (state: unknown) => T): T
//                                        ^^^^^^^ aqui, no en el alias
```

Por eso `useAppState(s => s.authVersion)` daba `TS18046: 's' is of type
'unknown'` aunque el alias ya apuntara al tipo real.

**Ese contraste ES el control**, y discrimina mejor que revertir: si la causa
fuera el alias, la etapa 1 habria rendido las 410. Rindio 12.

## Delta por codigo (el veredicto, no el total)

```
TS18046  1250 ->  840   -410     'x' is of type 'unknown'   <- patron ACCESS
TS2698    194 ->   66   -128     spread de un tipo no-objeto <- {...prev}
TS7006    663 ->  625    -38     parametro con any implicito
TS2571     28 ->   11    -17
TS2345    584 ->  575     -9
TS2322    392 ->  384     -8
TS2339    481 ->  476     -5
TS2740      5 ->   10     +5     <- suben: el tipo real ahora EXIGE campos
TS2739      4 ->    5     +1
TS2367     15 ->   16     +1
```

Los **+7** son la señal de que el tipo esta haciendo su trabajo: un literal que
`unknown` aceptaba sin mirar ahora tiene que cumplir la forma. Un estrechamiento
que solo bajara cifras estaria aflojando, no apretando.

## Por que este sitio si y `HookCallbackContext` no

`ccnmt: CLAUDE.md:274` fija el umbral: estrechar rinde sobre consumidores de
patron ACCESS (`x.campo`), y desde tres sitios vale. Medido:

- `repl/src/appStateHooks.ts` — **340** sitios ACCESS -> se estrecha. Hecho.
- `agent/types/hooks.ts` (`HookCallbackContext`) — **0** consumidores en los
  tres arboles -> se salta. Sin cambio.

Mismo criterio, dos veredictos, porque la poblacion es distinta.

## El re-export no liga el nombre — defecto propio del pase

`export type { AppState } from '...'` reexporta y **no** deja `AppState` en
alcance del modulo. Las firmas no resolvieron hasta anadir el `import type`
hermano. Medido por el fallo, no supuesto.

## Lo que queda abierto

Quedan **8 shims** con la misma forma (`permission` 29 sitios, `swarm` 9,
`mcp-runtime` 8, `cli` 3, `tool-registry` 3, mas los que no usan `s`/`prev`).
Cada uno se mide por su propio conteo ACCESS antes de tocarlo — sigue siendo
TASK-THYROX-0203.

*Metrica:* `bunx tsc --noEmit` sobre el arbol entero, delta por codigo de error.
*Ciega a:* si los +7 nuevos son defectos reales del consumidor o formas que el
tipo real describe mal — eso exige leer cada uno; y a los sitios que acceden al
estado sin nombrar `useAppState`.
