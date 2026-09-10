/**
 * Constantes y predicados de error del provider — porte de
 * `ccnmt: packages/provider/src/errors.ts`, con su suite
 * `src/__tests__/errorMessageConstants.behavior.test.ts` como CONTRATO.
 *
 * MITAD ROJA. `src/packages/provider/src/errors.ts` no existe en este árbol:
 * medido, **0 de sus 40 exports** están, y `HostBindingsError` se declara
 * INLINE dos veces —`host.ts:25` y `claudeLegacy.ts:111`— precisamente porque
 * no hay dónde importarlo. Dos declaraciones de la misma clase no son la misma
 * clase: un `catch (e instanceof HostBindingsError)` sobre una no atrapa la de
 * la otra, y el fallo es silencioso.
 *
 * Los 20 casos son los de la referencia, no inventados: pinchan las cadenas
 * EXACTAS que su UI empareja para enrutar cada error a su afordancia (enlace
 * de /login, hint de /model, CTA de créditos). Una deriva de cadena rompe el
 * enrutado: la UI ve un error genérico y pierde la acción.
 *
 * Licencia: `ccnmt` declara UNLICENSED. Las CADENAS son el contrato —el valor
 * que la UI empareja— y por eso se conservan idénticas; el cuerpo del módulo
 * se reimplementa (`porte-completo-no-parcial.md`).
 *
 * CONTROL DE ANULACIÓN, medido: cambiando `startsWith` por `includes` en
 * `isPromptTooLongMessage` cae **1 de 18** — el caso «contiene pero NO empieza
 * con el prefijo». Es el que la referencia escribió con esa razón literal: si
 * un refactor cambia a `includes`, una respuesta del modelo que mencione la
 * frase dispararía la auto-compactación. Los otros 17 no dependen de eso, y
 * por eso ése es el que mide la guarda.
 */

import { describe, expect, test } from 'bun:test'
import {
  API_ERROR_MESSAGE_PREFIX,
  API_TIMEOUT_ERROR_MESSAGE,
  CCR_AUTH_ERROR_MESSAGE,
  CREDIT_BALANCE_TOO_LOW_ERROR_MESSAGE,
  CUSTOM_OFF_SWITCH_MESSAGE,
  INVALID_API_KEY_ERROR_MESSAGE,
  INVALID_API_KEY_ERROR_MESSAGE_EXTERNAL,
  OAUTH_ORG_NOT_ALLOWED_ERROR_MESSAGE,
  ORG_DISABLED_ERROR_MESSAGE_ENV_KEY,
  ORG_DISABLED_ERROR_MESSAGE_ENV_KEY_WITH_OAUTH,
  PROMPT_TOO_LONG_ERROR_MESSAGE,
  REPEATED_529_ERROR_MESSAGE,
  TOKEN_REVOKED_ERROR_MESSAGE,
  isPromptTooLongMessage,
  startsWithApiErrorPrefix,
} from '../src/errors.ts'

