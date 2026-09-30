# El `AppState = unknown` de hooks.ts es 1 de 9, y el patron esta DECLARADO

Fecha: 2026-09-19T02:45:00
Sucesor: TASK-THYROX-0203 · Hallazgo: H-THYROX-107
Antecedente: TASK-THYROX-0201 (porte de `HookCallbackMatcher`, `thyrox@bcdd6193`)

## La pregunta

El porte de `HookCallbackMatcher` cargo a thyrox la linea 19 de
`ccnmt: packages/agent/types/hooks.ts` —`type AppState = unknown`— con un
docstring que la llamaba «divergencia heredada» y decia *«la fuente declara
este alias como `unknown` … se porta con su forma, no con la que "deberia"
tener»*. El ejecutor pidio analizar el mismo archivo en el leak de Anthropic
(`Agent-Hunter/claude_code_leaked_source_code/.../src/types/hooks.ts`).

La premisa del docstring es cierta de ccnmt y **no** de la fuente ultima.

## Lo medido

### 1. Los tres simbolos portados son BYTE A BYTE identicos

```
diff <(sed -n '202,231p' LEAK) <(sed -n '201,230p' CCNMT)  ->  0 lineas
```

`HookCallbackContext` (leak :203 / ccnmt :202), `HookCallback` (:211 / :210) y
`HookCallbackMatcher` (:228 / :227) — un desplazamiento de una linea,
consistente con que ccnmt declare proceder del sourcemap leak v2.1.88.

### 2. El archivo entero diverge en 27 lineas, y NINGUNA es de los simbolos

Las 27 son: 8 rutas de import reescritas al alcance del monorepo
(`../utils/lazySchema.js` -> `@claude-code-how-works/tool-registry/...`), la
linea 19 (`import type { AppState } from '../state/AppState.js'` ->
`type AppState = unknown`), y el `_assertSDKTypesMatch` comentado con la razon
declarada: *«decompilation type mismatch makes these types non-equal»*.

### 3. El tipo real EXISTE en ccnmt y en thyrox, y es identico

| Arbol | Archivo | Bloque |
|---|---|---|
| leak | `src/state/AppStateStore.ts` | 89-452 |
| ccnmt | `packages/app-host/src/state/AppStateCompat.ts` | 89-455 |
| thyrox | idem | 89-455, **byte a byte identico a ccnmt** |

Su diff contra el leak es de **27 lineas**, y ccnmt es un COMPUESTO, no una
degradacion: quita `companionReaction`/`companionPetAt` y `skillImprovement`,
reescribe un comentario, y **anade** `activeGoal` con su comentario citando
*«Port of ant v2.1.132 (4472.js BTK setActiveGoal)»* — una version POSTERIOR
a la del leak. Toda futura decision de «degradacion contra diseño» depende de
saber que la referencia es leak-base + retiros + portes posteriores.

> Corregido en este mismo pase: un primer diff uso el rango 89-452 en los DOS
> archivos y publico que `channelPermissionCallbacks` faltaba en ccnmt. Era un
> artefacto del rango — el bloque de ccnmt cierra en 455, no en 452. El cierre
> se localiza con `awk 'NR>=89 && /^\}/{print NR}'`, no se asume.

### 4. El stub NO es un accidente: es 1 de 9, y ccnmt declara el patron

```
8 sitios  `export type AppState = unknown`
1 sitio   `export type AppState = Record<string, any>`   (tool-registry)
1 sitio   `export type AppState = DeepImmutable<{...}>`  (la declaracion real)
```

Los nombres de archivo lo dicen (`appStateCompatShim.ts`, `appStateShim.tsx`,
`AppStateCompat.ts`) y los docstrings lo citan: **V7 §7.2 — shim de solo-tipo
para que el paquete no importe `src/state/AppState` a nivel de modulo**. Es la
tecnica de partir un monolito en paquetes, no un artefacto de decompilacion.

Y `ccnmt: CLAUDE.md:274` fija el criterio de triaje, medido por ellos:

> when narrowing a `: unknown` shim via `import type` re-export, only
> **ACCESS-pattern** callers (`x.field`/`x.method()`) yield TS error
> elimination. **CONSTRUCTION-pattern** callers (`: T = {…}`) produce ZERO
> yield because `: unknown` already accepts every literal. Triage by `grep`
> before changing: ≥3 access sites = worth narrowing; type-annotation-only =
> skip.

### 5. `HookCallbackContext` tiene CERO consumidores en los tres arboles

```
leak   : solo su declaracion (:203) y el parametro `context?:` de HookCallback
ccnmt  : idem
thyrox : idem
```

Cero sitios de acceso. Por el umbral que la propia referencia declara, cae del
lado de **saltarse**. Lo que el porte SI desbloqueo son sus hermanos:
`HookCallbackMatcher` tiene hoy 2 importadores reales (`app-host/bootstrap/
state.ts`, `cli/headless/sdk/control/handlers.ts`) y `HookCallback` otros 2
(`agent/sessionFileAccessHooks.ts`, `cli/structuredIO.ts`).

## Por que un delta de tsc igual a 0 no habria decidido nada

Con 0 consumidores, estrechar el tipo da delta 0 — y un 0 ahi no separa «no hay
diferencia» de «el instrumento no pregunta». Es el sub-patron D. El control
positivo (`probes/control_unknown.ts`) mide el MECANISMO en dos mitades sobre
el mismo consumidor: con `unknown` un numero es asignable al retorno de
`getAppState`; con el tipo real la misma linea es un error, marcado con
`@ts-expect-error`. Si el mecanismo dejara de discriminar, tsc reportaria la
directiva como no usada y la mitad B se pondria roja.

Primera version del control: importaba `@thyrox/agent/types/hooks.js` y murio
con TS2307 — una invocacion suelta de `tsc` no resuelve el workspace. Se
reescribio autocontenido para que mida el mecanismo y no la resolucion.

## Desenlace

**No se estrecha en este pase.** Se corrige la premisa del docstring —que
atribuia a «la fuente» una decision que es de ccnmt y no del original— sin
tocar el tipo. El triaje de los 9 por patron ACCESS, y la direccion del import
`agent -> app-host` que implica (el ciclo de paquete ya existe: los dos
package.json se declaran mutuamente), es **TASK-THYROX-0203**.

*Metrica:* diff por rango de bloque localizado con `awk`, conteo de `grep -rn`
por simbolo en los tres arboles, y `tsc --noEmit` sobre el control.
*Ciega a:* si algun consumidor accede al estado por una via que no nombra
`getAppState` — el conteo mide el literal, no el flujo de datos; y a si el leak
v2.1.88 es a su vez derivado de algo, que no se puede medir desde aqui.

## Nota sobre el leak como referencia

`ccnmt` sigue siendo la referencia declarada de este porte. El leak es
**evidencia sobre ccnmt**, no una segunda fuente a la que el codigo apunte: por
eso su `file:line` vive en este banco y en el hallazgo, y el docstring de
`hooks.ts` enuncia el hecho sin citar una ruta de repositorio ajeno.
