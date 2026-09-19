# Porte de los cuatro módulos de `voice` — TASK-THYROX-0221

## Qué se preguntaba

`ccnmt: packages/voice` tiene 17 archivos; `thyrox: src/packages/voice` tiene
los mismos 17 nombres. La directiva fue *«copia todos los archivos, los test,
cambias el alcance de la fuente a `@thyrox`»*, con la disciplina explícita:
**verificar por conducta, no por comentario**.

## El bloqueador declarado estaba RANCIO — y el docstring era la evidencia falsa

Cuatro símbolos llegaron declarados NO PORTADOS. Sus docstrings citaban una
medición concreta:

> `react` no existe como paquete en este árbol (medido con
> `Bun.resolveSync('react', <dir>)` → "Cannot find package 'react'")

y, en `useVoiceIntegration.tsx`:

> `@anthropic/ink` y `@thyrox/repl` … están ausentes por completo (medido:
> `find src/packages -maxdepth 1 -iname repl` → 0 resultados)

**Las dos eran correctas el día que se escribieron y falsas hoy**, sin que
nadie tocara los archivos. Medido por conducta, los 13 specifiers resuelven:

| specifier | resuelve a |
|---|---|
| `react` | `node_modules/.bun/react@19.3.0/…/react/index.js` |
| `@anthropic/ink` | `src/packages/@ant/ink/src/index.ts` |
| `@anthropic/ink/keybindings` | `src/packages/@ant/ink/src/keybindings/index.ts` |
| `@thyrox/repl/notifications.js` | `src/packages/repl/src/notifications.ts` |
| `@thyrox/repl/overlayContext.js` | `src/packages/repl/src/overlayContext.tsx` |
| `@thyrox/repl/stateStore.js` | `src/packages/repl/src/stateStore.ts` |
| (+ 7 de `config`, `local-observability` y `output`) | todos presentes en disco |

**Lo que faltaba era la DECLARACIÓN, no los paquetes.** `voice/package.json` no
listaba `@anthropic/ink` ni `@thyrox/repl`; añadir esas dos líneas y correr
`bun install` una vez los enlaza. Nada más cambió.

Ese `-maxdepth 1 -iname repl` es el **sub-patrón C**: midió el nombre de un
directorio y concluyó sobre la existencia de una capa entera. Ver H-THYROX-116.

## Lo que la métrica de líneas NO puede ver

`voiceContext.tsx` medía **93 líneas contra 76 de la fuente** — o sea MÁS — y
su `useGetVoiceState()` lanzaba «no está portado». El stub sustituía el cuerpo
por un `throw` de longitud parecida. Un conteo de líneas es **ciego** a esa
forma de stub.

Por eso la tabla de paridad (`outputs/paridad-todos.txt`) no basta como
veredicto: los 15 archivos salen con delta positivo, y dos de ellos eran stubs.

*Métrica:* la cadena de bloqueo (`no está portado` / `NO PORTADO`) por archivo.
*Ciega a:* un stub que lance con otro texto, y a un cuerpo portado que difiera
del de la fuente sin dejar rastro léxico.

## El ancla de reescritura es de TOKEN, no de inicio de línea

Medido antes de escribir (`outputs/anclaje.txt`):

```
useVoice.ts              total=7  anclados=6  from_require=7
useVoiceIntegration.tsx  total=3  anclados=3  from_require=3
```

El que `^\s*(import|export)\b` no ve es `useVoice.ts:15`, que cierra un import
multilínea empezando por `}`. El ancla correcta es
`(from|require\(|^\s*import)\s*['"]…`.

**El `caso 2` de `tests/package/package_identity.test.ts` comparte esa ceguera**
— sigue verde ante una línea de continuación rota. No sirve como veredicto de
este trabajo; el veredicto es el grep por contenido.

## La sonda: «¿lanzó?» NO discrimina

Un hook de React real, llamado fuera de un render, **también lanza**. El
criterio verde es el **contenido** del mensaje:

| símbolo | antes | después |
|---|---|---|
| `useVoice` | STUB — «no está portado» | PORTADO — `resolveDispatcher().useState` |
| `useVoiceIntegration` | STUB | PORTADO — `dispatcher.useContext` |
| `useVoiceKeybindingHandler` | STUB | PORTADO |
| `VoiceKeybindingHandler` | STUB | PORTADO |

