# App-host R-2d — `b8r` sobre el espejo del runner headless

Trabajas en un worktree de thyrox. Comentarios y docstrings en español;
identificadores en inglés. No toques `.claude/` ni ningún `package.json`
salvo el de `src/packages/app-host/package.json` (sólo para añadir un export).

## Qué hace la referencia (2.1.283, `chunk-ycnq45th.js`, runner headless)

```js
_r=T.userSpecifiedModel;b8r(()=>{_r=void 0});function $n(){return WXn(_r)}
```

El runner guarda en una variable local el modelo que el usuario pidió, y
suscribe `b8r` (el oyente "el modelo de respaldo por rechazo volvió al
previo") para OLVIDARLO. Así, tras la restauración, el runner no vuelve a
aplicar el override que la restauración acaba de deshacer.

## Qué hay en thyrox

- `b8r` está portado como `onRefusalFallbackRestored` en
  `src/packages/app-host/src/state/refusalFallbackRestore.ts`.
- El espejo `_r` existe: es `let activeUserSpecifiedModel = options.userSpecifiedModel`
  en `src/packages/cli/src/headless/sdk/session/run-streaming.ts` (≈ línea 584).
  **Nadie lo limpia al restaurar.** Ese es el defecto.
- `src/packages/app-host/src/runtime/installCliBindings.ts` tiene
  `wireRefusalFallbackRestoreForHeadlessStore`, cuyo docstring afirma que el
  espejo "no se porta todavía" y usa `mainLoopModelForSession` del store como
  sustituto. Esa afirmación ya es falsa.

## Qué hacer

1. En `src/packages/app-host/package.json`, añade el export
   `"./state/refusalFallbackRestore.js"` con la misma forma que
   `"./state/store.js"` (`@thyrox/source`, `types`, `default`).
2. En `run-streaming.ts`, inmediatamente después de declarar
   `activeUserSpecifiedModel`, suscribe
   `onRefusalFallbackRestored(() => { activeUserSpecifiedModel = undefined })`
   importado de `@thyrox/app-host/state/refusalFallbackRestore.js` (import
   estático al principio del archivo, nunca dentro de una función). Registra
   la desuscripción con `registerCleanup` (ya importado de
   `@thyrox/app-host/bootstrap/cleanupRegistry.js`) para no dejar oyentes
   colgados entre ejecuciones. Comentario corto citando `b8r` y el chunk.
3. Corrige el docstring de `wireRefusalFallbackRestoreForHeadlessStore`: ya
   no es "el equivalente de b8r"; el `b8r` real vive en `run-streaming.ts`.
   Decide y justifica en el docstring si limpiar `mainLoopModelForSession`
   del store headless sigue siendo necesario; NO borres la función ni su
   prueba sin medir que nada la necesita.
4. Prueba (TDD, rojo primero): en
   `src/packages/cli/src/headless/sdk/session/__tests__/` (créalo si no
   existe) una prueba que:
   - lea el fuente de `run-streaming.ts` y exija que la suscripción
     `onRefusalFallbackRestored` aparezca y que su callback asigne
     `activeUserSpecifiedModel = undefined`, DESPUÉS de la declaración del
     `let` y dentro de la misma función;
   - y, si es viable sin levantar el runner entero, una prueba de conducta:
     disparar la señal de sesión con un `restore` (usa
     `latchRefusalFallbackModel` + `switchSession`/la función que emite
     `onSessionSwitch` con restauración en
     `@thyrox/app-host/bootstrap/state.js`, mira las pruebas de
     `src/packages/app-host/src/state/__tests__/refusalFallbackRestore.test.ts`)
     y comprobar que un callback registrado con `onRefusalFallbackRestored`
     corre. No inventes APIs: lee las existentes.
5. Control de anulación: retira temporalmente la suscripción y comprueba que
   cae EXACTAMENTE la aserción que depende de ella; restáurala.
6. Corre `bun test` de las pruebas nuevas y de
   `src/packages/app-host/src/runtime/__tests__` y
   `src/packages/app-host/src/state/__tests__`, y
   `bun x tsc --noEmit -p src/packages/cli/tsconfig.json` si existe (si ya
   falla antes de tu cambio, compara el conteo antes/después y no aumentes
   errores en los archivos que tocas).

Reporta al final: archivos tocados, rojo inicial, anulación y verde final.
