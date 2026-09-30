/**
 * Contrato de `url-handler-napi`: esperar la URL con que macOS lanza el
 * proceso desde el manejador de esquema. El módulo nativo no se distribuye;
 * lo que se entrega es un stub, y su contrato es CÓMO falla.
 *
 * El consumidor (`repl/src/deepLink/protocolHandler.ts`,
 * `handleUrlSchemeLaunch`) distingue dos desenlaces: `null`, «no llegó URL en
 * la ventana», y el rechazo, «el módulo no está». Por eso el stub rechaza en
 * vez de resolver `null`: colapsarlos escondería el día en que el módulo
 * falte por otra razón.
 *
 * Medido con `bin/binary` sobre 2.1.283 (banco
 * `napi-contracts-20260927T073211`): la build de Linux no tiene
 * `waitForUrlEvent`; lo que conserva del manejador es su REGISTRO
 * (`chunk-b6231k7z.js`, con `com.anthropic.claude-code-url-handler` y el
 * `.desktop`), que es otro paquete. No hay conducta de referencia que
 * comparar en esta plataforma.
 *
 * Control de anulación, medido: si el stub resolviera `null` caen 3 y 4 —el
 * 2 sigue en pie, porque sigue siendo una promesa—; si lanzara de forma
 * síncrona caen 2, 3 y 4.
 */
import { describe, expect, test } from 'bun:test'
import * as handler from '../src/index.ts'

describe('url-handler-napi', () => {
  test('1. exporta sólo waitForUrlEvent', () => {
    expect(Object.keys(handler)).toEqual(['waitForUrlEvent'])
  })

  test('2. devuelve una promesa, no lanza de forma síncrona', () => {
    let pending: Promise<string | null> | undefined
    expect(() => { pending = handler.waitForUrlEvent(10) }).not.toThrow()
    expect(pending).toBeInstanceOf(Promise)
    return pending!.catch(() => undefined)
  })

  test('3. rechaza nombrando el módulo, con y sin plazo', async () => {
    await expect(handler.waitForUrlEvent(5000)).rejects.toThrow('url-handler-napi: native module not built')
    await expect(handler.waitForUrlEvent()).rejects.toThrow('url-handler-napi: native module not built')
  })

  test('4. nunca resuelve null: el rechazo no se confunde con «sin URL»', async () => {
    const outcome = await handler.waitForUrlEvent(0).then(value => ({ value }), () => 'rechazo')
    expect(outcome).toBe('rechazo')
  })
})