La sonda destapó la **cascada**: tras portar los dos hooks, dos símbolos
seguían STUB con un mensaje de OTRO módulo (`useGetVoiceState()` de
`voiceContext.tsx`). Eso llevó a portar los dos módulos restantes.

## La suite es verde antes y después — no discrimina

`bun test src/packages/voice` → **27 pass, 0 fail** en los dos estados. Sus dos
archivos de test cubren sólo los helpers puros, que ya estaban portados. Es el
**sub-patrón D** con la suite como sujeto: su verde no separa «el porte
funciona» de «el test no pregunta».

## Control de anulación

Revirtiendo **un** archivo a la vez (`outputs/control-de-anulacion.txt`):

| archivo anulado | símbolos que caen | símbolos que sobreviven |
|---|---|---|
| `hooks/useVoice.ts` | `useVoice` (1 de 4) | los otros 3 |
| `voiceContext.tsx` | `useVoiceKeybindingHandler`, `VoiceKeybindingHandler` (2 de 4) | `useVoice`, `useVoiceIntegration` |

Cada anulación nombra **exactamente** lo que depende de ella, ni uno más.

**El control destapó un defecto propio.** La restauración regenera desde la
plantilla del header, y con eso **perdió una corrección manual** que yo había
hecho sobre el archivo (1176 → 1174 líneas). La corrección se movió a la
plantilla, así que el porte es ahora idempotente. La lección: un control de
anulación que regenera es también una prueba de idempotencia, y la falló.

## Lo que este trabajo NO cierra

- **El ciclo `voice ⇄ repl`** es el 92.º de 91 que el workspace ya tiene
  (`repl` declara `@thyrox/voice` y lo importa en 8 archivos). Bun lo tolera.
  La forma de la referencia es **izar a la raíz** — ccnmt declara cero deps en
  su `voice` — y esa decisión es la tarea #448, no ésta.
- **Las dos deps huérfanas** (`@thyrox/output`, `@thyrox/storage`, 0 imports en
  `voice/src`) **NO se retiraron**: directiva explícita del ejecutor, «NO».
- El `caso 2` del test de identidad sigue ciego a la línea de continuación.

## El tercer bloqueador, y por qué mi grep no lo vio

Tras portar los cuatro, el typecheck dejó **6 errores** en `voice`. Cuatro son
pre-existentes en archivos que no toqué (`ws` sin `@types`, `audio-capture-napi`
ausente). Los otros dos son `TS18046: 's' is of type 'unknown'` en
`useVoiceEnabled.ts`, y trazan a un TERCER bloqueador declarado, en
`appStateHooks.ts`.

**Mi grep de la cadena de bloqueo no lo vio**: ese archivo usa otra redacción
(«NO existe en este árbol»), no `no está portado`. Tercera vez en este mismo
pase que un instrumento léxico es ciego a la variante.

Y la afirmación era falsa en dos sentidos:

1. Decía `find src/packages/app-host -iname 'AppState.ts'` → 0 archivos. El
   `find` era correcto; **el archivo es `AppState.tsx`**. El specifier resuelve
   —medido— a `src/packages/app-host/src/state/AppState.tsx`.
2. Había **retirado el comentario en inglés de la fuente** y puesto una
   justificación propia del `require()`. El `require()` es de la FUENTE, que lo
   declara ella misma (`V7 §8.20 — lazy require() shim…`).

**El archivo NO era un stub nuestro: era un porte fiel de un shim.** El código
es idéntico byte a byte tras normalizar el alcance. Se corrigió el header y se
restauró el comentario de la fuente; el código no se tocó.

Los dos `TS18046` **se dejan**: `export type AppState = unknown` es decisión de
la fuente, y estrecharlo sería divergir. Esa decisión es la tarea **#512**.

## Lo que este trabajo destapó y NO cierra: cinco archivos divergentes

El diff normalizado sobre los 15 archivos (`outputs/diff-normalizado-todos.txt`)
da **0** para los que porté y para cinco más — y **divergencia** en cinco que
llegaron antes de este pase:

