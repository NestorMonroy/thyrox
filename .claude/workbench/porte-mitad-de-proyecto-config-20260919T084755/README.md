# La mitad de PROYECTO del registro de config: un porte parcial con las dos razones rancias

**Cita durable:** TASK-THYROX-0225 — «Cerrar los 3 typecheck del porte de
config». Hallazgos hermanos: **H-THYROX-123** (la premisa falsificada),
**H-THYROX-124** (el porte que declara bien su parcialidad con una razón
rancia) y **H-THYROX-125** (el gate que bloqueó la enmienda).

> **Corregido 2026-09-19.** Esta línea citaba `TASK-THYROX-0223` y añadía,
> entre paréntesis, «el sujeto de `repl`» — o sea, se escribió sabiendo que
> el sujeto no era éste. `0223` resuelve: nombra «Declarar las 19
> dependencias externas que repl importa», que es el sujeto del banco
> hermano `deps-sin-declarar-repl-20260919T082130`, donde la cita **sí** es
> correcta.
>
> Ésa es la forma que un gate de FORMA no puede ver. `check-cita-resolucion`
> mide que el id EXISTA en el store, y aquí existía; lo que no coincidía era
> el sujeto. El eje que sí lo ve es el que TASK-DOCS-0434 tiene abierto
> («Medir cuántas de las 1989 citas durables del árbol resuelven a su
> sujeto»).
>
> **Los tres commits `14d97a01`, `beca2674` y `781d2f7b` la conservan**: están
> publicados y no se enmiendan. Este banco es el artefacto que sí se puede
> corregir, y es donde alguien busca la cita dentro de un mes — un mensaje de
> commit no es el índice de nada.
>
> *Métrica:* `task_ids cita` y la fila del store por `citation_id`, contra el
> sujeto que el banco describe.
> *Ciega a:* si el `0223` original salió de rellenar el ordinal `#223` a
> cuatro dígitos. Es plausible —el board tiene un `#223`— y no se midió: la
> intención de un turno pasado no está en el árbol. Lo que sí consta es que
> resuelve y nombra otra cosa.

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

> **El instrumento se corrigió antes de publicar la cifra.** La primera
> medición usó `bun test` desnudo desde la raíz, que es *mi* invocación, no
> la del corredor. Medido en `tests/run.sh`: hace `cd "$(dirname $0)/.."` y
> corre `bun test "${suites_ts[@]}"` con `descubrir_ts()` =
> `find src tests -name '*.test.ts'`. **Es la misma invocación**, así que la
> cifra vale — pero se declara el instrumento, no se da por supuesto.

Medido bajo el universo del corredor: **85 archivos `*.test.ts` de `tests/`**
importan un hermano `@thyrox/*`, de 12 paquetes distintos
(`outputs/rojo-hermanos-en-tests.txt`), contra **0** declarados en la raíz.
Comprobado por conducta en tres de ellos —`context-build`, `tool-chain`,
`message-pipeline`— los tres con `Cannot find module`.

**Los 67 `*.test.ts` de `src/` NO están en ese cubo**: viven dentro de un
paquete y resuelven por su propio manifiesto. La partición es «dentro del
paquete» contra «fuera», no `tests/` contra `src/`.

*Métrica:* `*.test.ts` bajo `tests/` que citan `from '@thyrox/`, contra las
dependencias declaradas en el `package.json` de la raíz.
*Ciega a:* un archivo que arme el specifier por concatenación, y a si el
resto de la mitad TS del corredor está verde — eso exige correrla entera.

No se declaró nada en `package.json` de la raíz: eso es adyacente a
**TASK-THYROX-0098** («Izar las dependencias a la raíz del workspace, como la
referencia»), que es una decisión del ejecutor pendiente, y el hogar del
corredor es el sujeto de la tarea de organizar la suite. La sonda se retiró
en vez de dejarla muerta en el árbol; sus cuatro casos están descritos aquí
para reescribirlos cuando el hogar exista.

---

## Tercer tramo — el typecheck que el porte no había corrido

El porte se cerró con la suite en verde y **sin correr `bun run typecheck`**.
Al correrlo, `src/packages/config/global/config.ts` daba **4 errores**, tres
de ellos míos:

