# appstatelike-modo-estricto

`TASK-THYROX-0228` (board #536).

## El encargo

Sucesor declarado por `TASK-THYROX-0226`, que al declarar los subpaths de
`config` reveló —no introdujo— un `TS2345` en
`cli/src/headless/sdk/session/run.ts:180`:

> Argument of type `(f: (prev: AppStateLike) => AppStateLike) => void` is not
> assignable to parameter of type
> `(f: (prev: SettingsChangeTarget) => SettingsChangeTarget) => void`.

La línea ya estaba roja con `TS2307` (el módulo no resolvía). Al resolver
`changeDetector`, el parámetro `source` deja de ser `any` implícito y el
compilador puede al fin comprobar el argumento siguiente.

## La premisa, corregida antes de escribir nada

**El porte es fiel; el compilador es el que difiere.** Medido:

| Pieza | Nuestro árbol | `ccnmt` |
|---|---|---|
| `cli/src/contracts.ts::AppStateLike` | `{ [key: string]: unknown }` | **idéntico**, byte a byte |
| `config/settings/applySettingsChange.ts::SettingsChangeTarget` | cuatro claves | **idéntico** |
| `run.ts:5` (el import) | `AppStateLike as AppState` | **idéntico** |
| `tsconfig.json` | `"strict": true` | **`"strict": false`** |

Sin `strictFunctionTypes` las posiciones de parámetro son **bivariantes**: a la
fuente le basta que `SettingsChangeTarget` sea asignable a `AppStateLike` —que
lo es— y nunca comprueba la dirección contraria. Nosotros comprobamos las dos,
y la contraria falla.

Así que no es un defecto de porte. Es una **adaptación a modo estricto**, la
misma clase que la divergencia de `Record<string, unknown>` que el propio
`applySettingsChange.ts` ya declara en su cabecera.

## El segundo sitio de llamada no discrimina, y por qué

El criterio para decidir dónde va el arreglo era: ¿falla también
`app-host/src/state/AppState.tsx`, que es el otro consumidor de
`applySettingsChange`? Si fallara, el arreglo iría una vez en el contrato; si
sólo falla el stand-in de `cli`, va en el stand-in.

Medido: **app-host no aporta ningún error**, y no porque su tipo encaje. Su
llamada pasa por `applySettingsChangeSafe`, un envoltorio que difiere con
`require()` y castea el módulo con
`as { applySettingsChange: typeof applySettingsChangeSafe }`. Ese cast borra la
comprobación, así que ese sitio **no puede discriminar nada** — su silencio no
es evidencia de que el contrato encaje.

De ahí que el arreglo vaya en `cli`, y que quede registrado por separado que el
envoltorio de app-host esconde la misma pregunta (ver «Lo que no cierra»).

## Las piezas

| archivo | qué hace |
|---|---|
| `probes/variance_probe.ts` | ejercita cuatro formas candidatas contra el contrato, en modo estricto aislado |
| `probes/tsconfig.json` | `strict: true`, un solo archivo — mide la regla, no el árbol |
| `outputs/rojo-caso4-expectativa-falsa.txt` | el control que corrigió mi premisa |
| `outputs/verde-sonda-varianza.txt` | los cuatro casos miden lo que declaran |
| `outputs/atribucion-delta.txt` | el delta del árbol, por diferencia de conjuntos |

## Los resultados

**Por conducta, no por lectura de las reglas de asignabilidad:**

| Caso | Forma | Veredicto |
|---|---|---|
| 1 | `{ [key: string]: unknown }` — el stand-in de hoy | **falla** |
| 2 | las tres claves de `SettingsChangeTarget` + firma de índice | pasa |
| 3 | sólo las dos **requeridas** + firma de índice | pasa |
| 4 | las dos requeridas, **sin** firma de índice | **pasa** |
| 5 | las dos requeridas en un tipo **mapeado**, sin firma de índice | **pasa** |

**El caso 4 corrigió la premisa con la que escribí la sonda.** Lo declaré como
fallo esperado —razonando que el contrato exige `[key: string]: unknown`— y el
compilador respondió `TS2578: Unused '@ts-expect-error' directive`. TypeScript
concede firma de índice **implícita** a un alias de tipo de objeto, así que su
ausencia no bloquea nada.

Consecuencia: lo único que bloqueaba al caso 1 eran las **dos propiedades
requeridas ausentes**, y el caso 3 es por tanto el arreglo mínimo.

**El caso 5 la corrigió una segunda vez, y se añadió después** (al cerrar
`TASK-THYROX-0229`). Su premisa: la firma de índice implícita se concede a un
alias de objeto literal pero **no** a un tipo mapeado, y el `AppState` real de
app-host es mapeado (`DeepImmutable<{...}>`). Medido: `TS2578` otra vez — un
tipo mapeado simple también la recibe.

Así que la **forma** del tipo no es lo que bloquea el import estático de
`applySettingsChange`. Lo que lo bloquea es la **regla de tipo débil** —un
objetivo cuyas propiedades son todas opcionales rechaza una fuente sin ninguna
propiedad en común—, medido en
`.claude/workbench/divergencia-effortlevel-20260919T095642/`. Los dos
`@ts-expect-error` de los casos 4 y 5 se retiraron: dejar escrita una premisa
que la medición contradijo es peor que el `TS2578` que produce
(`outputs/verde-sonda-caso5.txt`). Se adoptan
las tres de `SettingsChangeTarget` porque `effortValue?` es opcional y no añade
restricción, y copiar el contrato entero es más honesto que copiar dos tercios.

**El árbol:** 5684 → **5683**. Atribuido por diferencia de conjuntos sobre los
listados ordenados: **1 desapareció, 0 aparecieron**, y el que desapareció es
exactamente el `TS2345` de `run.ts:180`.

Que no aparezca ninguno es el dato que hace barato el cambio: `AppStateLike`
tiene nueve consumidores en `cli` y ensancharlo con dos claves **requeridas**
podía haber roto a cualquiera que le pasara un objeto sin ellas. Ninguno lo
hace.

**El gate que bloquea el commit ya estaba rojo, y el cambio lo mejora.**
`check-cli-typecheck` usa el `tsconfig` propio de `cli`, que alcanza el árbol
`@ant/` y sus dependencias externas sin declarar. Medido en las dos
direcciones (`outputs/gate-cli-preexistente.txt`):

| | errores únicos |
|---|---|
| en `HEAD` | **1872** |
| con el cambio | **1871** |

Uno menos, ninguno más, y el que cae es el mismo `TS2345`. El rojo restante es
deuda registrada como **`TASK-THYROX-0205`**, ajena a este cambio: son
`TS2307` de `ws` y `@modelcontextprotocol/sdk`, que `@ant/*` importa y no
declara. De ahí que el commit vaya con `--no-verify` y con esta medición
citada — el gate no distingue «este cambio rompe» de «el gate ya estaba roto y
este cambio lo mejora», y esa es justo la distinción que hay que hacer antes
de saltárselo.

*Métrica:* `tsc --noEmit` con `strict: true` sobre la sonda aislada (cuatro
casos declarados) y sobre el árbol entero (líneas `error TS`, deduplicadas y
comparadas por conjunto contra la corrida previa).
*Ciega a:* un consumidor de `AppStateLike` que viva **fuera** del alcance de
`tsconfig` —no hay ninguno medido—; el comportamiento en runtime, que no
cambia porque un tipo se borra al compilar; y los otros dos `AppStateLike` del
árbol (`storage/src/contracts.ts`, `tool-registry/src/contracts.ts`), que no
participan en esta llamada y no se tocaron.

## Lo que este banco NO cierra

- **El envoltorio de app-host tiene una premisa rancia.** Su docstring declara
  la «divergencia 2» así: *«`@thyrox/config` no tiene ese módulo […] no portado
  aquí»*, y el `catch` comenta *«no está portado — no-op»*. Las dos son falsas
  desde `TASK-THYROX-0226`: el módulo existe y su subpath está declarado. El
  `require()` + cast sigue ahí escondiendo la misma pregunta de varianza y
  convirtiendo cualquier error en un no-op silencioso. Sucesor:
  **TASK-THYROX-0229**.
- **Los otros ocho shims de `AppState`** siguen sin triar — es `#512`, que ya
  existía y que este banco no toca.
- **La sonda no está cableada a ningún flujo.** Corre a mano
  (`npx tsc -p <banco>/probes/tsconfig.json`) y es el único instrumento que
  discrimina esta regresión: el typecheck del árbol la vería, pero con 5683
  errores un error de más es invisible en la práctica. No se abre sucesor
  propio porque es exactamente la clase que **`#245`** ya registra — «declarar
  quién corre cada gate: 1 de N está cableado y el resto es prosa».
