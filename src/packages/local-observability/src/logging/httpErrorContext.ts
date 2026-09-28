/**
 * El contexto de un error HTTP que vale guardar junto a él: URL, estado y el
 * mensaje que el servidor devolvió. Un error que no es de axios no lleva
 * contexto. Lo comparten el registro de texto y la base de errores.
 */
import axios from 'axios'

export type HttpErrorContext = { url?: string; status?: number; body?: string }

function serverMessage(data: unknown): string | undefined {
  if (typeof data === 'string') return data
  if (!data || typeof data !== 'object') return undefined
  const body = data as Record<string, unknown>
  if (typeof body.message === 'string') return body.message
  const nested = body.error
  if (nested && typeof nested === 'object' && typeof (nested as Record<string, unknown>).message === 'string') {
    return (nested as Record<string, unknown>).message as string
  }
  return undefined
}

export function httpErrorContext(error: unknown): HttpErrorContext {
  if (!axios.isAxiosError(error) || !error.config?.url) return {}
  const context: HttpErrorContext = { url: error.config.url }
  if (error.response?.status !== undefined) context.status = error.response.status
  const body = serverMessage(error.response?.data)
  if (body) context.body = body
  return context
}
