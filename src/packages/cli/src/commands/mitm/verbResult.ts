/**
 * Lo común a los verbos de `thyrox mitm`: un argumento que no alcanza es un
 * error de uso (exit 2, sin tocar la API); una respuesta se imprime como JSON
 * si es un éxito, o como su mensaje (exit 1) si la API la rechazó.
 */
import { EXIT_OK, EXIT_USAGE } from '../../exitCodes.ts'
import type { ApiRequest, MitmApiCall } from './inProcessApi.ts'

const EXIT_REFUSED = 1

export interface UsageError {
  usage: string
}

export function usage(text: string): UsageError {
  return { usage: text }
}

export function isUsageError(value: object): value is UsageError {
  return 'usage' in value
}

export function reportUsage(verb: string | undefined, error: UsageError, write: (text: string) => void): number {
  write(`thyrox mitm ${verb ?? ''}: ${error.usage}\n`)
  return EXIT_USAGE
}

export async function callAndPrint(
  verb: string | undefined,
  request: ApiRequest,
  api: MitmApiCall,
  write: (text: string) => void,
): Promise<number> {
  const response = await api(request)
  const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
  if (!response.ok) {
    write(`thyrox mitm ${verb}: ${body?.error?.message ?? `HTTP ${response.status}`}\n`)
    return EXIT_REFUSED
  }
  write(`${JSON.stringify(body, null, 2)}\n`)
  return EXIT_OK
}
