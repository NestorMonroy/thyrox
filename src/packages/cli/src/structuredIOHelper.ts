/**
 * Puerto de `ccnmt: packages/cli/src/structuredIOHelper.ts` (40 líneas,
 * único símbolo exportado: `getStructuredIO`). Se porta VERBATIM en firma y
 * comportamiento: arma el stream de entrada (string único envuelto en un
 * `SDKUserMessage`, o el `AsyncIterable` recibido tal cual) y decide entre
 * `RemoteIO` (con `sdkUrl`) o `StructuredIO` (local).
 *
 * Ya consumido (deferred `require`) por
 * `app-host: src/runtime/installCliBindings.ts` — antes de este porte,
 * `@thyrox/cli/structuredIOHelper.js` no resolvía ningún archivo; ahora
 * resuelve vía el `./*.js` wildcard de `cli/package.json`.
 *
 * Dos de las cinco rutas de import resuelven tal cual en este árbol:
 *
 *   - `SDKUserMessage` (`@claude-code-how-works/headless-sdk/agentSdkTypes.js`)
 *     — SÍ existe en `@thyrox/headless-sdk` con subpath explícito (medido:
 *     `"./agentSdkTypes.js"` en `headless-sdk/package.json` `exports`).
 *     `import type`, además — se borra en runtime de cualquier forma.
 *   - `jsonStringify`
 *     (`@claude-code-how-works/local-observability/slowOperations.js`) — SÍ
 *     existe en `@thyrox/local-observability` con subpath explícito
 *     (medido: `"./slowOperations.js"` en su `package.json` `exports`, y
 *     `export function jsonStringify` en `src/slowOperations.ts`).
 *
 * DIVERGENCIAS DE ALCANCE, declaradas:
 *
 *   - `fromArray` (`@claude-code-how-works/config/generators`) —
 *     `@thyrox/config` existe pero no expone `generators.ts` (medido:
 *     `Bun.resolveSync('@thyrox/config/generators', …)` falla). Se
 *     reimplementa localmente: un generador async de un array fijo es
 *     autocontenido — cinco líneas, sin dependencias — así que
 *     reimplementarlo es más fiel que un `require()` que fallaría siempre
 *     (mismo criterio que `keychainPrefetch.ts::isBareMode`).
 *   - `RemoteIO` / `StructuredIO` (`./remoteIO.js` / `./structuredIO.js`,
 *     hermanos LOCALES de este mismo paquete) — NO están portados: el
 *     alcance de esta tarea es exactamente ocho módulos nombrados, y estos
 *     dos no son ninguno de ellos (medido: `ls src/packages/cli/src/` antes
 *     de este pase → sólo `argv.ts`, `exitCodes.ts`, `index.ts`). Se
 *     difieren con `require()` para que `getStructuredIO` siga siendo
 *     importable — sólo falla si se invoca de verdad.
 */
import type { SDKUserMessage } from '@thyrox/headless-sdk/agentSdkTypes.js'
import { jsonStringify } from '@thyrox/local-observability/slowOperations.js'

/**
 * Fiel a `ccnmt: packages/config/generators.ts::fromArray` — generador
 * autocontenido, sin dependencias. Ver docstring del módulo.
 */
async function* fromArray<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) {
    yield item
  }
}

type RemoteIOCtor = new (
  sdkUrl: string,
  inputStream: AsyncIterable<string>,
  replayUserMessages?: boolean,
) => unknown

type StructuredIOCtor = new (
  inputStream: AsyncIterable<string>,
  replayUserMessages?: boolean,
) => unknown

export function getStructuredIO(
  inputPrompt: string | AsyncIterable<string>,
  options: {
    sdkUrl: string | undefined
    replayUserMessages?: boolean
  },
): unknown {
  let inputStream: AsyncIterable<string>
  if (typeof inputPrompt === 'string') {
    if (inputPrompt.trim() !== '') {
      inputStream = fromArray([
        jsonStringify({
          type: 'user',
          content: inputPrompt,
          uuid: '',
          session_id: '',
          message: {
            role: 'user',
            content: inputPrompt,
          },
          parent_tool_use_id: null,
        } satisfies SDKUserMessage),
      ])
    } else {
      inputStream = fromArray([])
    }
  } else {
    inputStream = inputPrompt
  }

  // `RemoteIO`/`StructuredIO`: hermanos locales sin portar — ver docstring.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { RemoteIO } = require('./remoteIO.js') as { RemoteIO: RemoteIOCtor }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { StructuredIO } = require('./structuredIO.js') as { StructuredIO: StructuredIOCtor }

  return options.sdkUrl
    ? new RemoteIO(options.sdkUrl, inputStream, options.replayUserMessages)
    : new StructuredIO(inputStream, options.replayUserMessages)
}