| archivo | solo en la FUENTE | solo en el NUESTRO |
|---|---|---|
| `src/index.ts` | 1 | 0 |
| `src/voiceKeyterms.ts` | 25 | 23 |
| `src/voiceModeEnabled.ts` | 25 | 34 |
| `src/voice.ts` | 107 | 146 |
| `src/voiceStreamSTT.ts` | 137 | 143 |
| `src/hooks/__tests__/useVoiceHelpers.behavior.test.ts` | 24 | 11 |

La forma visible en las primeras líneas de cada uno es la misma que
`appStateHooks.ts` tenía: **el bloque de comentario en inglés de la fuente
fue retirado**. Si eso explica toda la divergencia o sólo parte, no está
medido — y publicarlo como «sólo son comentarios» sería concluir sobre el
significado desde el significante.

*Ciega a:* mi heurística de quitar el header (`sed '1,/^ \*\/$/d'`) asume que
nuestro archivo abre con `/**` y la fuente no. Donde eso no se cumpla, el
delta está inflado o deflacionado y la tabla no lo distingue.

Queda **declarado y sin cerrar** en este commit.

## Corrección del ejecutor: thyrox SÍ tiene `@thyrox/app-host/state/AppState.js`

Directiva, a mitad del pase: *«habíamos dicho que en thyrox sí va a tener
`@thyrox/app-host/state/AppState.js`»*. Medido, y es así:

- el subpath resuelve a `src/packages/app-host/src/state/AppState.tsx`;
- ese módulo **reexporta el tipo `AppState`** (`:164-167`, desde
  `./AppStateStore.ts`) y su propio `useAppState` ya está tipado
  `(state: AppState) => T` (`:273`), no contra `unknown`.

Así que dejar `AppState = unknown` aquí era fidelidad al **literal** de la
fuente y no a su **intención**: el shim existe para diferir el import de
**valor**, no el de tipo. `import type` se borra al compilar —no emite
`require` ni `import`— así que el diferimiento queda intacto y el consumidor
recupera el tipo real.

**Resultado medido:** los dos `TS18046` caen. El paquete pasa de **6 a 4**
errores de typecheck, y los 4 que quedan son pre-existentes en archivos que
este pase no tocó (`audio-capture-napi` y `@types/ws` ausentes).

### Y el verde sobre `voiceEnabled` es FALSO — medido por anulación

`s.settings.voiceEnabled` pasa el typecheck, y **no** porque la clave exista.
Sustituida por `claveQueNoExisteEnNingunSitio`, **tsc no reporta nada**. La
causa es `SettingsSchema … .passthrough()` (`config/settings/types.ts:228`),
que es porte **fiel** del diseño de la fuente.

El hueco que ese `passthrough` esconde sí es real: `voiceEnabled` está
declarada en `ccnmt: packages/config/settings/types.ts:907` y da **0 hits** en
todo `src/packages/config` nuestro. Registrado como **H-THYROX-119**; el censo
de todas las claves en esa situación queda como sucesor.

---

## Cierre: los cinco archivos que divergían, y el sexto bloqueador rancio

Tras cerrar los cuatro hooks, quedaban cinco archivos con diferencia contra la
fuente. Medidos con `outputs/strip_comments.py`, que separa «se tradujo un
comentario» de «el porte está incompleto», **tres eran sólo comentario**
(`index.ts`, `voiceStreamSTT.ts`, `useVoiceHelpers.behavior.test.ts`) y dos
llevaban código:

| Archivo | Divergencia declarada | Medido |
|---|---|---|
| `voiceKeyterms.ts` | *«`storage/src/git.ts` no incluye `getBranch`»* | `:214` lo declara. Restaurado el import de la fuente; el código queda **idéntico**. Efecto lateral: `@thyrox/storage` deja de ser una dependencia huérfana. |
| `voiceModeEnabled.ts` | *«`bun:bundle` no es importable»* | La forma **dinámica** `await import('bun:bundle')` falla y la **estática** `import { feature } from 'bun:bundle'` resuelve. Se midió una y se concluyó sobre la otra — el sub-patrón C. Retirado el `feature()` local; el código queda **idéntico**. |
| `voice.ts` | (a) `isRunningOnHomespace` ausente de `config`; (b) `audio-capture-napi` ausente del árbol | Las dos falsas. Ver abajo. |

