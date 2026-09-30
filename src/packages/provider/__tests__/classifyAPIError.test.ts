/**
 * `classifyAPIError` — la categoría de un error de API para la telemetría.
 *
 * Reimplementación desde el binario 2.1.275 (`HQ` en `chunk-q2gh92k2.js`),
 * con errores REALES del SDK: el clasificador decide por clase y por status
 * antes que por texto, y un doble que imitara la clase mediría otra cosa.
 */
import { describe, expect, test } from 'bun:test'
import { APIConnectionError, APIConnectionTimeoutError, APIError } from '@anthropic-ai/sdk'
import {
  CREDIT_BALANCE_TOO_LOW_ERROR_MESSAGE,
  PROMPT_TOO_LONG_ERROR_MESSAGE,
  REPEATED_529_ERROR_MESSAGE,
  classifyAPIError,
} from '../src/errors.ts'

const api = (status: number, message: string) =>
  APIError.generate(status, { error: { message } }, message, new Headers())

describe('classifyAPIError', () => {
  test('abortada por el usuario', () => {
    expect(classifyAPIError(new Error('Request was aborted.'))).toBe('aborted')
  })
  test('timeout del SDK y conexión con timeout', () => {
    expect(classifyAPIError(new APIConnectionTimeoutError())).toBe('api_timeout')
    expect(classifyAPIError(new APIConnectionError({ message: 'socket timeout' }))).toBe('api_timeout')
  })
  test('stream inactivo', () => {
    expect(classifyAPIError(new Error('Stream idle timeout after 90s'))).toBe('stream_idle_timeout')
  })
  test('529 repetido va antes que la sobrecarga', () => {
    expect(classifyAPIError(new Error(REPEATED_529_ERROR_MESSAGE))).toBe('repeated_529')
    expect(classifyAPIError(api(529, 'overloaded_error'))).toBe('server_overload')
  })
  test('interruptor de capacidad', () => {
    expect(classifyAPIError(new Error('Opus is experiencing high load, please use /model to switch to Sonnet'))).toBe('capacity_off_switch')
  })
  test('429 es límite de tasa', () => {
    expect(classifyAPIError(api(429, 'too many'))).toBe('rate_limit')
  })
  test('prompt demasiado largo, por texto', () => {
    expect(classifyAPIError(api(400, `${PROMPT_TOO_LONG_ERROR_MESSAGE}: 210000 tokens > 200000`))).toBe('prompt_too_long')
  })
  test('413 sin marca de prompt es petición demasiado grande', () => {
    expect(classifyAPIError(api(413, 'payload'))).toBe('request_too_large')
  })
  test('medios: PDF, imagen', () => {
    expect(classifyAPIError(new Error('A maximum of 100 PDF pages may be provided'))).toBe('pdf_too_large')
    expect(classifyAPIError(new Error('The PDF specified is password protected'))).toBe('pdf_password_protected')
    expect(classifyAPIError(api(400, 'image exceeds 5 MB maximum'))).toBe('image_too_large')
    expect(classifyAPIError(api(400, 'Could not process image'))).toBe('image_unprocessable')
  })
  test('esquema de herramienta y pares tool_use/tool_result', () => {
    expect(classifyAPIError(api(400, 'tools.3.input_schema: invalid'))).toBe('tool_schema_invalid')
    expect(classifyAPIError(api(400, '`tool_use` ids were found without `tool_result` blocks immediately after'))).toBe('tool_use_mismatch')
    expect(classifyAPIError(api(400, 'unexpected `tool_use_id` found in `tool_result`'))).toBe('unexpected_tool_result')
    expect(classifyAPIError(api(400, '`tool_use` ids must be unique'))).toBe('duplicate_tool_use_id')
  })
  test('modelo inválido o no encontrado', () => {
    expect(classifyAPIError(api(400, 'invalid model name'))).toBe('invalid_model')
    expect(classifyAPIError(api(404, 'not_found_error "model: claude-x"'))).toBe('model_not_found')
  })
  test('crédito, clave, token, organización', () => {
    expect(classifyAPIError(new Error(CREDIT_BALANCE_TOO_LOW_ERROR_MESSAGE))).toBe('credit_balance_low')
    expect(classifyAPIError(new Error('invalid x-api-key'))).toBe('invalid_api_key')
    expect(classifyAPIError(api(401, 'OAuth authentication is currently not allowed for this organization'))).toBe('oauth_org_not_allowed')
    expect(classifyAPIError(api(403, 'forbidden'))).toBe('auth_error')
    expect(classifyAPIError(new Error('This organization has been disabled'))).toBe('org_disabled')
  })
  test('lo que queda: 5xx, 4xx, conexión, desconocido', () => {
    expect(classifyAPIError(api(500, 'boom'))).toBe('server_error')
    expect(classifyAPIError(api(418, 'teapot'))).toBe('client_error')
    expect(classifyAPIError(new APIConnectionError({ message: 'socket hang up' }))).toBe('connection_error')
    expect(classifyAPIError('no es un error')).toBe('unknown')
  })
})