| línea | error | causa |
|---|---|---|
| 546 | TS6133 `lastReadFileStats` sin usar | **PRE-EXISTENTE** — no es de este pase |
| 935 | TS2353 `projectOnboardingSeenCount` no existe en `ProjectConfig` | el tipo de aquí es un porte parcial y no declara las tres claves que su propio `DEFAULT_PROJECT_CONFIG` siembra |
| 1040, 1075 | TS2554 «Expected 2 arguments, but got 1» | los dos sitios nuevos llamaban `writeThroughGlobalConfigCache(written)` y la firma de AQUÍ lleva un segundo parámetro |

### El segundo parámetro no es un error del porte: es la divergencia ya declarada

La fuente firma `writeThroughGlobalConfigCache(config)`
(`ccnmt: packages/config/global/config.ts:1096`); la de aquí firma
`(config, file)` porque la caché de este árbol guarda **el archivo del que
salió la config** — consecuencia directa del `filePath` opcional que el
bloque de cabecera ya declaraba. Los dos sitios nuevos pasan
`_getGlobalClaudeFile()` y **no** admiten override, porque el registro de
proyecto vive dentro del archivo global bajo la clave `projects`: su ruta no
es un parámetro del llamador.

### Las tres claves NO se añadieron por completitud — se midió a sus consumidores

La alternativa era retirarlas de `DEFAULT_PROJECT_CONFIG` y declarar la
divergencia. Se midió antes de elegir:

```
$ grep -rn "projectOnboardingSeenCount\|hasClaudeMdExternalIncludesApproved\|
            hasClaudeMdExternalIncludesWarningShown" src/ tests/
src/packages/repl/src/components/Settings/Config.tsx:1133
src/packages/repl/src/components/ClaudeMdExternalIncludesDialog.tsx:31,32,38,39
src/packages/repl/src/projectOnboardingState.ts:70,82
```

**Siete sitios en tres archivos de `@thyrox/repl` las leen.** Retirarlas del
default habría dejado `projectOnboardingState.ts:70` comparando `undefined >= 4`.
Así que se añaden al tipo con la **misma opcionalidad que la fuente**
(`ccnmt :154-156`): `projectOnboardingSeenCount: number` requerida, las otras
dos opcionales. La requerida no rompe ningún literal — los dos que existen
(`DEFAULT_PROJECT_CONFIG` y `TEST_PROJECT_CONFIG_FOR_TESTING`, que lo esparce)
la satisfacen.

El resto de `ProjectConfig` **sigue siendo porte parcial declarado**: la
fuente declara ~15 claves más que ningún consumidor de este árbol lee.

### La atribución del delta, que no se dio por supuesta

El total del árbol pasó de **5710 a 5704** — seis, no los tres míos. Un
número que se mueve no es evidencia de *por qué* se movió, así que se
diffearon los dos conjuntos de errores en vez de asumir:

```
== DESAPARECIERON ==
config/global/config.ts: TS2353 'projectOnboardingSeenCount' ...     ← mío
config/global/config.ts: TS2554 Expected 2 arguments, but got 1.     ← mío
config/global/config.ts: TS2554 Expected 2 arguments, but got 1.     ← mío
repl/src/components/Settings/Config.tsx: TS2339 'hasClaudeMdExternalIncludesApproved'
repl/src/projectOnboardingState.ts: TS2339 'projectOnboardingSeenCount'
repl/src/projectOnboardingState.ts: TS2339 'projectOnboardingSeenCount'
== APARECIERON ==
(ninguno)
```

Los tres de `repl` son **pre-existentes en archivos que este pase no tocó**:
completar el tipo los cerró de paso. Eso es lo que convierte la elección de
añadir las claves en medida y no en preferencia — si hubieran sido
arbitrarias, el delta habría sido exactamente tres.

Mi sujeto queda en **1 error**, el `lastReadFileStats` pre-existente;
`src/packages/config/index.ts` en **0**.

*Métrica:* líneas `error TS####` del log de `bun run typecheck`, normalizadas
quitando `(línea,columna)` y diffeadas con `comm` entre las dos corridas.
*Ciega a:* un error que cambie de texto sin dejar de existir (se leería como
uno que desaparece y otro que aparece — aquí el cubo «aparecieron» está
vacío, así que no ocurrió); y a los 5704 restantes del árbol, que son el
sujeto de TASK-THYROX-0098 y de las tareas de declaración de dependencias, no
de este porte.
