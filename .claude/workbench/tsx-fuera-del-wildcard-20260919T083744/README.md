# Un `.tsx` fuera del wildcard: `./*.js -> ./*.ts` no lo alcanza

**Cita durable:** TASK-THYROX-0007 — «Declarar el subpath raíz y los subpaths
vivos de los 28 paquetes hermanos» (board #282 en esta sesión; el ordinal es
ambiguo y `task_ids cita` lo rehúsa, por eso se cita el id del store).

## Qué se preguntaba

Dos rojos de `repl` llegaron a este pase declarados como «huecos de
declaración» de una línea:

1. `Export named 'getCurrentProjectConfig' not found in module config/index.ts`
2. `Cannot find module '@thyrox/agent/localAgentTask.js'`

**Las dos premisas eran falsas, cada una por una razón distinta.**

## Premisa 1 — falsificada: no es un hueco de declaración, es un porte parcial

La «confirmación» de que la función existía era esta línea:

```
src/packages/config/global/config.ts:28: *   la mitad de PROYECTO (`getCurrentProjectConfig`, ...
```

Es un **docstring**, no una definición. Medido:

| | nuestro | la fuente |
|---|---|---|
| `config/global/config.ts` | 903 líneas | 1883 líneas |
| símbolos exportados | 29 | 46 |

**17 símbolos exportados existen sólo en la fuente**, entre ellos
`getCurrentProjectConfig` y `saveCurrentProjectConfig`. El archivo declara su
propia parcialidad en su docstring («la mitad de PROYECTO»), así que el porte
fue deliberado y su mitad diferida nunca se cerró.

Sujeto real: `porte-completo-no-parcial`, no `exports`. Queda fuera de este
banco; su evidencia está en `outputs/rojo-config-porte-parcial.txt`.

*Métrica:* símbolos que casan `^export (async )?(function|const|class|type|interface) NOMBRE`,
comparados con `comm` entre fuente y puerto.
*Ciega a:* un símbolo reexportado desde otro archivo del mismo paquete, y a
uno exportado con una forma sintáctica distinta (`export { x }`).

## Premisa 2 — cierta en el efecto, equivocada en la causa y en el tamaño

La causa no es «falta la clave `./localAgentTask`». Es que **el destino de un
wildcard lleva la extensión literal**:

```json
"./*":    "./*.ts",
"./*.js": "./*.ts"
```

`localAgentTask` es un **`.tsx`**. Ningún wildcard del paquete lo alcanza, y
*ninguno puede*: `*` sustituye el segmento, no la extensión.

Y no es un archivo: **17 entradas en 5 paquetes**, con el mismo defecto.

## Cómo se derivó la forma — de la fuente, no inventada

`ccnmt` **sí** declara `exports` (agent 175 entradas, app-host 31, permission
47), y declara cada `.tsx` con una clave explícita:

```json
"./localAgentTask.js": "./localAgentTask.tsx"
```

`probes/derive_tsx_exports.py` toma esa forma, cruza cada entrada con (a) si
la clave ya está en nuestro mapa y (b) si el archivo destino existe aquí, y
emite el plan. 17 entradas, las 17 con destino `PRESENTE`, **0 colisiones de
mismo stem** (un `x.ts` junto a un `x.tsx` quedaría sombreado en silencio).

## La mitad roja, por conducta

`probes/probe_resolution.sh` importa cada specifier **desde `src/packages/repl`**,
no desde la raíz. Eso importa:

> **Sub-patrón D con el instrumento como sujeto.** La primera sonda corrió
> `bun -e` en la raíz del repo, que **no declara ningún hermano** como
> dependencia (`@thyrox/app-host` → NO DECLARADO). `@thyrox/app-host/state/AppState.js`
> salió `FALLA` ahí y `OK` desde repl — el mismo árbol, dos veredictos. El
> `FALLA` medía el manifiesto de la raíz, no el mapa de app-host.

Corregido el instrumento, la mitad roja es `outputs/rojo-resolucion.txt`:
**17 de 17 fallan nombrando su propio specifier.**

## La mitad verde, y su discriminación

Tras aplicar el plan (`outputs/verde-resolucion.txt`):

```
ANTES  : 17/17 el error nombra el specifier pedido
DESPUES: 0/17  el error nombra el specifier pedido
```

3 importan limpio; los otros 14 **cambiaron de clase de error**: el subpath ya
resuelve y el fallo se movió aguas abajo, a las dependencias transitivas del
propio módulo —`Cannot find package` (8: ajv, chalk, chokidar, figures, execa,
`@anthropic-ai/sandbox-runtime`), `Cannot find module '@thyrox/...'` (4) y
`Export named ... not found` (2)—. Las dos primeras clases son el sujeto de
TASK-THYROX-0224; la tercera es porte parcial.

El truncado del mensaje a 60 caracteres hizo que una primera comparación
literal publicara «antes 3/17»: artefacto del instrumento. El discriminador
correcto compara por **prefijo** (`outputs/discriminacion.txt`).

## El control de anulación

Retiradas las 17 entradas con `--revert`, **17 de 17 vuelven a fallar nombrando
su propio specifier** (`outputs/anulacion-veredicto.txt`). Retirada la causa
cae exactamente lo que dependía de ella, ni una más.

## Lo que este cambio NO mueve, declarado

`bun test src/packages/repl` sigue en **504 pass / 5 fail / 1 error**, idéntico
a antes. Los 5 fails son `isBgAgentPanelEnabled` y `shouldHideTasksFooter`
—otro sujeto— y el `1 error` es la premisa 1, que es porte parcial.

Publicar este cambio como «cierra los rojos de repl» sería falso: cierra
**17 subpaths que no resolvían**, medido por su propia sonda, y el delta de la
suite de repl es **cero**.

## El diff

Sólo adiciones: 23 líneas insertadas, 6 borradas — y las 6 son la coma que el
último elemento del mapa no llevaba. Ningún reordenamiento.

| paquete | entradas | mapa |
|---|---|---|
| agent | 6 | 38 → 44 |
| permission | 8 | 18 → 26 |
| app-host | 1 | 31 → 32 |
| config | 1 | 11 → 12 |
| provider | 1 | 12 → 13 |

## Qué queda abierto

`outputs/rojo-censo-tsx.txt` cuenta 28 `.tsx` con importadores externos; 11 de
ellos no entraron al plan porque **su clave ya estaba declarada** (app-host ya
tenía `./state/AppState.js`, `./context/stats.js`, …). El censo contaba
importadores, no resolución: es una cota superior, no una lista de defectos.
