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
