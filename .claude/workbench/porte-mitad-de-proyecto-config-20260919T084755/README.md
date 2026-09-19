# La mitad de PROYECTO del registro de config: un porte parcial con las dos razones rancias

**Cita durable:** TASK-THYROX-0223 (el sujeto de `repl`). Hallazgo hermano:
**H-THYROX-123**, que registra la premisa falsificada.

## Qué se preguntaba

Un rojo de `repl` llegó a este pase declarado como hueco de declaración de
una línea:

```
SyntaxError: Export named 'getCurrentProjectConfig' not found in module
'/home/user/thyrox/src/packages/config/index.ts'
```

La «confirmación» de que la función existía y sólo faltaba reexportarla era
esta línea:

```
src/packages/config/global/config.ts:28: *   la mitad de PROYECTO (`getCurrentProjectConfig`, ...
```

Es un **docstring**. Sub-patrón C: se midió que el nombre aparece en el
archivo y se concluyó que la función está portada.

## El estado real: un porte parcial que declara su propia parcialidad

| | nuestro | la fuente |
|---|---|---|
| `global/config.ts` | 903 líneas | 1883 |
| símbolos exportados | 29 | 46 |

**17 símbolos existen sólo en la fuente.** Y el porte NO los escondía: su
encabezado lleva un bloque «LO QUE NO TRAE, con su razón — cada uno es una
tarea, no un olvido» que los enumera en cinco cubos. Eso es
`porte-completo-no-parcial` **cumplido**.

Lo que estaba rancio era **una frase**, y por partida doble:

> *«la mitad de PROYECTO … depende del binding `getCwd` y del árbol de git,
> que es otro subsistema; ningún consumidor de este pase la usa.»*

| La razón declarada | Medido hoy |
|---|---|
| «depende del binding `getCwd`» | `getOriginalCwd` (`contracts.ts:54`) y `findCanonicalGitRoot` (`:62`) ya estaban declarados — el segundo desde antes de este pase |
| «ningún consumidor de este pase la usa» | **18 archivos en 10 paquetes**, y `repl` no arrancaba por eso |

> **Y el «25» de la primera redacción era una cifra doble-contada.** Salía de
> sumar dos greps (15 + 10) que comparten tres archivos —`Config.tsx`,
> `mcp/config.ts`, `exampleCommands.ts` importan ambos símbolos—. El
> distinto es **18**, medido con un solo `grep -rlE` y `sort -u`.

## Un defecto del instrumento, otra vez con la sonda como sujeto

La primera sonda corrió `bun -e` desde la **raíz del repo**. Ahí
`@thyrox/config` no resuelve — y **tampoco `@thyrox/config/types`**, que es
un subpath. Medido: la raíz declara **0** hermanos de workspace y
`node_modules/@thyrox/` no existe.

Así que un `FALLA` desde la raíz mide el manifiesto de la raíz, no el
paquete. La sonda válida corre **desde un consumidor que declare la
dependencia**, y aquí es `src/packages/repl`.

Es la segunda vez hoy: la misma forma cerró el banco hermano
`tsx-fuera-del-wildcard-*`, donde `@thyrox/app-host/state/AppState.js` salió
`FALLA` desde la raíz y `OK` desde repl con el árbol sin tocar.

## Las dos mitades

**Roja** (`outputs/rojo-import.txt`), desde repl:

```
getCurrentProjectConfig: undefined | saveCurrentProjectConfig: undefined
```

**Verde** (`outputs/verde-import.txt`), misma invocación:

```
getCurrentProjectConfig  : function
saveCurrentProjectConfig : function
getProjectPathForConfig  : function
```

## El delta de la suite, que aquí SÍ discrimina

| | `rojo-suite-repl.log` | `verde-suite-repl.log` |
|---|---|---|
| pass | 504 | **529** |
| fail | 5 | **4** |
| error | **1** | **0** |

El `1 error` era exactamente este import. Las 25 pruebas que aparecen no son
nuevas: **estaban en un archivo que no podía cargarse**, así que el corredor
ni las contaba. Los 4 fails que quedan son `isBgAgentPanelEnabled` y
`shouldHideTasksFooter`, otro sujeto.

Contraste con el banco hermano del mismo pase, donde el delta fue **cero**:
allí el cambio cerraba subpaths que `repl` no importa. Publicar los dos como
«cierra los rojos de repl» habría sido falso en uno de los dos.

## Lo que el porte conserva de la fuente, y por qué

- **La clave es la RAÍZ DEL REPOSITORIO**, no el `cwd`: dos sesiones en
  subdirectorios distintos del mismo repositorio comparten configuración.
  Fuera de un repositorio cae al `cwd` resuelto.
- **`memoize`**: resolver la raíz bifurca un proceso y no cambia durante la
  vida del proceso.
- **El contrato de «sin cambios» es por IDENTIDAD**, no por valor. Un
  actualizador que devuelve su entrada no persiste nada. Un porte que lo
  copiara por valor pasaría una prueba de ida y vuelta y fallaría ésta.
- **La divergencia heredada de `allowedTools`**, que la fuente declara como
  *«Not sure how this became a string / TODO: Fix upstream»*: hay registros
  en disco con ese campo serializado como cadena. Se repara al leer; retirar
  la rama rompería a quien ya tenga uno escrito.
- **La guarda de pérdida de autenticación** del respaldo, con su `logEvent`.

## Lo que NO se tocó, declarado

- **Los otros 14 símbolos.** Sus cuatro cubos conservan su razón en el
  encabezado: el auto-updater («su hogar natural es `@thyrox/updater`»), las
  rutas de memoria y reglas (`getMemoryPath` tras la bandera `TEAMMEM`), los
  escritores de clave («se portan con su consumidor») y los dos de test, con
  **0 consumidores**. Su censo está en
  `../tsx-fuera-del-wildcard-*/outputs/rojo-config-porte-parcial.txt`.
- **El shim `requireConfigProjectConfig`** de
  `command-runtime/src/internal/pendingCrossPackageDeps.ts:127`. Su docstring
  dice *«el paquete existe, el símbolo puede no estar portado todavía»*, que
  ya no aplica — pero comparte patrón con `requireStorageGit`, que shimea un
  paquete **sí** portado. Es un mecanismo de **capas**, no de ausencia, así
  que se conserva; lo que el porte le cambia es que ahora resuelve a símbolos
  reales en vez de a `undefined`.

## La sonda de conducta quedó sin hogar, y es un rojo declarado

Se escribieron cuatro casos —forma vacía, ida y vuelta, el contrato de
identidad, la clave normalizada— y **ninguno pudo correr**: ni desde
`.claude/workbench/` ni desde `tests/`, porque la raíz no enlaza ningún
hermano. Su vecino `tests/unit/settings/config.test.ts` falla por lo mismo,
**desde antes de este pase**.

Medido: **86 archivos de `tests/`** importan un hermano `@thyrox/*`, de 12
paquetes distintos (`outputs/rojo-hermanos-en-tests.txt`), contra **0**
declarados en la raíz.

No se declaró nada en `package.json` de la raíz: eso es adyacente a
**TASK-THYROX-0098** («Izar las dependencias a la raíz del workspace, como la
referencia»), que es una decisión del ejecutor pendiente, y el hogar del
corredor es el sujeto de la tarea de organizar la suite. La sonda se retiró
en vez de dejarla muerta en el árbol; sus cuatro casos están descritos aquí
para reescribirlos cuando el hogar exista.