describe('Constantes de error de cara al usuario', () => {
  test('API_ERROR_MESSAGE_PREFIX es «API Error» pelado', () => {
    expect(API_ERROR_MESSAGE_PREFIX).toBe('API Error')
    expect(startsWithApiErrorPrefix('API Error: 500')).toBe(true)
    expect(startsWithApiErrorPrefix('Error: 500')).toBe(false)
  })

  test('PROMPT_TOO_LONG_ERROR_MESSAGE es literal del servidor', () => {
    expect(PROMPT_TOO_LONG_ERROR_MESSAGE).toBe('Prompt is too long')
  })

  test('CREDIT_BALANCE_TOO_LOW: dispara el enlace de compra de créditos', () => {
    expect(CREDIT_BALANCE_TOO_LOW_ERROR_MESSAGE).toBe('Credit balance is too low')
  })

  test('INVALID_API_KEY_ERROR_MESSAGE: lleva la llamada a /login', () => {
    expect(INVALID_API_KEY_ERROR_MESSAGE).toBe('Not logged in · Please run /login')
  })

  test('INVALID_API_KEY_ERROR_MESSAGE_EXTERNAL: otra llamada para clave de entorno', () => {
    expect(INVALID_API_KEY_ERROR_MESSAGE_EXTERNAL).toBe('Invalid API key · Fix external API key')
  })

  test('ORG_DISABLED con OAuth: hint doble cuando hay suscripción a la que caer', () => {
    expect(ORG_DISABLED_ERROR_MESSAGE_ENV_KEY_WITH_OAUTH).toContain(
      'Unset the environment variable to use your subscription instead')
  })

  test('ORG_DISABLED sin OAuth: hint pelado', () => {
    expect(ORG_DISABLED_ERROR_MESSAGE_ENV_KEY).toContain('Update or unset the environment variable')
  })

  test('TOKEN_REVOKED_ERROR_MESSAGE: /login por revocación de token OAuth', () => {
    expect(TOKEN_REVOKED_ERROR_MESSAGE).toBe('OAuth token revoked · Please run /login')
  })

  test('CCR_AUTH_ERROR_MESSAGE: dice «temporal», NO dice /login', () => {
    // En una sesión remota el usuario no puede hacer /login: las credenciales
    // las inyecta el host. Mostrarle ese botón sería mandarlo a un callejón.
    expect(CCR_AUTH_ERROR_MESSAGE).toContain('temporary network issue')
    expect(CCR_AUTH_ERROR_MESSAGE).not.toContain('/login')
  })

  test('REPEATED_529_ERROR_MESSAGE: fijado para el mensaje de rendición', () => {
    expect(REPEATED_529_ERROR_MESSAGE).toBe('Repeated 529 Overloaded errors')
  })

  test('CUSTOM_OFF_SWITCH_MESSAGE: hint de cambio de modelo por /model', () => {
    expect(CUSTOM_OFF_SWITCH_MESSAGE).toContain('use /model to switch to Sonnet')
  })

  test('API_TIMEOUT_ERROR_MESSAGE: «Request timed out» pelado', () => {
    expect(API_TIMEOUT_ERROR_MESSAGE).toBe('Request timed out')
  })

  test('OAUTH_ORG_NOT_ALLOWED_ERROR_MESSAGE: CTA de política de organización', () => {
    expect(OAUTH_ORG_NOT_ALLOWED_ERROR_MESSAGE).toContain('Please run /login')
  })

  test('todas usan el punto medio « · » como separador, no guion ni dos puntos', () => {
    expect(INVALID_API_KEY_ERROR_MESSAGE).toContain(' · ')
    expect(TOKEN_REVOKED_ERROR_MESSAGE).toContain(' · ')
    expect(CCR_AUTH_ERROR_MESSAGE).toContain(' · ')
    expect(INVALID_API_KEY_ERROR_MESSAGE_EXTERNAL).toContain(' · ')
  })

  describe('isPromptTooLongMessage', () => {
    const mensaje = (text: string, esError?: boolean) => ({
      type: 'assistant' as const,
      ...(esError === undefined ? {} : { isApiErrorMessage: esError }),
      message: { content: [{ type: 'text' as const, text }] },
    }) as never

    test('cierto SÓLO con isApiErrorMessage Y el texto empezando por el prefijo', () => {
      expect(isPromptTooLongMessage(
        mensaje('Prompt is too long: 137500 tokens > 200000', true))).toBe(true)
    })

    test('falso sin isApiErrorMessage: es un mensaje normal del asistente', () => {
      expect(isPromptTooLongMessage(mensaje('Prompt is too long'))).toBe(false)
    })

    test('falso si CONTIENE el prefijo pero no EMPIEZA por él', () => {
      // La razón, verbatim de la referencia: si un refactor cambiara
      // `startsWith` por `includes`, una respuesta del modelo que mencione la
      // frase dispararía la auto-compactación.
      expect(isPromptTooLongMessage(
        mensaje('API Error: Prompt is too long', true))).toBe(false)
    })

    test('falso para errores de API ajenos', () => {
      expect(isPromptTooLongMessage(
        mensaje('API Error: 500 — Server error', true))).toBe(false)
    })
  })
})