### `voice.ts` — el sexto bloqueador, y uno séptimo que introduje yo

**(a) `isRunningOnHomespace`** está en `config/env/utils.ts:169`, con cuerpo
byte a byte igual al de la fuente (`ccnmt: packages/config/env/utils.ts:121`).
El stub local se retira y se restaura el import de la fuente.

**(b) `audio-capture-napi`** existe en este árbol: `src/packages/audio-capture-napi/`,
con sus binarios `vendor/{x64-linux,arm64-linux,x64-darwin,arm64-darwin,x64-win32}/audio-capture.node`.
Lo que faltaba era su **línea en `dependencies`** — el mismo patrón de
`@anthropic/ink` y `@thyrox/repl`. La fuente lo declara sin alcance
(`"name": "audio-capture-napi"`) y aquí declara `"@thyrox/audio-capture-napi"`,
así que el specifier se reescribe: es la misma clase que
`@claude-code-how-works/*` → `@thyrox/*`, **no** una divergencia.

**El séptimo bloqueador era mío, de este mismo pase.** El docstring que yo
escribí afirmaba que *«la fuente YA diseña su propio fallback (arecord/SoX)
para cuando no esté disponible»*, justificando un `try/catch` que devolvía un
stub. Medido:

```
grep -n "loadAudioNapi\|catch" ccnmt: packages/voice/src/voice.ts
  24:function loadAudioNapi(): Promise<AudioNapi> {
 196:  const napi = await loadAudioNapi()
 242:  const napi = await loadAudioNapi()
 270:  const napi = await loadAudioNapi()
 343:  const napi = await loadAudioNapi()
```

**Cero `catch` en las 525 líneas**, y los cuatro llamadores esperan la promesa
sin envolverla. El fallback de la fuente responde a `isNativeAudioAvailable()
=== false` o a que `startNativeRecording()` devuelva `false` — **otra
condición**. Mi `try/catch` no era fidelidad al diseño de la fuente: era un
mecanismo nuevo con una justificación que no se había medido. Retirado.

### Un defecto de splice, y por qué se corta por ancla

El primer intento de instalar la cabecera nueva usó `tail -n +86` sobre un
número de línea leído a ojo, y **duplicó** `return audioNapiPromise` + `}`.
El `head -2` del corte ya lo mostraba en pantalla y no se actuó. El corte se
rehízo por **ancla** (`grep -n '^// ─── Constantes'`), que no depende de que
el lector cuente bien.

### El instrumento era ciego al comentario al FINAL de una línea

`strip_comments.py` sólo descartaba una línea que **empieza** por `//`. Con eso
publicaba **9** líneas de divergencia de código en `voice.ts`, de las que **7**
eran comentarios traducidos en la cola de una línea de código (`'raw', // PCM
crudo`). Se le añadió un recorte de cola consciente de comillas —un `'http://x'`
lleva `//` y no es comentario— con su **control de anulación**: la bandera
`--no-trail` lo retira.

| | con recorte | sin recorte (`--no-trail`) |
|---|---|---|
| `voice.ts` | **4** | 18 |
| los otros 13 archivos | idénticos en las dos columnas | |

El contraste discrimina: el recorte sólo movió el archivo que tenía comentarios
en cola, y **no ocultó ninguna divergencia de código** en los demás. Las 4 que
quedan son las **2 líneas** del specifier de `audio-capture-napi`.

Control positivo del recorte consciente de comillas, en `outputs/`:
`const u = 'http://x' // comentario` conserva la cadena y pierde el comentario.

## Verde final del paquete, por conducta

| Eje | Antes del pase | Ahora |
|---|---|---|
| archivos a delta-de-código 0 | 9 de 15 | **13 de 15** |
| stubs / shims locales | 7 | **0** |
| errores de typecheck del paquete | 6 | **0** |
| suite | 27 pass | **27 pass, 0 fail** |

Los 3 errores restantes son **pre-existentes** y viven en un archivo que este
pase no creó: `voiceStreamSTT.ts` (`@types/ws` sin declarar, y dos parámetros
`any` implícitos en `:495`).

