# Portar HookCallbackMatcher y su cadena — TASK-THYROX-0201

Directiva del ejecutor 2026-09-19: *«si no esta portado ... se tiene que
portar»*, sobre la DIVERGENCIA DECLARADA que TASK-THYROX-0200 habia escrito en
`app-host/bootstrap/state.ts`. La forma inventada (`InternalHookMatcher`, con
`hooks: unknown[]`) se retira; se porta el simbolo de la fuente.

## Que se porto

| Simbolo | Fuente | Hogar aqui |
|---|---|---|
| `HookCallbackContext` | `ccnmt: packages/agent/types/hooks.ts:202` | `src/packages/agent/types/hooks.ts` |
| `HookCallback` | `:210` | idem |
| `HookCallbackMatcher` | `:227` | idem |
| `HookInput` | `ccnmt: packages/headless-sdk/src/coreTypes.generated.ts:69` | idem — stub estructural |
| `AppState` | `ccnmt: packages/agent/types/hooks.ts:19` | idem — DIVERGENCIA HEREDADA |
| `PluginHookMatcher` | `ccnmt: packages/config/settings/types.ts:1130` | `src/packages/config/settings/types.ts` |

`HookInput` viaja como **stub estructural** y no como tipo rico porque la
fuente misma lo declara asi en su capa generada, vecino inmediato de los tres
stubs de salida que este arbol ya portaba de `:70-72`. `@thyrox/headless-sdk/
agentSdkTypes.ts` no lo publica: solo declara `HookEvent`, y como `unknown`.

`AppState` se porta como `type AppState = unknown` **con la forma de la
fuente**, no con la que «deberia» tener. Cambiarla aqui haria que el contrato
de `HookCallbackContext` divergiera del de la fuente sin decision que lo
respalde.

## CONTROL

```
grep -c "Module '\"@thyrox/app-host/bootstrap/state.js\"' has no exported member"
  -> 0
```

`hooks.ts`: **0 errores**. `state.ts`: solo los 6 TS2307 preexistentes de
`@opentelemetry/*` y `@anthropic-ai/sdk`, que son imports SOLO DE TIPO y ya
estaban antes del porte.

## Delta medido — 7227 -> 7018 (-209)

Ver `outputs/delta-por-codigo.txt`. El dominante es **TS2305 -195**, que es la
cadena que el porte cierra: `state.ts` exporta ahora los 230 simbolos y sus
importadores dejan de pedir miembros ausentes.

## La PREDICCION de la tarea NO se cumplio, y eso es un resultado

La tarea predijo: *«`hooks: unknown[]` aceptaba cualquier arreglo;
`hooks: HookCallback[]` no. Si algun consumidor construye un matcher interno
con una forma que no cumple `HookCallback`, el porte lo destapa como
TS2322/TS2345»*.

Medido: **TS2322 392 -> 392** y **TS2345 583 -> 583**, delta 0 en los dos.
Ningun consumidor construye un matcher malformado. El estrechamiento del tipo
no destapo nada — es evidencia de que la forma inventada coincidia con la real
en todos los sitios de construccion vivos, no de que el control no discrimine.

## Lo que SI se movio hacia arriba, nombrado

- **TS7016 +12** — los doce son `module 'lodash-es/memoize.js'`, en 12 archivos
  de `src/packages/provider/`. Un solo origen: falta `@types/lodash-es`. Es
  cascada de resolucion que avanza, no defecto del porte. Sucesor abierto.
- **TS2304 +1** — `config/settings/types.ts(261,10): Cannot find name
  'HookCommand'`. **Ese SI era mio**: el porte de `PluginHookMatcher` uso
  `HookCommand[]` sin importarlo. Corregido en el mismo pase importandolo de
  `./schemas/hooks.js`, que es el mismo hogar del que la fuente lo importa
  (`ccnmt: packages/config/settings/types.ts:31`) y que en este arbol ya lo
  exporta (`schemas/hooks.ts:131`). Verificado: 0 lineas de tsc para ese
  archivo.
- **TS2352 +1** — sin investigar; queda declarado, no explicado.

*Metrica:* `bunx tsc --noEmit` sobre la raiz, agrupando por codigo de error.
*Ciega a:* si un error que desaparecio lo hizo porque se arreglo o porque su
archivo dejo de ser alcanzable — el conteo por codigo no distingue las dos.
