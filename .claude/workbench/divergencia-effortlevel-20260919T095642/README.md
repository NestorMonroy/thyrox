# divergencia-effortlevel

`TASK-THYROX-0229` (board #537).

## El encargo

`app-host/src/state/AppState.tsx` difería `applySettingsChange` con
`require()` + cast, y declaraba su razón así:

> `@thyrox/config` no tiene ese módulo (es
> `config/settings/applySettingsChange.ts` en ccnmt; **no portado aquí**,
> fuera de los 16)

…con el `catch` comentando *«no está portado — no-op»*. Las dos afirmaciones
dejaron de ser verdad con `TASK-THYROX-0226`. El encargo: medir si el import
estático compila ahora; si sí, retirar el envoltorio; **si no, corregir la
razón declarada por la real**.

## La premisa, medida en dos pasos

**Paso 1 — el módulo existe y carga.** Desde dentro de `app-host`, que declara
`@thyrox/config` como `workspace:*`:

```
$ bun -e "const m = await import('@thyrox/config/applySettingsChange'); ..."
OK — exports: applySettingsChange
```

La razón declarada es falsa, confirmado.

**Paso 2 — el import estático NO compila igual.** Y ése es el resultado que
cambia el desenlace: el envoltorio se queda, con otra razón.

## Por qué no compila: tres intentos, tres mediciones

| Intento | Qué se midió | Resultado |
|---|---|---|
| import estático a secas | árbol 5683 → **5684** | aparece un `TS2345` y no desaparece ninguno |
| contrato genérico `<Target extends SettingsChangeTarget>` | ídem | la inferencia cae al **límite** (`Target = SettingsChangeTarget`); el mensaje sigue nombrándolo |
| argumento de tipo explícito `applySettingsChange<AppState>(…)` | ídem | `TS2344`: `AppState` no satisface la restricción |

El tercero es el que dio la causa real, en su línea de explicación:

> Types of property `settings` are incompatible. Type `{…68 claves…}` **has no
> properties in common with** type `{ effortLevel?: unknown }`.

Es la **regla de tipo débil** de TypeScript: un destino cuyas propiedades son
todas opcionales rechaza un origen que no comparte ninguna. Y no comparte
ninguna porque **nuestro esquema de settings no declaraba `effortLevel`** —
que es exactamente la divergencia que `applySettingsChange.ts` llevaba escrita
en su cabecera desde que se portó.

## Lo que sí se cerró: la divergencia, no el envoltorio

`ccnmt: packages/config/settings/types.ts:744` declara `effortLevel` con
`.enum([...]).optional().catch(undefined)`. Nuestro puerto lo omitió, y el
cuerpo de `applySettingsChange` lo compensaba leyendo
`getInitialSettings() as Record<string, unknown>` — un cast declarado como
divergencia.

Se portó la clave con su `.catch(undefined)`, y el cast se retiró: el cuerpo
vuelve a la forma de la fuente. **El archivo ya no declara ninguna
divergencia.**

Coste: **cero**. El árbol queda en 5681 ubicaciones de error antes y después
(`outputs/atribucion-por-ubicacion.txt`), y el subconjunto derivado da
523 pass / 15 fail idéntico en las dos direcciones
(`outputs/control-subconjunto-derivado.txt`).

## Por qué el envoltorio se queda, y no es deuda

Con `effortLevel` declarado, la regla de tipo débil ya no bloquea — pero el
import estático **sigue sin compilar**, por una razón que ninguna clave de
esquema arregla:

`applySettingsChange` recibe un actualizador que **devuelve**
`SettingsChangeTarget` (cuatro claves). El `setState` de app-host necesita uno
que devuelva `AppState` (~80 claves requeridas). Cuatro no pueden producir
ochenta, y la covarianza del retorno lo comprueba. La fuente no lo ve porque
`"strict": false` apaga esa comprobación entera.

Así que el `require()` + cast es **load-bearing**, y lo era ya cuando su razón
escrita era falsa. Ahora la razón escrita es la medida.

## Y el `catch` deja de ser silencioso

El envoltorio tragaba **cualquier** error como si fuera la ausencia del módulo.
Con el módulo presente, un fallo real dentro de `applySettingsChange` se
convertía en un no-op sin rastro. El no-op se conserva —cambiarlo sería
cambiar la conducta sin medirla— pero ahora escribe por `logForDebugging`.

## Los resultados

| Eje | Antes | Después |
|---|---|---|
| `effortLevel` en el esquema | ausente | declarado, con el `.catch(undefined)` de la fuente |
| divergencias declaradas en `applySettingsChange.ts` | 1 | **0** |
| razón del envoltorio de app-host | falsa («no portado») | medida (varianza en modo estricto) |
| `catch` del envoltorio | silencioso | deja rastro |
| ubicaciones de error del árbol | 5681 | **5681** |
| subconjunto derivado | 523 / 15 | **523 / 15** |

*Métrica:* `tsc --noEmit` del árbol entero comparado por
`archivo(línea,col): error TSxxxx` —no por el texto del mensaje, que cambia al
añadir una clave al esquema—; y `bun test src/packages/config/__tests__/`,
corrido en las dos direcciones sobre el mismo árbol.
*Ciega a:* la conducta en runtime del `.catch(undefined)` de zod ante un valor
de disco fuera del enum, que no se ejercitó; y a si los 15 rojos
pre-existentes del subconjunto esconden alguno que este cambio habría
destapado — su causa es un error de módulo que aborta la carga antes de
evaluar.

## Lo que este banco NO cierra

- **El envoltorio sigue ahí.** Retirarlo exige cambiar el contrato portado de
  `applySettingsChange` —o el tipo `AppState`— y ninguna de las dos es una
  decisión que esta tarea deba tomar sola. El eje es el mismo que **`#512`**
  («triar los 9 shims de `AppState`»), que ya existía.
- **`fastMode` y `agent` siguen como `z.unknown()`** en nuestro esquema donde
  la fuente los declara con forma. No se tocaron: sólo se cerró la divergencia
  que este archivo declaraba.
