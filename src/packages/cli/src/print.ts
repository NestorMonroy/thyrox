/**
 * Puerto de `ccnmt: packages/cli/src/print.ts` (9 líneas) — fachada V7 §10.2:
 * el dueño real del headless/SDK es `@claude-code-how-works/cli`. Este
 * archivo existe únicamente porque (cita verbatim de la fuente):
 *
 *  1. `src/runtime/installCliBindings.ts` importa `runHeadless` de aquí
 *     (`verify-headless-host.ts` mantiene esa costura estable)
 *  2. `verify-runtime-boundaries.ts` / `verify-headless-host.ts` exigen el
 *     import de bootstrap de abajo para que el flujo headless siempre
 *     dispare el wiring de runtime.
 *
 * Ya consumido (import estático) por
 * `app-host: src/runtime/installCliBindings.ts` — antes de este porte,
 * `@thyrox/cli/print.js` no resolvía ningún archivo (su propio docstring lo
 * declaraba: *"el paquete `cli` NO existe en este árbol"*); ahora resuelve
 * vía el `./*.js` wildcard de `cli/package.json`.
 *
 * DIVERGENCIAS DE ALCANCE, declaradas:
 *
 *   - El import de bootstrap (`@thyrox/app-host/runtime/bootstrap.js`) — el
 *     paquete `@thyrox/app-host` existe, pero no expone `runtime/bootstrap.ts`
 *     (medido: `find src/packages/app-host/src/runtime -iname "*bootstrap*"`
 *     → vacío; el `bootstrap/` real de app-host vive en `src/bootstrap/`, un
 *     directorio hermano de `runtime/`, sin archivo `bootstrap.ts` dentro de
 *     `runtime/`). Se intenta con `require()` envuelto en `try/catch` al
 *     cargar el módulo — mismo momento que la fuente (import de efecto
 *     secundario, sin bindings), pero sin abortar la carga si el archivo no
 *     existe todavía.
 *   - `runHeadless`, `runHeadlessStreaming`, `handleRewindFiles`
 *     (`./index.js`, el propio barrel de este paquete) — el archivo SÍ
 *     existe (`cli/src/index.ts`), pero no los expone: en la fuente
 *     provienen de `./headless/sdk/session/run.js` y
 *     `./headless/sdk/session/run-streaming.js`, dos módulos del subsistema
 *     headless SDK que no forma parte de este pase (dos de los 111 módulos
 *     de la fuente están portados hoy; ver la descripción de
 *     `cli/package.json`). Se difieren con `require()` — mismo criterio que
 *     `agent/frontmatterParser.ts` — para que este archivo, y su import de
 *     bootstrap de arriba, sigan siendo importables.
 */
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@thyrox/app-host/runtime/bootstrap.js')
} catch {
  // ver docstring: el archivo no existe todavía en este árbol.
}

type IndexBarrel = {
  runHeadless?: (...args: unknown[]) => unknown
  runHeadlessStreaming?: (...args: unknown[]) => unknown
  handleRewindFiles?: (...args: unknown[]) => unknown
}

function loadIndexBarrel(): IndexBarrel {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./index.js') as IndexBarrel
}

export function runHeadless(...args: unknown[]): unknown {
  const fn = loadIndexBarrel().runHeadless
  if (!fn) {
    throw new Error(
      'runHeadless no está portado todavía — ver docstring de cli/src/print.ts',
    )
  }
  return fn(...args)
}

export function runHeadlessStreaming(...args: unknown[]): unknown {
  const fn = loadIndexBarrel().runHeadlessStreaming
  if (!fn) {
    throw new Error(
      'runHeadlessStreaming no está portado todavía — ver docstring de cli/src/print.ts',
    )
  }
  return fn(...args)
}

export function handleRewindFiles(...args: unknown[]): unknown {
  const fn = loadIndexBarrel().handleRewindFiles
  if (!fn) {
    throw new Error(
      'handleRewindFiles no está portado todavía — ver docstring de cli/src/print.ts',
    )
  }
  return fn(...args)
}
