/**
 * Las respuestas de la API local del MITM: el cuerpo de error de la
 * referencia, con el mensaje siempre saneado, y la lectura de un cuerpo JSON.
 *
 * Porte de `omniroute: src/lib/api/errorResponse.ts` (MIT).
 */
import { randomUUID } from 'node:crypto'

import { sanitizeErrorMessage } from '@thyrox/provider/sanitize/errorSanitization'
import { z } from 'zod'

export type ApiErrorType = 'invalid_request' | 'not_found' | 'conflict' | 'server_error'

export interface ApiErrorPayload {
  status: number
  message: string
  type?: ApiErrorType
  details?: unknown
  headers?: HeadersInit
}

function typeForStatus(status: number): ApiErrorType {
  if (status >= 500) return 'server_error'
  if (status === 404) return 'not_found'
  if (status === 409) return 'conflict'
  return 'invalid_request'
}

export function errorResponse(payload: ApiErrorPayload): Response {
  return Response.json(
    {
      error: { message: payload.message, type: payload.type ?? typeForStatus(payload.status), details: payload.details },
      requestId: randomUUID(),
    },
    { status: payload.status, headers: payload.headers },
  )
}

/** Un error inesperado de una ruta: 500 y nunca su mensaje crudo. */
export function errorFromUnknown(err: unknown): Response {
  const raw = err instanceof Error ? err.message : String(err)
  return errorResponse({ status: 500, message: sanitizeErrorMessage(raw) })
}

export type JsonBody = { ok: true; body: unknown } | { ok: false; response: Response }

/** El cuerpo como JSON; uno malformado es un 400 listo para devolver. */
export async function readJsonBody(request: Request): Promise<JsonBody> {
  try {
    return { ok: true, body: await request.json() }
  } catch {
    return { ok: false, response: errorResponse({ status: 400, message: 'Invalid JSON body' }) }
  }
}

export type ParsedBody<T> = { ok: true; data: T } | { ok: false; response: Response }

/**
 * El cuerpo leído como JSON y validado con `schema`: malformado es «Invalid
 * JSON body», y uno que no pasa el esquema es «Invalid request body» con sus
 * errores por campo en `details`.
 */
export async function parseJsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<ParsedBody<T>> {
  const read = await readJsonBody(request)
  if (!read.ok) return read
  const parsed = schema.safeParse(read.body)
  if (parsed.success) return { ok: true, data: parsed.data }
  return {
    ok: false,
    response: errorResponse({
      status: 400,
      message: 'Invalid request body',
      details: z.flattenError(parsed.error),
    }),
  }
}