Los 2 archivos que siguen divergiendo lo hacen **por declaración**:
`appStateHooks.ts` (el `import type` que la directiva del ejecutor pidió) y
`voice.ts` (las 2 líneas del specifier).

### La sonda de conducta NO discriminaba, y el segundo intento sí

`outputs/probe-voice-napi.ts`. El primer intento llamaba a
`checkRecordingAvailability()` con el entorno tal cual — y en este contenedor
`CLAUDE_CODE_REMOTE=true`, así que la función sale por el **retorno temprano**
de `:295` y **nunca llega a `loadAudioNapi()`**. El verde decía «el import
resolvió» midiendo una rama que no toca el import: el sub-patrón D, con la
propia sonda como sujeto.

Corre ahora **dos veces**, y el contraste es la medición:

```
[1] entorno tal cual      -> {"available":false,"reason":"...no audio device..."}
[2] CLAUDE_CODE_REMOTE=''  -> {"available":true,"reason":null}
```

El paso [2] recorre la cadena completa y no lanza: como ni la fuente ni el
puerto tienen `catch`, un `import()` que rechazara mataría la sonda. Que
termine es la evidencia de que `@thyrox/audio-capture-napi` **resuelve** desde
dentro del paquete `voice` (su enlace vive en
`src/packages/voice/node_modules/@thyrox/`, no en la raíz — por eso la sonda no
lo importa ella misma: mediría la resolución del banco, no la del puerto).

## Lo que este banco NO cierra

- El censo de claves que los consumidores leen y `SettingsSchema` no declara:
  **TASK-THYROX-0222**.
- El triaje de los 9 shims de `AppState` por patrón de ACCESO: board **#512**.
- El izado de dependencias a la raíz del workspace, como hace la referencia:
  board **#448**.

Patrón de los seis bloqueadores rancios, registrado para que nadie vuelva a
heredarlos: **H-THYROX-120**.

---

## Corrección: los 3 «pre-existentes» también eran una declaración ausente

La sección de arriba declaró el verde en **4 → 3** y llamó *pre-existentes* a
los tres que quedaban, dejándolos fuera del alcance. Las dos cosas eran
ciertas al medirse y la segunda no se sostiene: los tres son **la misma forma**
que los otros seis bloqueadores —un paquete presente sin su línea de
declaración— sólo que del lado de los tipos.

`voiceStreamSTT.ts` importa `ws`, que `voice` sí declara en `dependencies`.
Lo que faltaba era `@types/ws` en `devDependencies`. El precedente del propio
árbol es exacto: `src/packages/mcp-runtime/package.json` declara **`ws` en
`dependencies` y `@types/ws` en `devDependencies`**, y typechequea.

Declarada la línea, los tres caen de una vez: el `TS2307` del módulo y los dos
`TS7006` de `:495`, que eran `any` implícito **porque** el tipo de `ws.on` no
se conocía.

### Control de anulación

Se retiró el enlace `src/packages/voice/node_modules/@types/ws` y se volvió a
medir (`outputs/anulacion-types-ws.txt`):

| | errores en el paquete |
|---|---|
| con `@types/ws` | **0** |
| retirado el enlace | **3** — los mismos tres, ni uno más |

El contraste discrimina: los tres dependen de esa declaración y de nada más.
Tras restaurar el enlace, `bun install` publica `Checked 386 installs across
348 packages (no changes)`, así que la mutación del control no dejó residuo.

*Métrica:* `bunx tsc --noEmit -p tsconfig.json` filtrado a `src/packages/voice`.
*Ciega a:* un error que `tsc` no reporte porque un esquema lo admite por
`.passthrough()` — el caso de `voiceEnabled` (**H-THYROX-119**), que
typechequea sin estar declarada. El 0 de esta tabla no es «el paquete está
completo»: es «el compilador no tiene nada más que decir con los tipos que ve».

**Lo que esta corrección NO decide:** si estas declaraciones deben izarse a la
raíz del workspace, como hace la referencia (`ccnmt: package.json:135` declara
`@types/ws` y `:198` `ws` en la raíz, y su `voice` no declara ninguna
dependencia). Aquí se siguió la convención vigente del árbol —declaración por
paquete, con `mcp-runtime` como precedente— no se decidió el eje. Ése es el
board **#448**.
